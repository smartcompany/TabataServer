import { randomUUID } from 'crypto';

import {
  getChatCompletionText,
  isYouTubeUrl,
  type AIChatMessage,
} from 'nextjs-share-lib/ai';
import { z } from 'zod';

import { geminiAi } from '@/lib/ai-client';
import { recordAiRoutineUsage } from '@/lib/ai-usage-store';
import {
  estimateGeminiFlashCostUsd,
  parseGeminiTokenUsage,
  roundUsd,
} from '@/lib/gemini-usage';
import {
  type DescriptionBlock,
} from '@/lib/description-blocks';
import {
  parseRoutineProfile,
  type RoutineProfile,
} from '@/lib/profile-schema';
import {
  loadPromptJson,
  renderPromptTemplate,
} from '@/lib/prompt-loader';
import {
  buildYouTubePromptContext,
} from '@/lib/youtube-metadata';

const SYSTEM_PROMPT_FILE = 'ai-routine-system.txt';
const USER_PROMPT_FILE = 'ai-routine-user.txt';
const EXAMPLE_JSON_FILE = 'ai-routine-example.json';

const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;

function extractYouTubeUrls(text: string): string[] {
  const matches = text.match(URL_PATTERN) ?? [];
  return [
    ...new Set(
      matches
        .map((url) => url.replace(/[)\]},.!?]+$/, '').trim())
        .filter(isYouTubeUrl),
    ),
  ];
}

function resolveContentLanguage(
  value: string | undefined,
): NonNullable<RoutineProfile['contentLanguage']> {
  const lang = value?.trim() || 'ko';
  return ['en', 'ko', 'zh', 'ja'].includes(lang)
    ? (lang as NonNullable<RoutineProfile['contentLanguage']>)
    : 'ko';
}

function buildSystemInstruction(outputLanguage: string): string {
  return renderPromptTemplate(SYSTEM_PROMPT_FILE, {
    OUTPUT_LANGUAGE: outputLanguage,
    EXAMPLE_JSON: loadPromptJson(EXAMPLE_JSON_FILE),
  });
}

function buildUserMessage(userPrompt: string, youtubeContext: string): string {
  return renderPromptTemplate(USER_PROMPT_FILE, {
    USER_PROMPT: userPrompt,
    YOUTUBE_CONTEXT: youtubeContext,
  });
}

function toInt(value: unknown, fallback: number, min: number): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value.trim())
        : Number.NaN;
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.round(parsed));
}

function toOptionalInt(
  value: unknown,
  min: number,
): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value.trim())
        : Number.NaN;
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return Math.max(min, Math.round(parsed));
}

function normalizePhaseKind(value: unknown): 'work' | 'relax' {
  const kind = String(value ?? 'work').trim().toLowerCase();
  if (kind === 'relax' || kind === 'rest') {
    return 'relax';
  }
  return 'work';
}

function normalizeTimingMode(value: unknown): 'duration' | 'count' | undefined {
  const mode = String(value ?? '').trim().toLowerCase();
  if (mode === 'count') {
    return 'count';
  }
  if (mode === 'duration') {
    return 'duration';
  }
  return undefined;
}

function normalizeCountOrder(value: unknown): 'ascending' | 'descending' | undefined {
  const order = String(value ?? '').trim().toLowerCase();
  if (order === 'descending') {
    return 'descending';
  }
  if (order === 'ascending') {
    return 'ascending';
  }
  return undefined;
}

function sanitizePhase(
  phase: Record<string, unknown>,
  phaseIndex: number,
): Record<string, unknown> {
  const {
    id: _id,
    timingMode,
    countReps,
    secondsPerRep,
    countOrder,
    ...rest
  } = phase;
  const normalizedTimingMode = normalizeTimingMode(timingMode);
  const normalized: Record<string, unknown> = {
    ...rest,
    id: 'pending',
    kind: normalizePhaseKind(phase.kind),
    label: String(phase.label ?? `Phase ${phaseIndex + 1}`).trim() || `Phase ${phaseIndex + 1}`,
    durationSec: toInt(phase.durationSec, 20, 1),
    order: toInt(phase.order, phaseIndex, 0),
  };

  if (normalizedTimingMode === 'count') {
    normalized.timingMode = 'count';
    normalized.countReps = toOptionalInt(countReps, 1) ?? 8;
    normalized.secondsPerRep = toOptionalInt(secondsPerRep, 1) ?? 5;
    const normalizedOrder = normalizeCountOrder(countOrder);
    if (normalizedOrder === 'descending') {
      normalized.countOrder = 'descending';
    }
  }

  return normalized;
}

