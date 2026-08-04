-- Habit tracker (Deel B1/B5): habits + habit_entries
-- Zelfde RLS-patroon als workout_sessions/workout_sets (004_workout_system.sql):
-- `habits` heeft een eigen user_id (auth.uid() = user_id), `habit_entries`
-- heeft dat niet en wordt gescoped via een exists-join op de parent-habit.

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default 'target',
  color_token text not null default 'accent',
  type text not null check (type in ('boolean', 'count')),
  target_value numeric,
  unit text,
  schedule_type text not null check (schedule_type in ('daily', 'times_per_week', 'weekdays')),
  schedule_days_per_week int,
  schedule_weekdays int[], -- 0 = zondag .. 6 = zaterdag (Date#getDay())
  reminder_enabled boolean not null default false,
  reminder_time text, -- 'HH:MM', 24-uurs
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint habits_target_matches_type check (
    (type = 'boolean' and target_value is null)
    or (type = 'count' and target_value is not null and target_value > 0)
  ),
  constraint habits_schedule_fields_match check (
    (schedule_type = 'daily' and schedule_days_per_week is null and schedule_weekdays is null)
    or (schedule_type = 'times_per_week' and schedule_days_per_week between 1 and 7 and schedule_weekdays is null)
    or (schedule_type = 'weekdays' and schedule_weekdays is not null and schedule_days_per_week is null)
  )
);

alter table public.habits enable row level security;

create policy "habits_manage_own"
  on public.habits for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.habits to authenticated;
create index if not exists habits_user_id_idx on public.habits(user_id);

create table if not exists public.habit_entries (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  date date not null,
  value numeric not null default 0,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, date) -- voorkomt dubbele entries voor dezelfde dag
);

alter table public.habit_entries enable row level security;

create policy "habit_entries_manage_own"
  on public.habit_entries for all
  to authenticated
  using (exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid()))
  with check (exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid()));

grant select, insert, update, delete on public.habit_entries to authenticated;
create index if not exists habit_entries_habit_date_idx on public.habit_entries(habit_id, date desc);
