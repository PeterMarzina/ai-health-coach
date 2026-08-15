-- 016_revoke_rls_auto_enable_execute.sql — security-advisor melding wegnemen.
--
-- `public.rls_auto_enable()` is een event-trigger-functie (zet automatisch RLS aan
-- op nieuwe tabellen in public). Hij stond met `execute` open voor anon en
-- authenticated, waardoor de Supabase-linter hem meldde als een SECURITY DEFINER
-- functie die door de buitenwereld aan te roepen is via /rest/v1/rpc/.
--
-- In de praktijk is dat niet exploitabel: de functie heeft returntype `event_trigger`
-- en Postgres weigert zo'n functie rechtstreeks aan te roepen. Maar het recht heeft
-- geen enkel nut, dus weg ermee.
--
-- Dit raakt de event trigger zelf niet: die draait op eigen gezag bij DDL en heeft
-- geen execute-grant op de functie nodig (na deze migratie geverifieerd: de trigger
-- staat nog gewoon actief in pg_event_trigger).
--
-- Let op de rol `public` in de revoke hieronder: Postgres geeft EXECUTE op functies
-- standaard aan PUBLIC, en anon/authenticated erven dat. Alleen bij die twee rollen
-- intrekken doet dus niets — has_function_privilege('anon', ...) bleef gewoon true.

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
