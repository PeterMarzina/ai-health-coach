-- Opruimen van profiles: rechten en dubbele policies (zie LET OP in 20260703075300_profiles.sql).
--
-- 1. anon had volledige DML-rechten (dashboard-standaard). Alleen RLS hield niet-ingelogde
--    gebruikers tegen; valt RLS ooit per ongeluk weg, dan ligt alles open. De app leest
--    profiles pas na inloggen, dus anon heeft hier niets te zoeken.
-- 2. authenticated had ook TRUNCATE/REFERENCES/TRIGGER — TRUNCATE negeert RLS. Niet nodig.
-- 3. Zes policies dubbelden "Manage own profile" (for all, auth.uid() = id) en golden
--    bovendien voor de rol public (dus ook anon). Weg ermee.
--
-- Toegepast op productie via de Supabase MCP (apply_migration) op 2026-09-11.

revoke all on public.profiles from anon;
revoke truncate, references, trigger on public.profiles from authenticated;

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can view their own profile." on public.profiles;
drop policy if exists "Users can insert their own profile." on public.profiles;
drop policy if exists "Users can update their own profile." on public.profiles;
