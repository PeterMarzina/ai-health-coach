-- Nutrition-redesign: maaltijdcategorie, barcode-cache, dagboek-afronding.
--   1) meal_logs.meal_type            — Ontbijt/Lunch/Diner/Snack-secties in het dagboek.
--   2) products.*                     — barcode + Open Food Facts-cache + eigen (handmatige)
--      producten. Bestaande 38 seed-producten worden 'reference' (publiek leesbaar, net
--      als de OFF-cache). calories/protein/carbs/fats_per_100g worden nullable: een OFF-
--      product kan een macro missen, en die moet dan eerlijk null blijven i.p.v. 0.
--   3) daily_progress.diary_completed — vlag voor "Dagboek voltooien" (zelfde patroon als workout_done).
--   4) product_lookup_calls           — simpele per-user rate limit voor de product-lookup Edge Function.
--
-- Toegepast op productie via de Supabase MCP (apply_migration) op 2026-08-04 —
-- dit bestand is de repo-kopie zodat migratiehistorie en live schema niet uit elkaar
-- lopen (zie Fase 0-rapport: 007_weight_logs.sql stond wél lokaal maar was nooit
-- live toegepast, met een kapotte /weight_logs 404 in de app tot gevolg).

alter table public.meal_logs
  add column if not exists meal_type text not null default 'snack'
    check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack'));

alter table public.products
  add column if not exists barcode text,
  add column if not exists brand text,
  add column if not exists source text not null default 'reference'
    check (source in ('reference', 'openfoodfacts', 'user')),
  add column if not exists image_url text,
  add column if not exists fetched_at timestamptz,
  add column if not exists created_by uuid references auth.users(id) on delete cascade;

alter table public.products
  alter column calories_per_100g drop not null,
  alter column protein_per_100g drop not null,
  alter column carbs_per_100g drop not null,
  alter column fats_per_100g drop not null;

create unique index if not exists products_barcode_key on public.products (barcode);

-- Oude policy liet elke authenticated user ALLES lezen. Nu: 'reference'/'openfoodfacts'
-- blijven publiek leesbaar, 'user'-producten alleen voor de eigenaar.
drop policy if exists "products_select_authenticated" on public.products;

create policy "products_select_public_or_own" on public.products
  for select
  to authenticated
  using (source in ('reference', 'openfoodfacts') or created_by = auth.uid());

create policy "products_insert_own" on public.products
  for insert
  to authenticated
  with check (source = 'user' and created_by = auth.uid());

-- Zelfde reden als bij meal_logs/daily_progress (zie 004/005): zonder GRANT geen
-- toegang, ook al klopt de policy.
grant insert on public.products to authenticated;

alter table public.daily_progress
  add column if not exists diary_completed boolean not null default false;

-- Simpele per-user rate limit voor de 'product-lookup' Edge Function (OFF-calls).
-- De functie zelf telt/schrijft met de service-role key (bypass RLS); de select-policy
-- hier is alleen voor eigen inzicht/debug, niet voor app-gebruik.
create table if not exists public.product_lookup_calls (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  called_at timestamptz not null default now()
);

alter table public.product_lookup_calls enable row level security;

create policy "product_lookup_calls_select_own" on public.product_lookup_calls
  for select using (auth.uid() = user_id);

grant select on public.product_lookup_calls to authenticated;

create index if not exists product_lookup_calls_user_time_idx
  on public.product_lookup_calls (user_id, called_at);
