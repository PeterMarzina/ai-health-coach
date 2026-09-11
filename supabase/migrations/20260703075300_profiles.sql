-- Baseline: public.profiles — de kerntabel van de app.
--
-- Deze tabel is ooit met de hand via het Supabase-dashboard aangemaakt en had
-- daardoor nooit een migratie. Gereconstrueerd uit de live database (7 sep 2026)
-- zodat een leeg project weer vanaf nul opgebouwd kan worden. Alle latere
-- migraties (profile_context, username, streak/xp) bouwen hierop voort.
--
-- LET OP — twee dingen hieronder zijn bewust exact overgenomen van de live
-- database en zijn géén aanbeveling:
--   1. De zeven policies zijn deels duplicaten van elkaar (dashboard-template +
--      later met de hand toegevoegd). "Manage own profile" (for all) maakt de
--      andere zes overbodig. Opruimen kan, maar dat is een aparte beslissing.
--   2. `anon` heeft volledige DML-rechten. Dat is de standaard die het dashboard
--      zet bij een tabel die je via de UI aanmaakt; alleen RLS houdt anonieme
--      gebruikers hier tegen. Aanbevolen vervolgstap: intrekken.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  updated_at timestamptz,
  full_name text,
  health_goal text,
  goals jsonb,
  measurements jsonb,
  profile_context jsonb,
  username text unique,
  streak_days integer not null default 0,
  xp_total integer not null default 0,
  last_active_date date
);

alter table public.profiles enable row level security;

create policy "Manage own profile" on public.profiles
  for all to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can view their own profile." on public.profiles
  for select using (auth.uid() = id);
create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);
create policy "Users can update their own profile." on public.profiles
  for update using (auth.uid() = id);

grant all on public.profiles to anon, authenticated;
grant truncate, references, trigger on public.profiles to service_role;
