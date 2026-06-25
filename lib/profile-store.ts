import fs from 'fs/promises';
import path from 'path';

import {
  OFFICIAL_CATALOG_OWNER,
  parseRoutineProfile,
  type ProfileSummary,
  type RoutineProfile,
  toSummary,
} from './profile-schema';
import { getSupabaseAdmin, useSupabaseProfiles } from './supabase-admin';
import type { SupabaseClient } from '@supabase/supabase-js';

const TABLE = 'tabata_routine_profiles';
const DATA_DIR = path.join(process.cwd(), 'data', 'profiles');

/** Bundled default profiles (display order). Rotator cuff is always last. */
const DEFAULT_PROFILE_ORDER = [
  'tabata-basic',
  'full-body-warmup',
  'core-strength',
  'lower-body-tabata',
  'upper-body-warmup',
] as const;

const ROTATOR_CUFF_ID = 'rotator-cuff';

function profilesTable(supabase: SupabaseClient) {
  return supabase.from(TABLE);
}

function profileSortKey(id: string): [number, string] {
  if (id === ROTATOR_CUFF_ID) return [2, id];
  const index = DEFAULT_PROFILE_ORDER.indexOf(
    id as (typeof DEFAULT_PROFILE_ORDER)[number],
  );
  if (index >= 0) return [0, String(index).padStart(3, '0')];
  return [1, id];
}

function compareProfiles(a: ProfileSummary, b: ProfileSummary): number {
  const [aTier, aKey] = profileSortKey(a.id);
  const [bTier, bKey] = profileSortKey(b.id);
  if (aTier !== bTier) return aTier - bTier;
  if (aKey !== bKey) return aKey.localeCompare(bKey);
  return a.title.localeCompare(b.title, 'ko');
}

async function readBundledProfile(id: string): Promise<RoutineProfile | null> {
  const filePath = path.join(DATA_DIR, `${id}.json`);
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return parseRoutineProfile(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function listBundledIds(): Promise<string[]> {
  try {
    const files = await fs.readdir(DATA_DIR);
    return files
      .filter((name) => name.endsWith('.json'))
      .map((name) => name.replace(/\.json$/, ''));
  } catch {
    return [];
  }
}

async function getBundledSummary(id: string): Promise<ProfileSummary | null> {
  const bundled = await readBundledProfile(id);
  if (!bundled) return null;

  const filePath = path.join(DATA_DIR, `${id}.json`);
  let updatedAt = new Date(0).toISOString();
  try {
    const stat = await fs.stat(filePath);
    updatedAt = stat.mtime.toISOString();
  } catch {
    // keep default
  }

  return toSummary(bundled, updatedAt);
}

async function listBundledSummaries(): Promise<ProfileSummary[]> {
  const ids = await listBundledIds();
  const summaries = await Promise.all(ids.map((id) => getBundledSummary(id)));
  return summaries
    .filter((item): item is ProfileSummary => item !== null)
    .sort(compareProfiles);
}

async function getBundledProfile(id: string): Promise<RoutineProfile | null> {
  return readBundledProfile(id);
}

function rowToSummary(row: { data: unknown; updated_at: string }): ProfileSummary {
  const profile = parseRoutineProfile(row.data);
  return toSummary(profile, row.updated_at);
}

/** Official catalog profiles uploaded by admin. */
export async function listProfileSummaries(): Promise<ProfileSummary[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return listBundledSummaries();
  }

  const { data, error } = await profilesTable(supabase)
    .select('id, data, updated_at')
    .eq('owner_id', OFFICIAL_CATALOG_OWNER)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list profiles: ${error.message}`);
  }

  return (data ?? []).map(rowToSummary).sort(compareProfiles);
}

export async function getProfile(id: string): Promise<RoutineProfile | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return getBundledProfile(id);
  }

  const { data, error } = await profilesTable(supabase)
    .select('data')
    .eq('id', id)
    .eq('owner_id', OFFICIAL_CATALOG_OWNER)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load profile ${id}: ${error.message}`);
  }
  if (!data?.data) return null;

  return parseRoutineProfile(data.data);
}

export async function saveProfile(
  profile: RoutineProfile,
  options: { ownerId: string },
): Promise<ProfileSummary> {
  const parsed = parseRoutineProfile(profile);
  const now = new Date().toISOString();
  const ownerId = options.ownerId.trim();
  if (!ownerId) {
    throw new Error('ownerId is required');
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Profile writes require Supabase (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)',
      );
    }

    const body = JSON.stringify(parsed, null, 2);
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(path.join(DATA_DIR, `${parsed.id}.json`), body, 'utf8');
    return toSummary(parsed, now);
  }

  const { error } = await profilesTable(supabase).upsert(
    {
      id: parsed.id,
      data: parsed,
      owner_id: ownerId,
      updated_at: now,
    },
    { onConflict: 'id' },
  );

  if (error) {
    throw new Error(`Failed to save profile: ${error.message}`);
  }

  return toSummary(parsed, now);
}

export async function profileExists(id: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return (await readBundledProfile(id)) !== null;
  }

  const { data, error } = await profilesTable(supabase)
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check profile: ${error.message}`);
  }
  return data !== null;
}

export async function deleteProfile(id: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Profile deletes require Supabase in production');
    }

    const filePath = path.join(DATA_DIR, `${id}.json`);
    try {
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  const { error, count } = await profilesTable(supabase)
    .delete({ count: 'exact' })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete profile: ${error.message}`);
  }
  return (count ?? 0) > 0;
}

export { useSupabaseProfiles };
