import type { SupabaseClient } from '@supabase/supabase-js';

import { getFirebaseAdmin } from './firebase/admin';
import { getSupabaseAdmin } from './supabase-admin';

const PROFILES_TABLE = 'tabata_routine_profiles';
const USERS_TABLE = 'tabata_users';

async function collectStoragePaths(
  supabase: SupabaseClient,
  bucket: string,
  folder: string,
): Promise<string[]> {
  const { data, error } = await supabase.storage.from(bucket).list(folder, {
    limit: 1000,
    sortBy: { column: 'name', order: 'asc' },
  });
  if (error || !data?.length) {
    return [];
  }

  const paths: string[] = [];
  for (const entry of data) {
    const entryPath = `${folder}/${entry.name}`;
    if (entry.id) {
      paths.push(entryPath);
      continue;
    }
    paths.push(...(await collectStoragePaths(supabase, bucket, entryPath)));
  }
  return paths;
}

async function deleteUserStorage(supabase: SupabaseClient, userId: string) {
  const bucket = process.env.STORAGE_BUCKET?.trim() || 'tabata-server';
  const root = `routine-images/${userId}`;
  const paths = await collectStoragePaths(supabase, bucket, root);
  if (paths.length === 0) {
    return;
  }

  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) {
    console.error(`Failed to delete storage for ${userId}:`, error.message);
  }
}

export type DeleteUserAccountResult = {
  deletedProfiles: number;
  deletedUserRow: boolean;
  deletedFirebaseUser: boolean;
};

export async function deleteUserAccount(
  userId: string,
): Promise<DeleteUserAccountResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error('Database not configured');
  }

  const { count: profileCount, error: profileError } = await supabase
    .from(PROFILES_TABLE)
    .delete({ count: 'exact' })
    .eq('owner_id', userId);

  if (profileError) {
    throw new Error(`Failed to delete user profiles: ${profileError.message}`);
  }

  await deleteUserStorage(supabase, userId);

  const { count: userCount, error: userError } = await supabase
    .from(USERS_TABLE)
    .delete({ count: 'exact' })
    .eq('user_id', userId);

  if (userError) {
    throw new Error(`Failed to delete user row: ${userError.message}`);
  }

  let deletedFirebaseUser = false;
  try {
    const { auth } = getFirebaseAdmin();
    await auth.deleteUser(userId);
    deletedFirebaseUser = true;
  } catch (error) {
    const code =
      error instanceof Error && 'code' in error
        ? String((error as { code?: string }).code)
        : '';
    if (code !== 'auth/user-not-found') {
      console.error(`Failed to delete Firebase user ${userId}:`, error);
      throw new Error('Failed to delete authentication account');
    }
  }

  return {
    deletedProfiles: profileCount ?? 0,
    deletedUserRow: (userCount ?? 0) > 0,
    deletedFirebaseUser,
  };
}
