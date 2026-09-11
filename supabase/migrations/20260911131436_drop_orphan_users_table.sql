-- Verweesde tabel public."Users" opruimen.
--
-- Kolommen (id, created_at, "Username"), 0 rijen, RLS aan zonder ook maar één
-- policy, en nergens in de app-code gebruikt — de echte gebruikerstabel is
-- public.profiles. Restant van een Supabase-quickstart. Stond als INFO-melding
-- in de security advisor: "RLS Enabled No Policy".
--
-- Toegepast op productie via de Supabase MCP (apply_migration) op 2026-09-11;
-- de bestandsnaam volgt de daar geregistreerde versie.
drop table if exists public."Users";
