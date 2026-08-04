-- Gym tracker upgrade (Deel A4): PR-detectie
-- Append-only log: bij het afronden van een sessie vergelijkt de app (zie
-- src/services/personalRecords.ts) de nieuwe top-sets met de historische
-- bests en schrijft bij verbetering een nieuwe rij weg. Geen "huidig record"-
-- upsert-tabel, want "meeste reps bij een gewicht" heeft geen zinvolle unieke
-- sleutel per oefening (dat verschilt per gewicht).

create table if not exists public.personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  session_id uuid references public.workout_sessions(id) on delete set null,
  record_type text not null check (record_type in ('max_weight', 'max_1rm', 'max_reps_at_weight')),
  weight_kg numeric not null,
  reps int not null,
  estimated_1rm numeric not null,
  achieved_at timestamptz not null default now()
);

alter table public.personal_records enable row level security;

create policy "personal_records_select_own"
  on public.personal_records for select
  to authenticated
  using (auth.uid() = user_id);

create policy "personal_records_insert_own"
  on public.personal_records for insert
  to authenticated
  with check (auth.uid() = user_id);

grant select, insert on public.personal_records to authenticated;

create index if not exists personal_records_user_exercise_idx
  on public.personal_records (user_id, exercise_id, record_type, achieved_at desc);
