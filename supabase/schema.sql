-- Tabata Supabase schema (idempotent — safe to re-run in SQL Editor)

create table if not exists tabata_routine_profiles (
  id text primary key,
  data jsonb not null,
  owner_id text not null,
  updated_at timestamptz not null default now(),
  constraint tabata_routine_profiles_data_id_matches
    check ((data ->> 'id') = id)
);

create index if not exists tabata_routine_profiles_owner_id_idx
  on tabata_routine_profiles (owner_id);

create index if not exists tabata_routine_profiles_updated_at_idx
  on tabata_routine_profiles (updated_at desc);

alter table tabata_routine_profiles enable row level security;

-- No client-side access; the Next.js server uses the service role key.
drop policy if exists "tabata_routine_profiles_deny_anon" on tabata_routine_profiles;
create policy "tabata_routine_profiles_deny_anon"
  on tabata_routine_profiles
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- App users (Firebase / Kakao login)
create table if not exists tabata_users (
  user_id text primary key,
  full_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create index if not exists tabata_users_updated_at_idx
  on tabata_users (updated_at desc);

alter table tabata_users enable row level security;

drop policy if exists "tabata_users_deny_anon" on tabata_users;
create policy "tabata_users_deny_anon"
  on tabata_users
  for all
  to anon, authenticated
  using (false)
  with check (false);
