import { z } from 'zod';

import {
  descriptionBlocksSchema,
  descriptionPlainText,
} from './description-blocks';

const timedPhaseSchema = z.object({
  durationSec: z.number().int().min(0),
});

const exercisePhaseSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['work', 'relax']),
  label: z.string().min(1),
  durationSec: z.number().int().min(1),
  order: z.number().int().min(0),
  timingMode: z.enum(['duration', 'count']).optional(),
  countReps: z.number().int().min(1).optional(),
  secondsPerRep: z.number().int().min(1).optional(),
  countOrder: z.enum(['ascending', 'descending']).optional(),
});

const exerciseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  instruction: z.string(),
  instructionBlocks: descriptionBlocksSchema.optional(),
  order: z.number().int().min(0),
  prepare: timedPhaseSchema,
  phases: z.array(exercisePhaseSchema).min(1),
  reps: z.number().int().min(1),
  sets: z.number().int().min(1),
});

export const OFFICIAL_CATALOG_OWNER = 'admin';

export const routineProfileSchema = z.object({
  schemaVersion: z.literal(1),
  id: z
    .string()
    .min(1)
    .max(128)
    .regex(
      /^[a-z0-9-]+$/i,
      'id must be a unique identifier (letters, numbers, hyphens)',
    ),
  title: z.string().min(1),
  description: z.string(),
  descriptionBlocks: descriptionBlocksSchema.optional(),
  exercises: z.array(exerciseSchema).min(1),
});

export type RoutineProfile = z.infer<typeof routineProfileSchema>;

export type ProfileSummary = {
  id: string;
  title: string;
  description: string;
  exerciseCount: number;
  updatedAt: string;
  ownerId: string;
  ownerName?: string;
};

export function toSummary(
  profile: RoutineProfile,
  updatedAt: string,
  ownerId: string = OFFICIAL_CATALOG_OWNER,
): ProfileSummary {
  return {
    id: profile.id,
    title: profile.title,
    description: descriptionPlainText(
      profile.description,
      profile.descriptionBlocks,
    ),
    exerciseCount: profile.exercises.length,
    updatedAt,
    ownerId,
  };
}

export function normalizeRoutineProfile(raw: unknown): RoutineProfile {
  const parsed = routineProfileSchema.parse(raw);
  const blocks = parsed.descriptionBlocks ?? [];
  const description = descriptionPlainText(parsed.description, blocks);
  const exercises = parsed.exercises.map((exercise) => {
    const instructionBlocks = exercise.instructionBlocks ?? [];
    const instruction = descriptionPlainText(
      exercise.instruction,
      instructionBlocks,
    );
    return {
      ...exercise,
      instruction,
      instructionBlocks:
        instructionBlocks.length > 0 ? instructionBlocks : undefined,
    };
  });
  return {
    ...parsed,
    description,
    descriptionBlocks: blocks.length > 0 ? blocks : undefined,
    exercises,
  };
}

export function parseRoutineProfile(raw: unknown): RoutineProfile {
  return normalizeRoutineProfile(raw);
}
