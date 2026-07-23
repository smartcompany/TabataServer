import { getSupabaseAdmin } from '@/lib/supabase-admin';

const TABLE = 'tabata_product_events';
/** Supabase default max rows per request; page until the period is fully loaded. */
const PAGE_SIZE = 1000;
/** Safety cap so a runaway table cannot hang the dashboard. */
const MAX_ROWS = 100_000;

export const PRODUCT_EVENT_NAMES = [
  'first_open',
  'app_open',
  'onboarding_viewed',
  'onboarding_path_selected',
  'onboarding_complete',
  'routine_create_started',
  'routine_created',
  'routine_edited',
  'routine_deleted',
  'routine_catalog_opened',
  'routine_download_started',
  'routine_download_succeeded',
  'routine_download_failed',
  'login_started',
  'login_succeeded',
  'login_cancelled',
  'login_failed',
  'routine_upload_started',
  'routine_upload_succeeded',
  'routine_upload_failed',
  'routine_share_tapped',
  'routine_share_succeeded',
  'routine_share_failed',
  'shared_link_opened',
  'shared_import_succeeded',
  'shared_import_failed',
  'ai_create_opened',
  'ai_prompt_submitted',
  'ai_ad_requested',
  'ai_ad_dismissed',
  'ai_ad_failed',
  'ai_generation_started',
  'ai_generation_succeeded',
  'ai_generation_failed',
  'ai_editor_opened',
  'ai_routine_saved',
  'ai_routine_abandoned',
  'workout_opened',
  'workout_started',
  'workout_completed',
  'workout_abandoned',
  'schedule_opened',
  'schedule_created',
  'schedule_updated',
  'schedule_cancelled',
  'reminder_opened',
  'health_prompt_shown',
  'health_permission_result',
  'health_sync_enabled',
  'health_sync_disabled',
  'health_workout_sync_succeeded',
  'health_workout_sync_failed',
] as const;

export type ProductEventName = (typeof PRODUCT_EVENT_NAMES)[number];

export type ProductEventInput = {
  eventId: string;
  occurredAt: string;
  installId: string;
  sessionId: string;
  eventName: ProductEventName;
  platform: 'ios' | 'android' | 'web' | 'other';
  appVersion: string;
  locale: string;
  properties: Record<string, string | number | boolean>;
};

type DbRow = {
  event_id: string;
  occurred_at: string;
  received_at: string;
  install_id: string;
  user_id: string | null;
  session_id: string;
  event_name: ProductEventName;
  platform: string;
  app_version: string;
  locale: string;
  properties: Record<string, string | number | boolean> | null;
};

export async function recordProductEvents(
  events: ProductEventInput[],
  userId: string | null,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Analytics storage is not configured');

  const rows = events.map((event) => ({
    event_id: event.eventId,
    occurred_at: event.occurredAt,
    install_id: event.installId,
    user_id: userId,
    session_id: event.sessionId,
    event_name: event.eventName,
    platform: event.platform,
    app_version: event.appVersion,
    locale: event.locale,
    properties: event.properties,
  }));

  const { error } = await supabase.from(TABLE).upsert(rows, {
    onConflict: 'event_id',
    ignoreDuplicates: true,
  });
  if (error) throw new Error(`Failed to record analytics: ${error.message}`);
}

export type AnalyticsFunnelStep = {
  eventName: ProductEventName;
  label: string;
  installs: number;
  rateFromPrevious: number | null;
};

export type AnalyticsJourney = {
  installId: string;
  shortId: string;
  platform: string;
  locale: string;
  appVersion: string;
  firstSeenAt: string;
  lastSeenAt: string;
  stage: string;
  workoutCount: number;
  aiSavedCount: number;
  uploadCount: number;
  downloadCount: number;
  shareCount: number;
  events: Array<{
    occurredAt: string;
    eventName: ProductEventName;
    properties: Record<string, string | number | boolean>;
  }>;
};

