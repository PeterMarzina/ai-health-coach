-- Gym tracker upgrade (Deel A1/A3/A4): actieve sessie, rusttimer, set-types
-- Breidt de bestaande workout-tabellen (004_workout_system.sql) uit i.p.v. de
-- richtlijn-namen `session_exercises`/`sets` uit AGENTS.md te gebruiken — zie
-- DECISIONS.md ("bestaande workout-tabellen uitgebreid, niet vervangen").

-- Welke routine een sessie startte (null = "lege workout" of AI-coach-plan).
alter table public.workout_sessions
  add column if not exists routine_id uuid references public.routines(id) on delete set null;

-- Doel-rusttijd per oefening in een sessie, voor de auto-start rusttimer (A1).
alter table public.workout_session_exercises
  add column if not exists target_rest_seconds int not null default 90;

-- Set-types (A1): warming-up telt niet mee in PR's/volume (is_warmup, af te
-- leiden uit set_type, hieronder als generated column voor snelle filters).
alter table public.workout_sets
  add column if not exists set_type text not null default 'normal'
    check (set_type in ('normal', 'warmup', 'drop', 'failure')),
  add column if not exists is_warmup boolean generated always as (set_type = 'warmup') stored;

-- Denormaliseer user_id op workout_sets: de belangrijkste query van dit hele
-- systeem is "geef de laatste set van oefening X voor deze user" (A5) — zonder
-- eigen user_id-kolom moet dat via een join met workout_sessions op elke rij.
-- Met de kolom + onderstaande index is dat een directe index-scan, en kan de
-- RLS-policy ook simpelweg `auth.uid() = user_id` zijn i.p.v. een exists-join.
alter table public.workout_sets
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

update public.workout_sets ws
  set user_id = s.user_id
  from public.workout_sessions s
  where ws.session_id = s.id and ws.user_id is null;

alter table public.workout_sets
  alter column user_id set not null;

drop policy if exists "users manage sets of their own sessions" on public.workout_sets;

create policy "workout_sets_manage_own"
  on public.workout_sets for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- De query uit A5: laatste (of beste) set van oefening X voor deze user.
create index if not exists workout_sets_user_exercise_completed_idx
  on public.workout_sets (user_id, exercise_id, completed_at desc);
