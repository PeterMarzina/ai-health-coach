-- Gebruikersnaam-login zonder e-mailadressen te lekken.
--
-- get_email_by_username (security definer) was uitvoerbaar voor anon en authenticated:
-- iedereen met de publieke app-key kon een gebruikersnaam omzetten naar een e-mailadres.
-- Nu:
--   * get_email_by_username: alleen nog service_role (gebruikt door de Edge Function
--     username-login, die de hele login server-side doet).
--   * is_username_available: nieuwe RPC voor de beschikbaarheidscheck in onboarding.
--     Geeft alleen true/false terug, en telt de eigen naam van de aanroeper als vrij.
--
-- Toegepast op productie via de Supabase MCP (apply_migration) op 2026-09-11.

create or replace function public.is_username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1
    from auth.users u
    left join public.profiles p on p.id = u.id
    where lower(coalesce(p.username, u.raw_user_meta_data ->> 'username')) = lower(trim(p_username))
      and u.id is distinct from auth.uid()
  );
$$;

-- Functies krijgen standaard EXECUTE voor PUBLIC (zie 20260815095603); daarom expliciet.
revoke execute on function public.is_username_available(text) from public, anon;
grant execute on function public.is_username_available(text) to authenticated;

revoke execute on function public.get_email_by_username(text) from public, anon, authenticated;
grant execute on function public.get_email_by_username(text) to service_role;