export type ProductAnalyticsDashboardData = {
  configured: boolean;
  periodDays: number;
  eventRowCount: number;
  truncated: boolean;
  summary: {
    activeInstalls: number;
    firstOpens: number;
    workoutStarters: number;
    workoutCompleters: number;
    repeatWorkoutInstalls: number;
  };
  activationFunnel: AnalyticsFunnelStep[];
  aiFunnel: AnalyticsFunnelStep[];
  eventCounts: Record<string, number>;
  stageCounts: Record<string, number>;
  featureAdoption: {
    schedules: number;
    health: number;
    uploads: number;
    downloads: number;
    shares: number;
  };
  journeys: AnalyticsJourney[];
};

function percentage(value: number, base: number): number {
  return base <= 0 ? 0 : Math.round((value / base) * 1000) / 10;
}

function stageFor(names: Set<string>, workoutCount: number): string {
  if (workoutCount >= 2) return '반복 운동';
  if (names.has('workout_completed')) return '운동 1회 완료';
  if (names.has('workout_started')) return '운동 시작 후 미완료';
  if (
    names.has('routine_created') ||
    names.has('routine_download_succeeded') ||
    names.has('ai_routine_saved')
  ) {
    return '루틴 보유, 운동 전';
  }
  if (names.has('onboarding_complete')) return '온보딩 완료';
  return '최초 실행만';
}

function buildFunnel(
  rowsByInstall: Map<string, DbRow[]>,
  steps: Array<{
    eventName: ProductEventName;
    label: string;
    anyOf?: ProductEventName[];
  }>,
): AnalyticsFunnelStep[] {
  let previous: number | null = null;
  return steps.map((step) => {
    const acceptedNames = new Set(step.anyOf ?? [step.eventName]);
    const installs = [...rowsByInstall.values()].filter((rows) =>
      rows.some((row) => acceptedNames.has(row.event_name)),
    ).length;
    const result = {
      eventName: step.eventName,
      label: step.label,
      installs,
      rateFromPrevious:
        previous === null ? null : percentage(installs, previous),
    };
    previous = installs;
    return result;
  });
}

async function fetchPeriodRows(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  sinceIso: string,
): Promise<{ rows: DbRow[]; truncated: boolean }> {
  const rows: DbRow[] = [];
  let from = 0;

  while (from < MAX_ROWS) {
    const to = Math.min(from + PAGE_SIZE - 1, MAX_ROWS - 1);
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .gte('occurred_at', sinceIso)
      .order('occurred_at', { ascending: true })
      .order('event_id', { ascending: true })
      .range(from, to);
    if (error) throw new Error(`Failed to load analytics: ${error.message}`);

    const page = (data ?? []) as DbRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) {
      return { rows, truncated: false };
    }
    from += PAGE_SIZE;
  }

  return { rows, truncated: true };
}

