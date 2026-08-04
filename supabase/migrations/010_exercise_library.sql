-- Gym tracker upgrade (Deel A2): oefeningenbibliotheek
-- Breidt de bestaande `exercises`-tabel (004_workout_system.sql) uit met
-- equipment + eigen oefeningen i.p.v. 'm te vervangen — workoutPlanGenerator.ts
-- en de bestaande workout-schermen blijven zo werken op `muscle_group`/`type`.

alter table public.exercises
  add column if not exists equipment text,
  add column if not exists is_custom boolean not null default false,
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists created_by_name text; -- laatst-gebruikt/favoriet-teller leeft client-side (AsyncStorage), geen server-kolom nodig

-- Eigen oefeningen horen bij een user; ingebouwde oefeningen niet.
alter table public.exercises
  add constraint exercises_custom_has_owner
    check (is_custom = false or user_id is not null);

-- Oude, te brede policy vervangen: gebruikers zien alle ingebouwde oefeningen
-- + hun eigen custom oefeningen, maar niet elkaars custom oefeningen.
drop policy if exists "exercises are readable by authenticated users" on public.exercises;

create policy "exercises_select_builtin_or_own"
  on public.exercises for select
  to authenticated
  using (is_custom = false or user_id = auth.uid());

create policy "exercises_insert_own_custom"
  on public.exercises for insert
  to authenticated
  with check (is_custom = true and user_id = auth.uid());

create policy "exercises_update_own_custom"
  on public.exercises for update
  to authenticated
  using (is_custom = true and user_id = auth.uid())
  with check (is_custom = true and user_id = auth.uid());

create policy "exercises_delete_own_custom"
  on public.exercises for delete
  to authenticated
  using (is_custom = true and user_id = auth.uid());

-- 006_workout_grants.sql gaf alleen select; nu ook insert/update/delete nodig
-- voor eigen oefeningen (zie toelichting in die migratie over ontbrekende
-- default-grants op tabellen aangemaakt via SQL-migraties).
grant insert, update, delete on public.exercises to authenticated;

create index if not exists exercises_user_id_idx on public.exercises(user_id) where user_id is not null;
create index if not exists exercises_muscle_group_idx on public.exercises(muscle_group);

-- Equipment backfillen voor de 19 bestaande seed-oefeningen (004_workout_system.sql).
update public.exercises set equipment = 'barbell' where name in
  ('Bench Press', 'Overhead Press', 'Deadlift', 'Barbell Row', 'Barbell Curl', 'Back Squat', 'Romanian Deadlift');
update public.exercises set equipment = 'dumbbell' where name in
  ('Incline Dumbbell Press', 'Walking Lunge');
update public.exercises set equipment = 'cable' where name in
  ('Triceps Pushdown', 'Lat Pulldown', 'Cable Crunch');
update public.exercises set equipment = 'bodyweight' where name in
  ('Push-Up', 'Pull-Up', 'Plank', 'Hanging Leg Raise');
update public.exercises set equipment = 'machine' where name in
  ('Leg Press', 'Leg Curl', 'Calf Raise');

-- Seed: nog eens ~49 oefeningen erbij (samen met de bestaande 19 ruim boven de
-- gevraagde 60), netjes verdeeld over chest/back/shoulders/arms/legs/core.
insert into public.exercises (name, muscle_group, type, equipment) values
  -- Chest (push)
  ('Cable Fly', 'chest', 'push', 'cable'),
  ('Chest Dip', 'chest', 'push', 'bodyweight'),
  ('Decline Bench Press', 'chest', 'push', 'barbell'),
  ('Dumbbell Bench Press', 'chest', 'push', 'dumbbell'),
  ('Pec Deck', 'chest', 'push', 'machine'),
  ('Machine Chest Press', 'chest', 'push', 'machine'),
  -- Shoulders (push, + 2 rear-delt pull-oefeningen)
  ('Lateral Raise', 'shoulders', 'push', 'dumbbell'),
  ('Front Raise', 'shoulders', 'push', 'dumbbell'),
  ('Arnold Press', 'shoulders', 'push', 'dumbbell'),
  ('Machine Shoulder Press', 'shoulders', 'push', 'machine'),
  ('Face Pull', 'shoulders', 'pull', 'cable'),
  ('Rear Delt Fly', 'shoulders', 'pull', 'dumbbell'),
  -- Arms: triceps (push)
  ('Skull Crusher', 'arms', 'push', 'barbell'),
  ('Overhead Triceps Extension', 'arms', 'push', 'dumbbell'),
  ('Close-Grip Bench Press', 'arms', 'push', 'barbell'),
  ('Triceps Dip', 'arms', 'push', 'bodyweight'),
  ('Cable Kickback', 'arms', 'push', 'cable'),
  -- Arms: biceps (pull)
  ('Hammer Curl', 'arms', 'pull', 'dumbbell'),
  ('Incline Dumbbell Curl', 'arms', 'pull', 'dumbbell'),
  ('Preacher Curl', 'arms', 'pull', 'barbell'),
  ('Cable Curl', 'arms', 'pull', 'cable'),
  ('Concentration Curl', 'arms', 'pull', 'dumbbell'),
  -- Back (pull)
  ('Chin-Up', 'back', 'pull', 'bodyweight'),
  ('Seated Cable Row', 'back', 'pull', 'cable'),
  ('T-Bar Row', 'back', 'pull', 'barbell'),
  ('Single-Arm Dumbbell Row', 'back', 'pull', 'dumbbell'),
  ('Straight-Arm Pulldown', 'back', 'pull', 'cable'),
  ('Machine Row', 'back', 'pull', 'machine'),
  ('Rack Pull', 'back', 'pull', 'barbell'),
  -- Legs
  ('Front Squat', 'legs', 'legs', 'barbell'),
  ('Hack Squat', 'legs', 'legs', 'machine'),
  ('Bulgarian Split Squat', 'legs', 'legs', 'dumbbell'),
  ('Goblet Squat', 'legs', 'legs', 'dumbbell'),
  ('Hip Thrust', 'legs', 'legs', 'barbell'),
  ('Glute Bridge', 'legs', 'legs', 'bodyweight'),
  ('Leg Extension', 'legs', 'legs', 'machine'),
  ('Seated Calf Raise', 'legs', 'legs', 'machine'),
  ('Standing Calf Raise', 'legs', 'legs', 'bodyweight'),
  ('Step-Up', 'legs', 'legs', 'dumbbell'),
  ('Sumo Deadlift', 'legs', 'legs', 'barbell'),
  ('Good Morning', 'legs', 'legs', 'barbell'),
  ('Hip Abduction', 'legs', 'legs', 'machine'),
  -- Core
  ('Russian Twist', 'core', 'core', 'bodyweight'),
  ('Bicycle Crunch', 'core', 'core', 'bodyweight'),
  ('Mountain Climber', 'core', 'core', 'bodyweight'),
  ('Ab Wheel Rollout', 'core', 'core', 'bodyweight'),
  ('Side Plank', 'core', 'core', 'bodyweight'),
  ('Sit-Up', 'core', 'core', 'bodyweight'),
  ('Woodchopper', 'core', 'core', 'cable')
on conflict (name) do nothing;
