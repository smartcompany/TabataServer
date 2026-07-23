import type { DescriptionBlock } from './description-blocks';

export type ContentLanguage = 'en' | 'ko' | 'zh' | 'ja';

export type ExercisePhaseKind = 'work' | 'relax';

export type ExercisePhase = {
  id: string;
  kind: ExercisePhaseKind;
  label: string;
  durationSec: number;
  order: number;
};

export type Exercise = {
  id: string;
  name: string;
  instruction: string;
  order: number;
  prepare: { durationSec: number };
  phases: ExercisePhase[];
  reps: number;
  sets: number;
};

export type RoutineProfile = {
  schemaVersion: 1;
  id: string;
  title: string;
  description: string;
  descriptionBlocks?: DescriptionBlock[];
  contentLanguage?: ContentLanguage;
  exercises: Exercise[];
};

export function newId(): string {
  return crypto.randomUUID();
}

export function createPhase(kind: ExercisePhaseKind, order: number): ExercisePhase {
  return {
    id: newId(),
    kind,
    label: kind === 'work' ? '운동' : '휴식',
    durationSec: 8,
    order,
  };
}

export function createExercise(order: number): Exercise {
  return {
    id: newId(),
    name: '새 운동',
    instruction: '',
    order,
    prepare: { durationSec: 5 },
    phases: [createPhase('work', 0), createPhase('relax', 1)],
    reps: 10,
    sets: 3,
  };
}

export function createEmptyProfile(): RoutineProfile {
  return {
    schemaVersion: 1,
    id: 'new-profile',
    title: '새 루틴',
    description: '',
    exercises: [createExercise(0)],
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parsePhase(raw: unknown, index: number): ExercisePhase | null {
  const obj = asRecord(raw);
  if (!obj) return null;
  const kind = obj.kind === 'relax' ? 'relax' : obj.kind === 'work' ? 'work' : null;
  if (!kind) return null;
  const id = typeof obj.id === 'string' && obj.id ? obj.id : newId();
  const label = typeof obj.label === 'string' ? obj.label : '';
  const durationSec =
    typeof obj.durationSec === 'number' ? Math.max(1, Math.floor(obj.durationSec)) : 8;
  return { id, kind, label, durationSec, order: index };
}

function parseExercise(raw: unknown, index: number): Exercise | null {
  const obj = asRecord(raw);
  if (!obj) return null;
  const id = typeof obj.id === 'string' && obj.id ? obj.id : newId();
  const name = typeof obj.name === 'string' ? obj.name : '';
  const instruction = typeof obj.instruction === 'string' ? obj.instruction : '';
  const prepareObj = asRecord(obj.prepare);
  const durationSec =
    typeof prepareObj?.durationSec === 'number'
      ? Math.max(0, Math.floor(prepareObj.durationSec))
      : 0;
  const phasesRaw = Array.isArray(obj.phases) ? obj.phases : [];
  const phases = phasesRaw
    .map((phase, phaseIndex) => parsePhase(phase, phaseIndex))
    .filter((phase): phase is ExercisePhase => phase !== null);
  if (!name || phases.length === 0) return null;
  const reps = typeof obj.reps === 'number' ? Math.max(1, Math.floor(obj.reps)) : 1;
  const sets = typeof obj.sets === 'number' ? Math.max(1, Math.floor(obj.sets)) : 1;
  return {
    id,
    name,
    instruction,
    order: index,
    prepare: { durationSec },
    phases,
    reps,
    sets,
  };
}

export function parseProfile(raw: unknown): RoutineProfile | null {
  const obj = asRecord(raw);
  if (!obj) return null;
  const id = typeof obj.id === 'string' ? obj.id : '';
  const title = typeof obj.title === 'string' ? obj.title : '';
  const description = typeof obj.description === 'string' ? obj.description : '';
  const descriptionBlocks = Array.isArray(obj.descriptionBlocks)
    ? (obj.descriptionBlocks as DescriptionBlock[])
    : undefined;
  const contentLanguageRaw = obj.contentLanguage;
  const contentLanguage =
    contentLanguageRaw === 'en' ||
    contentLanguageRaw === 'ko' ||
    contentLanguageRaw === 'zh' ||
    contentLanguageRaw === 'ja'
      ? contentLanguageRaw
      : undefined;
  const exercisesRaw = Array.isArray(obj.exercises) ? obj.exercises : [];
  const exercises = exercisesRaw
    .map((exercise, index) => parseExercise(exercise, index))
    .filter((exercise): exercise is Exercise => exercise !== null);
  if (!id || !title || exercises.length === 0) return null;
  return normalizeProfile({
    schemaVersion: 1,
    id,
    title,
    description,
    ...(descriptionBlocks && descriptionBlocks.length > 0
      ? { descriptionBlocks }
      : {}),
    ...(contentLanguage ? { contentLanguage } : {}),
    exercises,
  });
}

export function normalizeProfile(profile: RoutineProfile): RoutineProfile {
  return {
    ...profile,
    exercises: profile.exercises.map((exercise, exerciseIndex) => ({
      ...exercise,
      order: exerciseIndex,
      phases: exercise.phases.map((phase, phaseIndex) => ({
        ...phase,
        order: phaseIndex,
      })),
    })),
  };
}

export function profileToJson(profile: RoutineProfile): RoutineProfile {
  const normalized = normalizeProfile(profile);
  return {
    ...normalized,
    ...(normalized.descriptionBlocks && normalized.descriptionBlocks.length > 0
      ? { descriptionBlocks: normalized.descriptionBlocks }
      : {}),
    ...(normalized.contentLanguage
      ? { contentLanguage: normalized.contentLanguage }
      : {}),
  };
}
