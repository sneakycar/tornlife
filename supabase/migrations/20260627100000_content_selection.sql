-- TORN LIFE: precomputed content selection architecture
-- Live app selects approved rows; no runtime prose generation.

-- Approved narrative content library
create table public.content_seeds (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  content_type text not null,
  event_family text not null,
  archetype_tags text[] not null default '{}',
  state_tags text[] not null default '{}',
  required_tags text[] not null default '{}',
  blocked_tags text[] not null default '{}',
  canon_required_tags text[] not null default '{}',
  canon_blocked_tags text[] not null default '{}',
  tone_tags text[] not null default '{}',
  meter_min jsonb not null default '{}'::jsonb,
  meter_max jsonb not null default '{}'::jsonb,
  weight integer not null default 100,
  rarity text not null default 'common',
  repeat_cooldown_days integer not null default 30,
  global_cooldown_days integer not null default 0,
  quality_score integer not null default 50,
  approved boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_seeds_text_nonempty check (char_length(trim(text)) > 0),
  constraint content_seeds_quality_range check (quality_score between 0 and 100)
);

create unique index content_seeds_text_unique_idx on public.content_seeds (text);

create index content_seeds_content_type_idx on public.content_seeds (content_type);
create index content_seeds_event_family_idx on public.content_seeds (event_family);
create index content_seeds_approved_active_idx on public.content_seeds (approved, active);
create index content_seeds_rarity_idx on public.content_seeds (rarity);
create index content_seeds_quality_score_idx on public.content_seeds (quality_score);
create index content_seeds_archetype_tags_gin on public.content_seeds using gin (archetype_tags);
create index content_seeds_state_tags_gin on public.content_seeds using gin (state_tags);
create index content_seeds_required_tags_gin on public.content_seeds using gin (required_tags);
create index content_seeds_blocked_tags_gin on public.content_seeds using gin (blocked_tags);
create index content_seeds_canon_required_tags_gin on public.content_seeds using gin (canon_required_tags);
create index content_seeds_canon_blocked_tags_gin on public.content_seeds using gin (canon_blocked_tags);
create index content_seeds_tone_tags_gin on public.content_seeds using gin (tone_tags);

create trigger content_seeds_updated_at
  before update on public.content_seeds
  for each row execute function public.set_updated_at();

-- Player selection history (immutable display copy)
create table public.selected_content_history (
  id uuid primary key default gen_random_uuid(),
  player_profile_id uuid not null references public.player_profiles(id) on delete cascade,
  content_seed_id uuid references public.content_seeds(id) on delete set null,
  selected_at timestamptz not null default now(),
  content_type text not null,
  event_family text not null,
  selection_context jsonb not null default '{}'::jsonb,
  display_text text not null,
  was_pinned_canon boolean not null default false,
  feedback_status text not null default 'none'
);

create index selected_content_history_player_idx
  on public.selected_content_history (player_profile_id);
create index selected_content_history_seed_idx
  on public.selected_content_history (content_seed_id);
create index selected_content_history_selected_at_idx
  on public.selected_content_history (selected_at desc);
create index selected_content_history_player_selected_idx
  on public.selected_content_history (player_profile_id, selected_at desc);

-- Player selection preferences (runtime tag/archetype state)
alter table public.player_profiles
  add column if not exists secondary_archetypes text[] not null default '{}',
  add column if not exists emerging_archetypes text[] not null default '{}',
  add column if not exists archetype_scores jsonb not null default '{}'::jsonb,
  add column if not exists player_tags text[] not null default '{}',
  add column if not exists canon_tags text[] not null default '{}',
  add column if not exists blocked_tags text[] not null default '{}',
  add column if not exists preferred_tags text[] not null default '{}';

alter table public.life_entries
  drop constraint if exists life_entries_entry_type_check;

alter table public.life_entries
  add constraint life_entries_entry_type_check
  check (entry_type in ('assessment', 'reactive', 'ambient', 'initial', 'selected'));

alter table public.generation_runs
  drop constraint if exists generation_runs_trigger_type_check;

alter table public.generation_runs
  add constraint generation_runs_trigger_type_check
  check (trigger_type in (
    'first_run', 'snapshot_change', 'ambient', 'assessment',
    'lock', 'rewrite', 'feedback', 'selection'
  ));

alter table public.content_seeds enable row level security;
alter table public.selected_content_history enable row level security;
