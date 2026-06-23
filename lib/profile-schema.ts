import { z } from 'zod';

const timedPhaseSchema = z.object({
  durationSec: z.number().int().min(0),
});

const exercisePhaseSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['work', 'relax']),
  label: z.string().min(1),
  durationSec: z.number().int().min(1),
  order: z.number().int().min(0),
});

const exerciseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  instruction: z.string(),
  order: z.number().int().min(0),
  prepare: timedPhaseSchema,
  phases: z.array(exercisePhaseSchema).min(1),
  reps: z.number().int().min(1),
  sets: z.number().int().min(1),
});

export const routineProfileSchema = z.object({
  schemaVersion: z.literal(1),
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'id must be lowercase letters, numbers, and hyphens'),
  title: z.string().min(1),
  description: z.string(),
  exercises: z.array(exerciseSchema).min(1),
});

export type RoutineProfile = z.infer<typeof routineProfileSchema>;

export type ProfileSummary = {
  id: string;
  title: string;
  description: string;
  exerciseCount: number;
  updatedAt: string;
};

export function toSummary(profile: RoutineProfile, updatedAt: string): ProfileSummary {
  return {
    id: profile.id,
    title: profile.title,
    description: profile.description,
    exerciseCount: profile.exercises.length,
    updatedAt,
  };
}

export function parseRoutineProfile(raw: unknown): RoutineProfile {
  return routineProfileSchema.parse(raw);
}
