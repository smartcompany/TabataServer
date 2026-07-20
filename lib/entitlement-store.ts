import { randomUUID } from 'node:crypto';

import { getSupabaseAdmin } from '@/lib/supabase-admin';

const GRANTS_TABLE = 'tabata_entitlement_grants';
const EVENTS_TABLE = 'tabata_product_events';
const ENTITLEMENT_EVENT = 'entitlement_granted';

export const ONBOARDING_AI_AD_WAIVER = 'onboarding_ai_ad_waiver';

type StorageMode = 'grants' | 'events';

let storageMode: StorageMode | null = null;

function isMissingTableError(error: { code?: string; message?: string } | null) {
  return error?.code === '42P01' || error?.message?.includes('does not exist');
}

async function resolveStorageMode(): Promise<StorageMode> {
  if (storageMode) return storageMode;

  const supabase = getSupabaseAdmin();
  if (!supabase) return 'events';

  const { error } = await supabase
    .from(GRANTS_TABLE)
    .select('install_id')
    .limit(1);

  storageMode = isMissingTableError(error) ? 'events' : 'grants';
  return storageMode;
}

async function hasGrantInEvents(
  entitlement: string,
  installId: string,
  userId: string | null,
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const { data: byInstall, error: installError } = await supabase
    .from(EVENTS_TABLE)
    .select('event_id')
    .eq('event_name', ENTITLEMENT_EVENT)
    .eq('install_id', installId)
    .contains('properties', { entitlement })
    .limit(1);

  if (installError) {
    throw new Error(`Failed to check entitlement: ${installError.message}`);
  }
  if ((byInstall?.length ?? 0) > 0) return true;

  if (!userId) return false;

  const { data: byUser, error: userError } = await supabase
    .from(EVENTS_TABLE)
    .select('event_id')
    .eq('event_name', ENTITLEMENT_EVENT)
    .eq('user_id', userId)
    .contains('properties', { entitlement })
    .limit(1);

  if (userError) {
    throw new Error(`Failed to check entitlement: ${userError.message}`);
  }
  return (byUser?.length ?? 0) > 0;
}

async function hasGrantInGrantsTable(
  entitlement: string,
  installId: string,
  userId: string | null,
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const { data: byInstall, error: installError } = await supabase
    .from(GRANTS_TABLE)
    .select('install_id')
    .eq('entitlement', entitlement)
    .eq('install_id', installId)
    .limit(1);

  if (installError) {
    throw new Error(`Failed to check entitlement: ${installError.message}`);
  }
  if ((byInstall?.length ?? 0) > 0) return true;

  if (!userId) return false;

  const { data: byUser, error: userError } = await supabase
    .from(GRANTS_TABLE)
    .select('user_id')
    .eq('entitlement', entitlement)
    .eq('user_id', userId)
    .limit(1);

  if (userError) {
    throw new Error(`Failed to check entitlement: ${userError.message}`);
  }
  return (byUser?.length ?? 0) > 0;
}

export async function hasEntitlementGrant(
  entitlement: string,
  installId: string,
  userId: string | null,
): Promise<boolean> {
  const mode = await resolveStorageMode();
  if (mode === 'events') {
    return hasGrantInEvents(entitlement, installId, userId);
  }
  return hasGrantInGrantsTable(entitlement, installId, userId);
}

async function grantInEvents(
  entitlement: string,
  installId: string,
  userId: string | null,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Entitlement storage is not configured');

  const now = new Date().toISOString();
  const { error } = await supabase.from(EVENTS_TABLE).insert({
    event_id: randomUUID(),
    occurred_at: now,
    install_id: installId,
    user_id: userId,
    session_id: installId,
    event_name: ENTITLEMENT_EVENT,
    platform: 'other',
    app_version: '',
    locale: '',
    properties: { entitlement },
  });

  if (error) {
    throw new Error(`Failed to grant entitlement: ${error.message}`);
  }
}

async function grantInGrantsTable(
  entitlement: string,
  installId: string,
  userId: string | null,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Entitlement storage is not configured');

  const { error } = await supabase.from(GRANTS_TABLE).upsert(
    {
      install_id: installId,
      entitlement,
      user_id: userId,
      granted_at: new Date().toISOString(),
    },
    { onConflict: 'install_id,entitlement' },
  );
  if (error) {
    if (error.code === '23505') return;
    throw new Error(`Failed to grant entitlement: ${error.message}`);
  }
}

export async function grantEntitlement(
  entitlement: string,
  installId: string,
  userId: string | null,
): Promise<void> {
  if (await hasEntitlementGrant(entitlement, installId, userId)) {
    return;
  }

  const mode = await resolveStorageMode();
  if (mode === 'events') {
    await grantInEvents(entitlement, installId, userId);
    return;
  }
  await grantInGrantsTable(entitlement, installId, userId);
}

export async function linkInstallGrantsToUser(
  installId: string,
  userId: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Entitlement storage is not configured');

  const mode = await resolveStorageMode();
  if (mode === 'events') {
    const { error } = await supabase
      .from(EVENTS_TABLE)
      .update({ user_id: userId })
      .eq('install_id', installId)
      .eq('event_name', ENTITLEMENT_EVENT)
      .is('user_id', null);
    if (error) {
      throw new Error(`Failed to link install grants: ${error.message}`);
    }
    return;
  }

  const { error } = await supabase
    .from(GRANTS_TABLE)
    .update({ user_id: userId })
    .eq('install_id', installId)
    .is('user_id', null);
  if (error?.code === '23505') {
    return;
  }
  if (error) {
    throw new Error(`Failed to link install grants: ${error.message}`);
  }
}
