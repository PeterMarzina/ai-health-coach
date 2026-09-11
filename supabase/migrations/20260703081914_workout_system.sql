-- Sprint 4: workout system
-- Oefeningen-database (referentiedata), workout-sessies (start/stop),
-- de oefeningen die bij een sessie horen (het gegenereerde plan), en de
-- gelogde sets (reps/gewicht) — de basis voor de progressive-overload view.

-- Oefeningen-database: alleen leesbaar voor gebruikers, gevuld via de seed hieronder.
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  muscle_group text not null,   -- bv. chest, back, shoulders, arms, legs, core
  type text not null,           -- bv. push, pull, legs, core (gebruikt door de plan-generator)
  created_at timestamptz not null default now()
);

alter table public.exercises enable row level security;

create policy "exercises are readable by authenticated users"
  on public.exercises for select
  to authenticated
  using (true);

-- Workout-sessies: het starten/stoppen van een training.
create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,          -- bv. "Push Day", "Full Body"
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.workout_sessions enable row level security;

create policy "users manage their own workout sessions"
  on public.workout_sessions for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists workout_sessions_user_id_idx on public.workout_sessions(user_id);

-- De oefeningen die bij een sessie horen (het gegenereerde plan), in volgorde.
create table if not exists public.workout_session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  position int not null default 0,
  target_sets int not null default 3,
  target_reps text not null default '8-12'
);

alter table public.workout_session_exercises enable row level security;

create policy "users manage exercises of their own sessions"
  on public.workout_session_exercises for all
  to authenticated
  using (exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and s.user_id = auth.uid()
  ));

create index if not exists workout_session_exercises_session_id_idx on public.workout_session_exercises(session_id);

-- Gelogde sets: reps/gewicht per oefening per sessie. Dit voedt de
-- progressive-overload view (historisch overzicht per oefening).
create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  set_number int not null,
  reps int not null,
  weight_kg numeric not null,
  completed_at timestamptz not null default now()
);

alter table public.workout_sets enable row level security;

create policy "users manage sets of their own sessions"
  on public.workout_sets for all
  to authenticated
  using (exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and s.user_id = auth.uid()
  ));

create index if not exists workout_sets_session_id_idx on public.workout_sets(session_id);
create index if not exists workout_sets_exercise_id_idx on public.workout_sets(exercise_id);

-- Seed: basis oefeningenlijst, gegroepeerd per type zodat de plan-generator
-- (src/services/workoutPlanGenerator.ts) er push/pull/legs/full-body templates uit kan bouwen.
insert into public.exercises (name, muscle_group, type) values
  ('Bench Press', 'chest', 'push'),
  ('Overhead Press', 'shoulders', 'push'),
  ('Incline Dumbbell Press', 'chest', 'push'),
  ('Triceps Pushdown', 'arms', 'push'),
  ('Push-Up', 'chest', 'push'),
  ('Deadlift', 'back', 'pull'),
  ('Pull-Up', 'back', 'pull'),
  ('Barbell Row', 'back', 'pull'),
  ('Lat Pulldown', 'back', 'pull'),
  ('Barbell Curl', 'arms', 'pull'),
  ('Back Squat', 'legs', 'legs'),
  ('Romanian Deadlift', 'legs', 'legs'),
  ('Leg Press', 'legs', 'legs'),
  ('Walking Lunge', 'legs', 'legs'),
  ('Leg Curl', 'legs', 'legs'),
  ('Calf Raise', 'legs', 'legs'),
  ('Plank', 'core', 'core'),
  ('Hanging Leg Raise', 'core', 'core'),
  ('Cable Crunch', 'core', 'core')
on conflict (name) do nothing;
