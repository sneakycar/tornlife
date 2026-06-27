-- Trend tracking: build history from repeated polling + Torn events

-- Per-sync counter deltas (snapshot N vs N-1)
create table public.tracked_activity_counters (
  id uuid primary key default gen_random_uuid(),
  player_profile_id uuid not null references public.player_profiles(id) on delete cascade,
  snapshot_id uuid not null references public.torn_snapshots(id) on delete cascade,
  previous_snapshot_id uuid references public.torn_snapshots(id) on delete set null,
  recorded_at timestamptz not null default now(),
  window_kind text not null default 'sync_delta',
  counters jsonb not null default '{}'::jsonb,
  derived_tags text[] not null default '{}'
);

create index tracked_activity_counters_player_recorded_idx
  on public.tracked_activity_counters (player_profile_id, recorded_at desc);

-- Rolled-up activity windows
create table public.normalized_daily_activity (
  id uuid primary key default gen_random_uuid(),
  player_profile_id uuid not null references public.player_profiles(id) on delete cascade,
  activity_date date not null,
  counters jsonb not null default '{}'::jsonb,
  trend_tags text[] not null default '{}',
  updated_at timestamptz not null default now(),
  unique (player_profile_id, activity_date)
);

create table public.normalized_weekly_activity (
  id uuid primary key default gen_random_uuid(),
  player_profile_id uuid not null references public.player_profiles(id) on delete cascade,
  week_start date not null,
  counters jsonb not null default '{}'::jsonb,
  trend_tags text[] not null default '{}',
  updated_at timestamptz not null default now(),
  unique (player_profile_id, week_start)
);

create table public.normalized_monthly_activity (
  id uuid primary key default gen_random_uuid(),
  player_profile_id uuid not null references public.player_profiles(id) on delete cascade,
  month_start date not null,
  counters jsonb not null default '{}'::jsonb,
  trend_tags text[] not null default '{}',
  updated_at timestamptz not null default now(),
  unique (player_profile_id, month_start)
);

-- Cached Torn v2 events (paginated import)
create table public.torn_event_cache (
  torn_event_id text not null,
  player_profile_id uuid not null references public.player_profiles(id) on delete cascade,
  event_timestamp timestamptz not null,
  raw_text text not null,
  parsed_category text not null default 'unknown',
  parsed_tags text[] not null default '{}',
  fetched_at timestamptz not null default now(),
  primary key (player_profile_id, torn_event_id)
);

create index torn_event_cache_player_time_idx
  on public.torn_event_cache (player_profile_id, event_timestamp desc);

-- Biography entries with source evidence
create table public.biography_entries (
  id uuid primary key default gen_random_uuid(),
  player_profile_id uuid not null references public.player_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  display_text text not null,
  content_seed_id uuid references public.content_seeds(id) on delete set null,
  source_kind text not null,
  source_event_family text not null,
  source_torn_event_ids text[] not null default '{}',
  source_snapshot_id uuid references public.torn_snapshots(id) on delete set null,
  source_previous_snapshot_id uuid references public.torn_snapshots(id) on delete set null,
  source_summary jsonb not null default '{}'::jsonb,
  reality_tags text[] not null default '{}',
  archetype_tags text[] not null default '{}',
  identity_signals text[] not null default '{}',
  is_confirmed_canon boolean not null default false,
  feedback_status text not null default 'none'
);

create index biography_entries_player_created_idx
  on public.biography_entries (player_profile_id, created_at desc);

-- Extend content_seeds for reality-aware selection
alter table public.content_seeds
  add column if not exists required_reality_tags text[] not null default '{}',
  add column if not exists blocked_reality_tags text[] not null default '{}',
  add column if not exists specificity_level text not null default 'medium',
  add column if not exists allowed_source_kinds text[] not null default '{snapshot_delta,torn_event,state_condition,ambient_low_specificity}',
  add column if not exists identity_signals text[] not null default '{}';

create index content_seeds_reality_tags_gin
  on public.content_seeds using gin (required_reality_tags);

alter table public.tracked_activity_counters enable row level security;
alter table public.normalized_daily_activity enable row level security;
alter table public.normalized_weekly_activity enable row level security;
alter table public.normalized_monthly_activity enable row level security;
alter table public.torn_event_cache enable row level security;
alter table public.biography_entries enable row level security;
