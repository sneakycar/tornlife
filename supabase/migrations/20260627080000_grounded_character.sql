-- Ground character in real game: facts + interpretation layers

alter table public.player_profiles
  add column if not exists character_facts jsonb,
  add column if not exists interpretation_state jsonb;
