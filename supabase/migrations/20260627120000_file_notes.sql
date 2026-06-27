-- Accumulating dossier file notes (append-only character file)
alter table public.player_profiles
  add column if not exists file_notes jsonb not null default '[]'::jsonb;
