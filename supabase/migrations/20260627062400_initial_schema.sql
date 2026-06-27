-- TORN LIFE initial schema
-- Designed for multi-user from day one; MVP uses a single configured player.

create extension if not exists "pgcrypto";

-- Player profiles
create table public.player_profiles (
  id uuid primary key default gen_random_uuid(),
  torn_user_id bigint unique,
  username text not null,
  age integer,
  archetype text not null default 'THE UNKNOWN',
  lore_meters jsonb not null default '{
    "heat": 50,
    "luck": 50,
    "rot": 50,
    "rep": 50,
    "vice": 50,
    "debt": 50
  }'::jsonb,
  character_state jsonb not null default '{
    "mood": "unsettled",
    "ongoingProblems": [],
    "favoriteLocations": [],
    "habits": [],
    "vices": [],
    "possessions": [],
    "friends": [],
    "enemies": [],
    "runningJokes": [],
    "unfinishedSituations": [],
    "personalityNotes": []
  }'::jsonb,
  initialized boolean not null default false,
  last_sync_at timestamptz,
  last_ambient_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Immutable Torn API snapshots
create table public.torn_snapshots (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.player_profiles(id) on delete cascade,
  raw_data jsonb not null,
  normalized_summary jsonb not null,
  created_at timestamptz not null default now()
);

create index torn_snapshots_player_created_idx
  on public.torn_snapshots (player_id, created_at desc);

-- Generated life log entries
create table public.life_entries (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.player_profiles(id) on delete cascade,
  content text not null,
  entry_type text not null check (entry_type in ('assessment', 'reactive', 'ambient')),
  created_at timestamptz not null default now()
);

create index life_entries_player_created_idx
  on public.life_entries (player_id, created_at desc);

-- Generation run audit log
create table public.generation_runs (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.player_profiles(id) on delete cascade,
  trigger_type text not null check (trigger_type in ('first_run', 'snapshot_change', 'ambient')),
  input_summary jsonb not null default '{}'::jsonb,
  output_summary jsonb not null default '{}'::jsonb,
  tokens_used integer,
  success boolean not null default true,
  error_message text,
  created_at timestamptz not null default now()
);

create index generation_runs_player_created_idx
  on public.generation_runs (player_id, created_at desc);

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger player_profiles_updated_at
  before update on public.player_profiles
  for each row execute function public.set_updated_at();

-- RLS: service role only for MVP (no client-side DB access)
alter table public.player_profiles enable row level security;
alter table public.torn_snapshots enable row level security;
alter table public.life_entries enable row level security;
alter table public.generation_runs enable row level security;

-- No policies = only service role can access (server-side only)
