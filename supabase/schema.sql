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

-- AI routine generation usage (dashboard analytics)
create table if not exists tabata_ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  model text not null default 'gemini-2.5-flash',
  content_language text,
  prompt_length int not null default 0,
  routine_id text,
  routine_title text,
  exercise_count int,
  prompt_token_count int not null default 0,
  candidates_token_count int not null default 0,
  thoughts_token_count int not null default 0,
  total_token_count int not null default 0,
  estimated_input_usd numeric(12, 6) not null default 0,
  estimated_output_usd numeric(12, 6) not null default 0,
  estimated_total_usd numeric(12, 6) not null default 0
);

create index if not exists tabata_ai_usage_logs_created_at_idx
  on tabata_ai_usage_logs (created_at desc);

alter table tabata_ai_usage_logs enable row level security;

drop policy if exists "tabata_ai_usage_logs_deny_anon" on tabata_ai_usage_logs;
create policy "tabata_ai_usage_logs_deny_anon"
  on tabata_ai_usage_logs
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- Ephemeral routine snapshots for HTTPS share links (/share/{id})
create table if not exists tabata_shared_routines (
  id uuid primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists tabata_shared_routines_created_at_idx
  on tabata_shared_routines (created_at desc);

alter table tabata_shared_routines enable row level security;

drop policy if exists "tabata_shared_routines_deny_anon" on tabata_shared_routines;
create policy "tabata_shared_routines_deny_anon"
  on tabata_shared_routines
  for all
  to anon, authenticated
  using (false)
  with check (false);