export async function getProductAnalyticsDashboardData(
  periodDays = 28,
): Promise<ProductAnalyticsDashboardData> {
  const supabase = getSupabaseAdmin();
  const empty: ProductAnalyticsDashboardData = {
    configured: Boolean(supabase),
    periodDays,
    eventRowCount: 0,
    truncated: false,
    summary: {
      activeInstalls: 0,
      firstOpens: 0,
      workoutStarters: 0,
      workoutCompleters: 0,
      repeatWorkoutInstalls: 0,
    },
    activationFunnel: [],
    aiFunnel: [],
    eventCounts: {},
    stageCounts: {},
    featureAdoption: {
      schedules: 0,
      health: 0,
      uploads: 0,
      downloads: 0,
      shares: 0,
    },
    journeys: [],
  };
  if (!supabase) return empty;

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - periodDays);
  const { rows, truncated } = await fetchPeriodRows(
    supabase,
    since.toISOString(),
  );

  const rowsByInstall = new Map<string, DbRow[]>();
  const eventCounts: Record<string, number> = {};
  for (const row of rows) {
    eventCounts[row.event_name] = (eventCounts[row.event_name] ?? 0) + 1;
    const existing = rowsByInstall.get(row.install_id) ?? [];
    existing.push(row);
    rowsByInstall.set(row.install_id, existing);
  }

  const journeys = [...rowsByInstall.entries()]
    .map(([installId, installRows]): AnalyticsJourney => {
      const chronological = [...installRows].sort((a, b) =>
        a.occurred_at.localeCompare(b.occurred_at),
      );
      const latest = chronological[chronological.length - 1];
      const names = new Set(chronological.map((row) => row.event_name));
      const workoutCount = chronological.filter(
        (row) => row.event_name === 'workout_completed',
      ).length;
      return {
        installId,
        shortId: installId.replaceAll('-', '').slice(0, 8).toUpperCase(),
        platform: latest.platform,
        locale: latest.locale,
        appVersion: latest.app_version,
        firstSeenAt: chronological[0].occurred_at,
        lastSeenAt: latest.occurred_at,
        stage: stageFor(names, workoutCount),
        workoutCount,
        aiSavedCount: chronological.filter(
          (row) => row.event_name === 'ai_routine_saved',
        ).length,
        uploadCount: chronological.filter(
          (row) => row.event_name === 'routine_upload_succeeded',
        ).length,
        downloadCount: chronological.filter(
          (row) => row.event_name === 'routine_download_succeeded',
        ).length,
        shareCount: chronological.filter(
          (row) => row.event_name === 'routine_share_tapped',
        ).length,
        events: chronological.map((row) => ({
          occurredAt: row.occurred_at,
          eventName: row.event_name,
          properties: row.properties ?? {},
        })),
      };
    })
    .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));

  const uniqueWith = (eventName: ProductEventName) =>
    journeys.filter((journey) =>
      journey.events.some((event) => event.eventName === eventName),
    ).length;
  const stageCounts: Record<string, number> = {};
  for (const journey of journeys) {
    stageCounts[journey.stage] = (stageCounts[journey.stage] ?? 0) + 1;
  }

  return {
    configured: true,
    periodDays,
    eventRowCount: rows.length,
    truncated,
    summary: {
      activeInstalls: journeys.length,
      firstOpens: uniqueWith('first_open'),
      workoutStarters: uniqueWith('workout_started'),
      workoutCompleters: uniqueWith('workout_completed'),
      repeatWorkoutInstalls: journeys.filter((j) => j.workoutCount >= 2).length,
    },
    activationFunnel: buildFunnel(rowsByInstall, [
      { eventName: 'first_open', label: '최초 실행' },
      { eventName: 'onboarding_complete', label: '온보딩 완료' },
      {
        eventName: 'routine_download_succeeded',
        label: '루틴 확보',
        anyOf: [
          'routine_download_succeeded',
          'routine_created',
          'ai_routine_saved',
        ],
      },
      { eventName: 'workout_started', label: '운동 시작' },
      { eventName: 'workout_completed', label: '운동 완료' },
    ]),
    aiFunnel: buildFunnel(rowsByInstall, [
      { eventName: 'ai_create_opened', label: 'AI 화면 진입' },
      { eventName: 'ai_prompt_submitted', label: '요청 제출' },
      { eventName: 'ai_generation_succeeded', label: '생성 성공' },
      { eventName: 'ai_routine_saved', label: '루틴 저장' },
    ]),
    eventCounts,
    stageCounts,
    featureAdoption: {
      schedules: uniqueWith('schedule_created'),
      health: uniqueWith('health_workout_sync_succeeded'),
      uploads: uniqueWith('routine_upload_succeeded'),
      downloads: uniqueWith('routine_download_succeeded'),
      shares: uniqueWith('routine_share_tapped'),
    },
    journeys: journeys.slice(0, 200),
  };
}
