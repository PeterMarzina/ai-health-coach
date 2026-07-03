-- Sprint 7: weight history (voor de gewicht-grafiek op Progress)
-- `profiles.measurements` bewaart alleen het huidige gewicht (snapshot), geen
-- geschiedenis. Deze tabel logt gewicht per dag zodat de Progress-grafiek een
-- echte trend kan tonen i.p.v. mock-data. Zelfde patroon als daily_logs
-- (005_nutrition_recovery.sql): composite PK (user_id, date), dus bij een
-- 2e meting op dezelfde dag overschrijf je die dag (upsert), geen dubbele rijen.

create table if not exists public.weight_logs (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  weight_kg numeric not null,
  created_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.weight_logs enable row level security;

create policy "weight_logs_select_own" on public.weight_logs
  for select using (auth.uid() = user_id);
create policy "weight_logs_insert_own" on public.weight_logs
  for insert with check (auth.uid() = user_id);
create policy "weight_logs_update_own" on public.weight_logs
  for update using (auth.uid() = user_id);

-- Zelfde reden als in 005_nutrition_recovery.sql: tabellen aangemaakt via een
-- migratie krijgen geen automatische GRANT voor anon/authenticated.
grant select, insert, update on public.weight_logs to authenticated;
