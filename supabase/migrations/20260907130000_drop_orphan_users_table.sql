-- Verweesde tabel public."Users" opruimen.
--
-- Kolommen (id, created_at, "Username"), 0 rijen, RLS aan zonder ook maar één
-- policy, en nergens in de app-code gebruikt — de echte gebruikerstabel is
-- public.profiles. Restant van een Supabase-quickstart. Stond als INFO-melding
-- in de security advisor: "RLS Enabled No Policy".
--
-- NOG NIET TOEGEPAST op de live database. Draai `npx supabase db push` om dit
-- uit te voeren (zie het commando in het antwoord / README).
drop table if exists public."Users";
