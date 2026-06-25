import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type RoutineProfileRow = {
  id: string;
  data: unknown;
  owner_id: string;
  updated_at: string;
};

let adminClient: SupabaseClient | null | undefined;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (adminClient !== undefined) return adminClient;

  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    adminClient = null;
    return null;
  }

  adminClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

export function useSupabaseProfiles(): boolean {
  return getSupabaseAdmin() !== null;
}
