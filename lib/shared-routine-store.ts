import { randomUUID } from 'crypto';

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
  parseRoutineProfile,
  type RoutineProfile,
} from '@/lib/profile-schema';

const TABLE = 'tabata_shared_routines';

export type SharedRoutineRow = {
  id: string;
  data: RoutineProfile;
  created_at: string;
};

export async function createSharedRoutine(
  routine: RoutineProfile,
): Promise<SharedRoutineRow | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const profile = parseRoutineProfile(routine);
  const id = randomUUID();

  const { data, error } = await supabase
    .from(TABLE)
    .insert({ id, data: profile })
    .select('id, data, created_at')
    .single();

  if (error) {
    console.error('[shared-routine-store] insert failed', error);
    throw error;
  }

  return {
    id: data.id,
    data: parseRoutineProfile(data.data),
    created_at: data.created_at,
  };
}

export async function getSharedRoutine(
  id: string,
): Promise<SharedRoutineRow | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .select('id, data, created_at')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[shared-routine-store] select failed', error);
    throw error;
  }
  if (!data) return null;

  return {
    id: data.id,
    data: parseRoutineProfile(data.data),
    created_at: data.created_at,
  };
}
