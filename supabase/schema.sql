-- Tabata routine profiles (official catalog + future user-shared routines)
-- Run in Supabase SQL Editor (drop existing table first if re-creating).

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
create policy "tabata_routine_profiles_deny_anon"
  on tabata_routine_profiles
  for all
  to anon, authenticated
  using (false)
  with check (false);
