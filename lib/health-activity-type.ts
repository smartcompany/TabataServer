import {
  healthActivityTypeSchema,
  type HealthActivityType,
} from '@/lib/profile-schema';

const HEALTH_ACTIVITY_ALIASES: Record<string, HealthActivityType> = {
  hiit: 'high_intensity_interval_training',
  highintensityintervaltraining: 'high_intensity_interval_training',
  high_intensity_interval_training: 'high_intensity_interval_training',
  tabata: 'high_intensity_interval_training',
  functional: 'functional_strength_training',
  functional_strength: 'functional_strength_training',
  functional_strength_training: 'functional_strength_training',
  strength: 'traditional_strength_training',
  traditional_strength: 'traditional_strength_training',
  traditional_strength_training: 'traditional_strength_training',
  weightlifting: 'traditional_strength_training',
  flexibility: 'flexibility',
  yoga: 'flexibility',
  pilates: 'flexibility',
  stretching: 'flexibility',
  other: 'other',
};

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

export function normalizeHealthActivityType(
  value: unknown,
): HealthActivityType | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const raw = String(value).trim();
  const direct = healthActivityTypeSchema.safeParse(raw);
  if (direct.success) {
    return direct.data;
  }
  const key = raw.toLowerCase().replace(/[\s-]+/g, '_');
  const compact = key.replace(/_/g, '');
  return (
    HEALTH_ACTIVITY_ALIASES[key] ??
    HEALTH_ACTIVITY_ALIASES[compact] ??
    undefined
  );
}

function collectRoutineText(source: {
  title?: unknown;
  description?: unknown;
  exercises?: unknown;
}): string {
  const parts: string[] = [
    String(source.title ?? ''),
    String(source.description ?? ''),
  ];
  if (Array.isArray(source.exercises)) {
    for (const exercise of source.exercises) {
      if (!exercise || typeof exercise !== 'object') continue;
      const item = exercise as Record<string, unknown>;
      parts.push(String(item.name ?? ''), String(item.instruction ?? ''));
      if (Array.isArray(item.phases)) {
        for (const phase of item.phases) {
          if (!phase || typeof phase !== 'object') continue;
          parts.push(String((phase as Record<string, unknown>).label ?? ''));
        }
      }
    }
  }
  return parts.join(' ').toLowerCase();
}

function looksLikeIntervalRoutine(source: {
  title?: unknown;
  description?: unknown;
  exercises?: unknown;
}): boolean {
  const text = collectRoutineText(source);
  if (/tabata|hiit|고강도|인터벌|interval|서킷|circuit/.test(text)) {
    return true;
  }
  if (!Array.isArray(source.exercises)) {
    return false;
  }
  let intervalish = 0;
  let total = 0;
  for (const exercise of source.exercises) {
    if (!exercise || typeof exercise !== 'object') continue;
    const phases = (exercise as Record<string, unknown>).phases;
    if (!Array.isArray(phases) || phases.length < 2) continue;
    total += 1;
    const work = phases.find(
      (phase) =>
        phase &&
        typeof phase === 'object' &&
        normalizePhaseKind((phase as Record<string, unknown>).kind) === 'work',
    ) as Record<string, unknown> | undefined;
    const relax = phases.find(
      (phase) =>
        phase &&
        typeof phase === 'object' &&
        normalizePhaseKind((phase as Record<string, unknown>).kind) === 'relax',
    ) as Record<string, unknown> | undefined;
    if (!work || !relax) continue;
    if (normalizeTimingMode(work.timingMode) === 'count') continue;
    const workSec = toInt(work.durationSec, 0, 0);
    const relaxSec = toInt(relax.durationSec, 0, 0);
    if (workSec > 0 && workSec <= 45 && relaxSec > 0 && relaxSec <= 30) {
      intervalish += 1;
    }
  }
  return total > 0 && intervalish / total >= 0.5;
}

export function inferHealthActivityType(source: {
  title?: unknown;
  description?: unknown;
  exercises?: unknown;
}): HealthActivityType {
  const text = collectRoutineText(source);
  if (
    /yoga|필라테스|pilates|stretch|스트레칭|유연|가동성|flexibility|스트레치/.test(
      text,
    )
  ) {
    return 'flexibility';
  }
  if (
    /dumbbell|바벨|barbell|kettlebell|웨이트|헬스장|벤치|데드립트|스쿼트\s*랙|weight\s*lift|weightlifting/.test(
      text,
    )
  ) {
    return 'traditional_strength_training';
  }
  if (looksLikeIntervalRoutine(source)) {
    return 'high_intensity_interval_training';
  }
  if (
    /재활|rehab|회전근|rotator|맨몸|바디웨이트|bodyweight|기능성|코어|home\s*workout|홈트/.test(
      text,
    )
  ) {
    return 'functional_strength_training';
  }
  return 'functional_strength_training';
}

export function resolveHealthActivityType(
  source: Record<string, unknown>,
): HealthActivityType {
  return (
    normalizeHealthActivityType(source.healthActivityType) ??
    inferHealthActivityType(source)
  );
}
