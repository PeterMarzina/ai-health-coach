-- Sprint 5: nutrition (meal logging) + recovery (sleep/training load) tracking
-- Twee nieuwe tabellen, elk met RLS zodat gebruikers alleen hun eigen rijen zien/wijzigen.
-- Water tellen gebeurt al in `daily_progress` (Sprint 3, zie 004_daily_progress.sql) —
-- bewust niet opnieuw hier, om geen twee bronnen van waarheid voor water te krijgen.

-- meal_logs: één rij per handmatig gelogde maaltijd.
create table if not exists public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  name text not null,
  calories int not null default 0,
  protein_g int not null default 0,
  carbs_g int not null default 0,
  fats_g int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.meal_logs enable row level security;

create policy "meal_logs_select_own" on public.meal_logs
  for select using (auth.uid() = user_id);
create policy "meal_logs_insert_own" on public.meal_logs
  for insert with check (auth.uid() = user_id);
create policy "meal_logs_delete_own" on public.meal_logs
  for delete using (auth.uid() = user_id);

-- LET OP: tabellen aangemaakt door de `postgres`-rol (SQL editor / migraties)
-- krijgen GEEN automatische select/insert/update-rechten voor anon/authenticated
-- (pg_default_acl voor `postgres` in schema public geeft alleen delete/truncate/
-- references/trigger). RLS-policies alleen zijn dus niet genoeg — zonder deze
-- GRANT krijgt elke request een 403, nog vóór RLS wordt geëvalueerd. Tabellen
-- aangemaakt via de Supabase Studio Table Editor (rol `supabase_admin`) hebben
-- dit probleem niet, vandaar dat het alleen de SQL-migratie-tabellen raakte.
grant select, insert, delete on public.meal_logs to authenticated;

create index if not exists meal_logs_user_date_idx on public.meal_logs (user_id, date);

-- daily_logs: één rij per gebruiker per dag met slaap/trainingsbelasting/herstelscore.
create table if not exists public.daily_logs (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  sleep_hours numeric,
  sleep_quality int,
  training_load int,
  resting_heart_rate int,
  recovery_score int,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.daily_logs enable row level security;

create policy "daily_logs_select_own" on public.daily_logs
  for select using (auth.uid() = user_id);
create policy "daily_logs_insert_own" on public.daily_logs
  for insert with check (auth.uid() = user_id);
create policy "daily_logs_update_own" on public.daily_logs
  for update using (auth.uid() = user_id);

-- Zelfde reden als bij meal_logs hierboven.
grant select, insert, update on public.daily_logs to authenticated;
