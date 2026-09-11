-- Vervolg op revoke_rls_auto_enable_execute: Postgres geeft EXECUTE op functies
-- standaard aan de rol PUBLIC, en anon/authenticated erven dat. Alleen bij die
-- twee rollen intrekken deed dus niets — has_function_privilege('anon', ...)
-- bleef true. Daarom hier ook expliciet van PUBLIC intrekken.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
