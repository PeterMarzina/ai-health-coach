-- Gym tracker upgrade (Deel A3): routines/templates
-- Een routine is een geordende lijst oefeningen met doel-sets/reps. Twee
-- soorten rijen delen dezelfde tabel: "templates" (is_template = true,
-- user_id = null, door ons geseed, zichtbaar voor iedereen) en gewone
-- user-routines (is_template = false, user_id = eigenaar) — bv. een
-- afgeronde sessie die je opslaat als eigen routine (zie A3).

create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  is_template boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint routines_user_or_template check (is_template = true or user_id is not null)
);

alter table public.routines enable row level security;

create policy "routines_select_own_or_template"
  on public.routines for select
  to authenticated
  using (is_template = true or user_id = auth.uid());

create policy "routines_insert_own"
  on public.routines for insert
  to authenticated
  with check (is_template = false and user_id = auth.uid());

create policy "routines_update_own"
  on public.routines for update
  to authenticated
  using (is_template = false and user_id = auth.uid())
  with check (is_template = false and user_id = auth.uid());

create policy "routines_delete_own"
  on public.routines for delete
  to authenticated
  using (is_template = false and user_id = auth.uid());

grant select, insert, update, delete on public.routines to authenticated;
create index if not exists routines_user_id_idx on public.routines(user_id);

create table if not exists public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  position int not null default 0,
  target_sets int not null default 3,
  target_reps text not null default '8-12',
  target_rest_seconds int not null default 90,
  set_type text not null default 'normal' check (set_type in ('normal', 'warmup', 'drop', 'failure'))
);

alter table public.routine_exercises enable row level security;

create policy "routine_exercises_select"
  on public.routine_exercises for select
  to authenticated
  using (exists (
    select 1 from public.routines r
    where r.id = routine_id and (r.is_template or r.user_id = auth.uid())
  ));

create policy "routine_exercises_write_own"
  on public.routine_exercises for all
  to authenticated
  using (exists (
    select 1 from public.routines r where r.id = routine_id and r.user_id = auth.uid() and not r.is_template
  ))
  with check (exists (
    select 1 from public.routines r where r.id = routine_id and r.user_id = auth.uid() and not r.is_template
  ));

grant select, insert, update, delete on public.routine_exercises to authenticated;
create index if not exists routine_exercises_routine_id_idx on public.routine_exercises(routine_id);

-- Seed: 3 voorbeeld-programma's. "Push/Pull/Legs" en "Upper/Lower" zijn elk
-- meerdaagse splits — met ons datamodel (1 routine = 1 sessie) worden dat dus
-- 3 resp. 2 losse routine-rijen; samen met "Full Body" is dat 6 kant-en-klare
-- routines uit 3 programma's (zie DECISIONS.md).
do $$
declare
  r_full_body uuid;
  r_push uuid;
  r_pull uuid;
  r_legs uuid;
  r_upper uuid;
  r_lower uuid;
begin
  -- Geen natuurlijke unique key op routines.name; deze guard houdt de seed
  -- idempotent zodat een herrun van de migratie geen dubbele templates maakt.
  if exists (select 1 from public.routines where is_template = true) then
    raise notice 'Routine templates seed overgeslagen (al aanwezig)';
    return;
  end if;

  insert into public.routines (name, is_template) values ('Full Body', true) returning id into r_full_body;
  insert into public.routines (name, is_template) values ('Push Day', true) returning id into r_push;
  insert into public.routines (name, is_template) values ('Pull Day', true) returning id into r_pull;
  insert into public.routines (name, is_template) values ('Leg Day', true) returning id into r_legs;
  insert into public.routines (name, is_template) values ('Upper Body', true) returning id into r_upper;
  insert into public.routines (name, is_template) values ('Lower Body', true) returning id into r_lower;

  insert into public.routine_exercises (routine_id, exercise_id, position, target_sets, target_reps)
  select r_full_body, e.id, t.pos, t.sets, t.reps from (values
    ('Back Squat', 0, 3, '8-12'),
    ('Bench Press', 1, 3, '8-12'),
    ('Barbell Row', 2, 3, '8-12'),
    ('Overhead Press', 3, 3, '8-12'),
    ('Romanian Deadlift', 4, 3, '10-12'),
    ('Hanging Leg Raise', 5, 3, '12-15')
  ) as t(ex_name, pos, sets, reps)
  join public.exercises e on e.name = t.ex_name;

  insert into public.routine_exercises (routine_id, exercise_id, position, target_sets, target_reps)
  select r_push, e.id, t.pos, t.sets, t.reps from (values
    ('Bench Press', 0, 4, '6-10'),
    ('Overhead Press', 1, 3, '8-12'),
    ('Incline Dumbbell Press', 2, 3, '8-12'),
    ('Lateral Raise', 3, 3, '12-15'),
    ('Triceps Pushdown', 4, 3, '12-15'),
    ('Cable Fly', 5, 3, '12-15')
  ) as t(ex_name, pos, sets, reps)
  join public.exercises e on e.name = t.ex_name;

  insert into public.routine_exercises (routine_id, exercise_id, position, target_sets, target_reps)
  select r_pull, e.id, t.pos, t.sets, t.reps from (values
    ('Deadlift', 0, 4, '5-8'),
    ('Pull-Up', 1, 3, '6-10'),
    ('Barbell Row', 2, 3, '8-12'),
    ('Lat Pulldown', 3, 3, '10-12'),
    ('Barbell Curl', 4, 3, '10-12'),
    ('Face Pull', 5, 3, '15-20')
  ) as t(ex_name, pos, sets, reps)
  join public.exercises e on e.name = t.ex_name;

  insert into public.routine_exercises (routine_id, exercise_id, position, target_sets, target_reps)
  select r_legs, e.id, t.pos, t.sets, t.reps from (values
    ('Back Squat', 0, 4, '6-10'),
    ('Romanian Deadlift', 1, 3, '8-10'),
    ('Leg Press', 2, 3, '10-12'),
    ('Walking Lunge', 3, 3, '10-12'),
    ('Leg Curl', 4, 3, '12-15'),
    ('Calf Raise', 5, 4, '12-15')
  ) as t(ex_name, pos, sets, reps)
  join public.exercises e on e.name = t.ex_name;

  insert into public.routine_exercises (routine_id, exercise_id, position, target_sets, target_reps)
  select r_upper, e.id, t.pos, t.sets, t.reps from (values
    ('Bench Press', 0, 3, '8-10'),
    ('Barbell Row', 1, 3, '8-10'),
    ('Overhead Press', 2, 3, '8-12'),
    ('Lat Pulldown', 3, 3, '10-12'),
    ('Barbell Curl', 4, 3, '10-12'),
    ('Triceps Pushdown', 5, 3, '10-12')
  ) as t(ex_name, pos, sets, reps)
  join public.exercises e on e.name = t.ex_name;

  insert into public.routine_exercises (routine_id, exercise_id, position, target_sets, target_reps)
  select r_lower, e.id, t.pos, t.sets, t.reps from (values
    ('Front Squat', 0, 4, '6-10'),
    ('Hip Thrust', 1, 3, '8-12'),
    ('Leg Press', 2, 3, '10-12'),
    ('Leg Extension', 3, 3, '12-15'),
    ('Leg Curl', 4, 3, '12-15'),
    ('Standing Calf Raise', 5, 4, '12-15')
  ) as t(ex_name, pos, sets, reps)
  join public.exercises e on e.name = t.ex_name;
end $$;
