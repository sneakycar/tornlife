-- Character Agency & Calibration Addendum

-- Player profile calibration fields
alter table public.player_profiles
  add column if not exists character_locked boolean not null default false,
  add column if not exists calibration_notes jsonb not null default '[]'::jsonb,
  add column if not exists assessment_version integer not null default 1,
  add column if not exists assessment_data jsonb,
  add column if not exists civilian_name text;

-- Life entry feedback & canon fields
alter table public.life_entries
  add column if not exists feedback_status text not null default 'none',
  add column if not exists superseded_by uuid references public.life_entries(id),
  add column if not exists feedback_notes jsonb not null default '[]'::jsonb,
  add column if not exists is_canon boolean not null default false,
  add column if not exists source_type text,
  add column if not exists source_summary jsonb,
  add column if not exists tone_tags jsonb not null default '[]'::jsonb;

alter table public.life_entries
  drop constraint if exists life_entries_feedback_status_check;

alter table public.life_entries
  add constraint life_entries_feedback_status_check
  check (feedback_status in (
    'none', 'kept', 'rejected', 'superseded',
    'rewritten', 'positive_example', 'negative_example'
  ));

alter table public.life_entries
  drop constraint if exists life_entries_entry_type_check;

alter table public.life_entries
  add constraint life_entries_entry_type_check
  check (entry_type in ('assessment', 'reactive', 'ambient', 'initial'));

-- Entry feedback audit table
create table if not exists public.entry_feedback (
  id uuid primary key default gen_random_uuid(),
  life_entry_id uuid not null references public.life_entries(id) on delete cascade,
  player_profile_id uuid not null references public.player_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  feedback_type text not null,
  feedback_note text,
  applied boolean not null default false,
  resulting_entry_id uuid references public.life_entries(id),
  state_patch jsonb
);

create index if not exists entry_feedback_entry_idx
  on public.entry_feedback (life_entry_id, created_at desc);

create index if not exists entry_feedback_player_idx
  on public.entry_feedback (player_profile_id, created_at desc);

alter table public.entry_feedback enable row level security;

-- Expand generation run trigger types
alter table public.generation_runs
  drop constraint if exists generation_runs_trigger_type_check;

alter table public.generation_runs
  add constraint generation_runs_trigger_type_check
  check (trigger_type in (
    'first_run', 'snapshot_change', 'ambient',
    'assessment', 'lock', 'rewrite', 'feedback'
  ));