function sanitizeExercise(
  exercise: Record<string, unknown>,
  exerciseIndex: number,
): Record<string, unknown> {
  const {
    id: _id,
    instructionBlocks: _instructionBlocks,
    prepare,
    phases,
    ...rest
  } = exercise;

  if (!Array.isArray(phases) || phases.length === 0) {
    throw new Error('Exercise missing phases in model response');
  }

  const prepareRecord =
    prepare && typeof prepare === 'object'
      ? (prepare as Record<string, unknown>)
      : {};

  return {
    ...rest,
    id: 'pending',
    name:
      String(exercise.name ?? `Exercise ${exerciseIndex + 1}`).trim() ||
      `Exercise ${exerciseIndex + 1}`,
    instruction: String(exercise.instruction ?? ''),
    order: toInt(exercise.order, exerciseIndex, 0),
    prepare: {
      durationSec: toInt(prepareRecord.durationSec, 10, 0),
    },
    reps: toInt(exercise.reps, 8, 1),
    sets: toInt(exercise.sets, 1, 1),
    phases: phases.map((phase, phaseIndex) => {
      if (!phase || typeof phase !== 'object') {
        throw new Error('Invalid phase entry in model response');
      }
      return sanitizePhase(phase as Record<string, unknown>, phaseIndex);
    }),
  };
}

function prepareAiRoutineForParse(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Model response is not a JSON object');
  }

  const source = raw as Record<string, unknown>;
  const {
    contentLanguage: _contentLanguage,
    id: _id,
    descriptionBlocks: _descriptionBlocks,
    ...rest
  } = source;

  if (!Array.isArray(source.exercises) || source.exercises.length === 0) {
    throw new Error('Model response missing exercises');
  }

  return {
    ...rest,
    schemaVersion: 1,
    id: 'pending',
    title:
      String(source.title ?? 'AI Routine').trim() || 'AI Routine',
    description: String(source.description ?? ''),
    exercises: source.exercises.map((exercise, exerciseIndex) => {
      if (!exercise || typeof exercise !== 'object') {
        throw new Error('Invalid exercise entry in model response');
      }
      return sanitizeExercise(
        exercise as Record<string, unknown>,
        exerciseIndex,
      );
    }),
  };
}

function assignFreshIds(profile: RoutineProfile): RoutineProfile {
  const routineId = `ai-${randomUUID().replace(/-/g, '').slice(0, 16)}`;
  return {
    ...profile,
    schemaVersion: 1,
    id: routineId,
    exercises: profile.exercises.map((exercise, exerciseIndex) => ({
      ...exercise,
      id: randomUUID(),
      order: exerciseIndex,
      phases: exercise.phases.map((phase, phaseIndex) => ({
        ...phase,
        id: randomUUID(),
        order: phaseIndex,
      })),
    })),
  };
}

function attachPromptVideoLinks(
  profile: RoutineProfile,
  videoUrls: string[],
): RoutineProfile {
  if (videoUrls.length === 0) {
    return profile;
  }

  const existingBlocks = profile.descriptionBlocks ?? [];
  const existingVideoUrls = new Set(
    existingBlocks
      .filter((block) => block.type === 'video')
      .map((block) => block.url),
  );

  const newVideoBlocks: DescriptionBlock[] = videoUrls
    .filter((url) => !existingVideoUrls.has(url))
    .map((url) => ({
      type: 'video',
      url,
      provider: 'youtube',
    }));

  if (newVideoBlocks.length === 0) {
    return profile;
  }

  let blocks: DescriptionBlock[] = [...existingBlocks];
  const plainDescription = profile.description.trim();
  const hasTextBlock = blocks.some((block) => block.type === 'text');

  if (!hasTextBlock && plainDescription.length > 0) {
    blocks = [{ type: 'text', text: plainDescription }, ...blocks];
  }

  blocks = [...blocks, ...newVideoBlocks];

  return parseRoutineProfile({
    ...profile,
    description: plainDescription,
    descriptionBlocks: blocks,
  });
}

