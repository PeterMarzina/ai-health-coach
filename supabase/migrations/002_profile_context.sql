-- Sprint 2: onboarding + AI profile object
-- Voeg een JSONB-kolom toe aan `profiles` voor het volledige AI-profiel
-- (ruwe onboarding-antwoorden + afgeleide kenmerken, zie src/types/aiProfile.ts).
-- Run dit in de Supabase SQL editor (of via `supabase db push` als je de CLI gebruikt).

alter table public.profiles
  add column if not exists profile_context jsonb;
