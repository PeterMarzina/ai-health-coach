-- 015_ai_coach_calls.sql — per-user rate limit voor de ai-coach Edge Function.
--
-- Waarom: de NVIDIA-key is één gedeelde sleutel (Supabase secret), niet één per
-- persoon. Zonder teller kan één account het quotum van het hele team opmaken.
-- `product-lookup` had deze bescherming al (`product_lookup_calls`, migratie 009);
-- `ai-coach` niet — terwijl dát juist de functie is die een betaalde API aanroept.
--
-- Zelfde opzet als product_lookup_calls: append-only teller, alleen door de
-- Edge Function geschreven met de service-role key. De gebruiker mag zijn eigen
-- rijen lezen (voor eventuele "je hebt X van Y verzoeken over"-UI), maar niet
-- schrijven of verwijderen — anders kan hij zijn eigen limiet resetten.
--
-- Twee vensters, want per-minuut alleen is niet genoeg bij een betaalde API:
--   * burst  — max 10 per minuut (voorkomt loops/dubbelklikken)
--   * budget — max 100 per dag  (voorkomt dat één account de maandkosten opdrijft)

create table if not exists public.ai_coach_calls (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  called_at timestamptz not null default now()
);

alter table public.ai_coach_calls enable row level security;

-- Bewust alleen SELECT: inserts lopen via de service-role key in de Edge Function,
-- die RLS omzeilt. Geen insert/update/delete-policy = de client kan de teller niet
-- manipuleren.
create policy "ai_coach_calls_select_own" on public.ai_coach_calls
  for select using (auth.uid() = user_id);

-- Zonder expliciete grant volgt een 403 vóórdat RLS überhaupt wordt geëvalueerd
-- (zie toelichting in 005_nutrition_recovery.sql).
grant select on public.ai_coach_calls to authenticated;

-- Dekt beide count-queries van de functie (per gebruiker, gefilterd op tijd).
create index if not exists ai_coach_calls_user_time_idx
  on public.ai_coach_calls (user_id, called_at);
