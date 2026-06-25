-- Tabata routine profiles (official catalog + future user-shared routines)
-- Run in Supabase SQL Editor before deploying the server.

create table if not exists public.tabata_routine_profiles (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  title text not null,
  description text not null default '',
  exercise_count integer not null check (exercise_count >= 1),
  data jsonb not null,
  owner_id uuid references auth.users (id) on delete cascade,
  updated_at timestamptz not null default now()
);

create index if not exists tabata_routine_profiles_owner_id_idx
  on public.tabata_routine_profiles (owner_id);

create index if not exists tabata_routine_profiles_updated_at_idx
  on public.tabata_routine_profiles (updated_at desc);

alter table public.tabata_routine_profiles enable row level security;

-- No client-side access; the Next.js server uses the service role key.
create policy "tabata_routine_profiles_deny_anon"
  on public.tabata_routine_profiles
  for all
  to anon, authenticated
  using (false)
  with check (false);