function parseJsonFromModelText(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch?.[1]) {
      return JSON.parse(fenceMatch[1].trim());
    }
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error('Model response is not valid JSON');
  }
}

function logAiRoutinePromptRequest(input: {
  contentLanguage: string;
  rawUserPrompt: string;
  youtubeUrls: string[];
  systemPrompt: string;
  userPrompt: string;
}): void {
  console.info('[ai-routine] Gemini request', {
    provider: 'gemini',
    preset: 'long_output_lite',
    model: 'gemini-2.5-flash-lite',
    responseFormat: 'json_object',
    contentLanguage: input.contentLanguage,
    rawUserPromptLength: input.rawUserPrompt.length,
    rawUserPrompt: input.rawUserPrompt,
    youtubeUrls: input.youtubeUrls,
    systemPromptLength: input.systemPrompt.length,
    systemPrompt: input.systemPrompt,
    userPromptLength: input.userPrompt.length,
    userPrompt: input.userPrompt,
  });
}

function logAiRoutinePromptResponse(input: {
  modelText: string;
  profile: RoutineProfile;
  usage?: Record<string, unknown>;
}): void {
  const tokenUsage = parseGeminiTokenUsage(input.usage);
  const estimatedCostUsd = tokenUsage
    ? estimateGeminiFlashCostUsd(tokenUsage)
    : undefined;

  console.info('[ai-routine] Gemini response', {
    modelTextLength: input.modelText.length,
    routineId: input.profile.id,
    title: input.profile.title,
    exerciseCount: input.profile.exercises.length,
    ...(tokenUsage
      ? {
          tokenUsage,
          estimatedCostUsd: estimatedCostUsd
            ? {
                inputUsd: roundUsd(estimatedCostUsd.inputUsd),
                outputUsd: roundUsd(estimatedCostUsd.outputUsd),
                totalUsd: roundUsd(estimatedCostUsd.totalUsd),
                pricingModel: estimatedCostUsd.pricingModel,
                pricingTier: estimatedCostUsd.pricingTier,
                note: estimatedCostUsd.note,
              }
            : undefined,
        }
      : {}),
    modelText: input.modelText,
  });
}

export async function generateRoutineFromPrompt(input: {
  prompt: string;
  contentLanguage?: string;
}): Promise<RoutineProfile> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const prompt = input.prompt.trim();
  if (prompt.length < 1) {
    throw new Error('Prompt is too short');
  }
  if (prompt.length > 4000) {
    throw new Error('Prompt is too long');
  }

  const contentLanguage = resolveContentLanguage(input.contentLanguage);
  const youtubeUrls = extractYouTubeUrls(prompt);
  const systemInstruction = buildSystemInstruction(contentLanguage);
  const youtubeContext = await buildYouTubePromptContext(youtubeUrls);
  const userMessageText = buildUserMessage(prompt, youtubeContext);

  const messages: AIChatMessage[] = [
    {
      role: 'system',
      content: systemInstruction,
    },
    {
      role: 'user',
      content: userMessageText,
    },
  ];

  logAiRoutinePromptRequest({
    contentLanguage,
    rawUserPrompt: prompt,
    youtubeUrls,
    systemPrompt: systemInstruction,
    userPrompt: userMessageText,
  });

  const response = await geminiAi.createChatCompletion({
    preset: 'long_output_lite',
    model: 'gemini-2.5-flash-lite',
    response_format: { type: 'json_object' },
    messages,
  });

  const modelText = getChatCompletionText(response);
  if (!modelText) {
    throw new Error('Empty response from Gemini');
  }

  const parsed = parseJsonFromModelText(modelText);
  let profile: RoutineProfile;
  try {
    profile = parseRoutineProfile(prepareAiRoutineForParse(parsed));
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[ai-routine] profile validation failed', {
        issues: error.issues,
        modelText,
      });
    }
    throw error;
  }
  const result = attachPromptVideoLinks(
    assignFreshIds({
      ...profile,
      contentLanguage,
    }),
    youtubeUrls,
  );

  logAiRoutinePromptResponse({
    modelText,
    profile: result,
    usage: response.usage,
  });

  await recordAiRoutineUsage({
    contentLanguage,
    promptLength: prompt.length,
    routineId: result.id,
    routineTitle: result.title,
    exerciseCount: result.exercises.length,
    usage: response.usage,
  });

  return result;
}
