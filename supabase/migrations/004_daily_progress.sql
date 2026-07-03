-- Sprint 3: daily habit loop — streak, XP en dagelijkse voortgang
-- streak_days / xp_total / last_active_date leven op `profiles` (cumulatief,
-- net als goals/measurements/profile_context). `daily_progress` bewaart de
-- acties per kalenderdag (workout/stappen/water) zodat de dagscore en
-- focus-lijst na een herstart of op een ander toestel blijven kloppen.
-- Run dit in de Supabase SQL editor (of via `supabase db push` als je de CLI gebruikt).

alter table public.profiles
  add column if not exists streak_days integer not null default 0,
  add column if not exists xp_total integer not null default 0,
  add column if not exists last_active_date date;

create table if not exists public.daily_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  workout_done boolean not null default false,
  steps integer not null default 0,
  water_l numeric not null default 0,
  xp_awarded jsonb not null default '{"workout": false, "steps": false, "water": false}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.daily_progress enable row level security;

create policy "Users can view their own daily progress"
  on public.daily_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert their own daily progress"
  on public.daily_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own daily progress"
  on public.daily_progress for update
  using (auth.uid() = user_id);

-- LET OP: tabellen aangemaakt door de `postgres`-rol (SQL editor / migraties) krijgen
-- geen automatische select/insert/update-rechten voor anon/authenticated (zie
-- pg_default_acl) — alleen delete/truncate/references/trigger. Zonder deze GRANT
-- krijgt elke request een 403 nog vóór RLS wordt geëvalueerd (ontdekt tijdens het
-- debuggen van Sprint 5, zie 005_nutrition_recovery.sql voor dezelfde toelichting).
grant select, insert, update on public.daily_progress to authenticated;
