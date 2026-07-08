import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
  estimateGeminiFlashCostUsd,
  parseGeminiTokenUsage,
  roundUsd,
  type GeminiTokenUsage,
} from '@/lib/gemini-usage';

const TABLE = 'tabata_ai_usage_logs';
const MODEL = 'gemini-2.5-flash-lite';
const RECENT_LIMIT = 30;
const SUMMARY_DAYS = 28;

export type AiUsageLogRow = {
  id: string;
  createdAt: string;
  model: string;
  contentLanguage: string | null;
  promptLength: number;
  routineId: string | null;
  routineTitle: string | null;
  exerciseCount: number | null;
  promptTokenCount: number;
  candidatesTokenCount: number;
  thoughtsTokenCount: number;
  totalTokenCount: number;
  estimatedInputUsd: number;
  estimatedOutputUsd: number;
  estimatedTotalUsd: number;
};

export type AiUsagePeriodSummary = {
  requestCount: number;
  promptTokenCount: number;
  outputTokenCount: number;
  totalTokenCount: number;
  estimatedInputUsd: number;
  estimatedOutputUsd: number;
  estimatedTotalUsd: number;
};

export type AiUsageDashboardData = {
  configured: boolean;
  model: typeof MODEL;
  pricingNote: string;
  today: AiUsagePeriodSummary;
  last28Days: AiUsagePeriodSummary;
  recent: AiUsageLogRow[];
};

type DbRow = {
  id: string;
  created_at: string;
  model: string;
  content_language: string | null;
  prompt_length: number;
  routine_id: string | null;
  routine_title: string | null;
  exercise_count: number | null;
  prompt_token_count: number;
  candidates_token_count: number;
  thoughts_token_count: number;
  total_token_count: number;
  estimated_input_usd: number | string;
  estimated_output_usd: number | string;
  estimated_total_usd: number | string;
};

function emptySummary(): AiUsagePeriodSummary {
  return {
    requestCount: 0,
    promptTokenCount: 0,
    outputTokenCount: 0,
    totalTokenCount: 0,
    estimatedInputUsd: 0,
    estimatedOutputUsd: 0,
    estimatedTotalUsd: 0,
  };
}

function toNumber(value: number | string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapRow(row: DbRow): AiUsageLogRow {
  return {
    id: row.id,
    createdAt: row.created_at,
    model: row.model,
    contentLanguage: row.content_language,
    promptLength: row.prompt_length,
    routineId: row.routine_id,
    routineTitle: row.routine_title,
    exerciseCount: row.exercise_count,
    promptTokenCount: row.prompt_token_count,
    candidatesTokenCount: row.candidates_token_count,
    thoughtsTokenCount: row.thoughts_token_count,
    totalTokenCount: row.total_token_count,
    estimatedInputUsd: toNumber(row.estimated_input_usd),
    estimatedOutputUsd: toNumber(row.estimated_output_usd),
    estimatedTotalUsd: toNumber(row.estimated_total_usd),
  };
}

function summarizeRows(rows: AiUsageLogRow[]): AiUsagePeriodSummary {
  return rows.reduce((acc, row) => {
    acc.requestCount += 1;
    acc.promptTokenCount += row.promptTokenCount;
    acc.outputTokenCount += row.candidatesTokenCount + row.thoughtsTokenCount;
    acc.totalTokenCount += row.totalTokenCount;
    acc.estimatedInputUsd += row.estimatedInputUsd;
    acc.estimatedOutputUsd += row.estimatedOutputUsd;
    acc.estimatedTotalUsd += row.estimatedTotalUsd;
    return acc;
  }, emptySummary());
}

function roundSummary(summary: AiUsagePeriodSummary): AiUsagePeriodSummary {
  return {
    ...summary,
    estimatedInputUsd: roundUsd(summary.estimatedInputUsd),
    estimatedOutputUsd: roundUsd(summary.estimatedOutputUsd),
    estimatedTotalUsd: roundUsd(summary.estimatedTotalUsd),
  };
}

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function daysAgoUtc(days: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

export async function recordAiRoutineUsage(input: {
  contentLanguage: string;
  promptLength: number;
  routineId: string;
  routineTitle: string;
  exerciseCount: number;
  usage?: Record<string, unknown>;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.warn('[ai-usage] Supabase not configured; usage not persisted');
    return;
  }

  const tokenUsage: GeminiTokenUsage = parseGeminiTokenUsage(input.usage) ?? {
    promptTokenCount: 0,
    candidatesTokenCount: 0,
    thoughtsTokenCount: 0,
    totalTokenCount: 0,
  };
  const cost = estimateGeminiFlashCostUsd(tokenUsage);

  const { error } = await supabase.from(TABLE).insert({
    model: MODEL,
    content_language: input.contentLanguage,
    prompt_length: input.promptLength,
    routine_id: input.routineId,
    routine_title: input.routineTitle,
    exercise_count: input.exerciseCount,
    prompt_token_count: tokenUsage.promptTokenCount,
    candidates_token_count: tokenUsage.candidatesTokenCount,
    thoughts_token_count: tokenUsage.thoughtsTokenCount,
    total_token_count: tokenUsage.totalTokenCount,
    estimated_input_usd: roundUsd(cost.inputUsd),
    estimated_output_usd: roundUsd(cost.outputUsd),
    estimated_total_usd: roundUsd(cost.totalUsd),
  });

  if (error) {
    console.error('[ai-usage] failed to persist usage', error);
  }
}

export async function getAiUsageDashboardData(): Promise<AiUsageDashboardData> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return {
      configured: false,
      model: MODEL,
      pricingNote:
        '무료 티어는 $0입니다. 예상 비용은 Gemini 2.5 Flash 유료 standard 기준입니다.',
      today: emptySummary(),
      last28Days: emptySummary(),
      recent: [],
    };
  }

  const since28Days = daysAgoUtc(SUMMARY_DAYS).toISOString();
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .gte('created_at', since28Days)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    console.error('[ai-usage] failed to load dashboard data', error);
    throw new Error('Failed to load AI usage data');
  }

  const rows = ((data ?? []) as DbRow[]).map(mapRow);
  const todayStart = startOfTodayUtc().toISOString();
  const todayRows = rows.filter((row) => row.createdAt >= todayStart);

  return {
    configured: true,
    model: MODEL,
    pricingNote:
      '무료 티어는 $0입니다. 예상 비용은 Gemini 2.5 Flash 유료 standard 기준입니다.',
    today: roundSummary(summarizeRows(todayRows)),
    last28Days: roundSummary(summarizeRows(rows)),
    recent: rows.slice(0, RECENT_LIMIT),
  };
}
