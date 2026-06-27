-- Life engine: persistent simulation state between Torn API and biography UI

alter table public.player_profiles
  add column if not exists life_engine_state jsonb not null default '{
    "variables": {},
    "rhythm": {},
    "windows": {},
    "updated_at": null
  }'::jsonb;

create table if not exists public.life_story_threads (
  id uuid primary key default gen_random_uuid(),
  player_profile_id uuid not null references public.player_profiles(id) on delete cascade,
  thread_key text not null,
  label text not null,
  status text not null default 'active'
    check (status in ('active', 'fading', 'dormant')),
  intensity numeric not null default 0,
  started_at timestamptz not null default now(),
  last_reinforced_at timestamptz not null default now(),
  evidence jsonb not null default '{}'::jsonb,
  unique (player_profile_id, thread_key)
);

create index life_story_threads_player_status_idx
  on public.life_story_threads (player_profile_id, status);

create table if not exists public.life_memory_beats (
  id uuid primary key default gen_random_uuid(),
  player_profile_id uuid not null references public.player_profiles(id) on delete cascade,
  recorded_at timestamptz not null default now(),
  window_key text not null,
  activity_key text not null,
  reality_line text not null,
  narrative_line text not null,
  tags text[] not null default '{}',
  intensity numeric not null default 1
);

create index life_memory_beats_player_time_idx
  on public.life_memory_beats (player_profile_id, recorded_at desc);

alter table public.life_story_threads enable row level security;
alter table public.life_memory_beats enable row level security;
