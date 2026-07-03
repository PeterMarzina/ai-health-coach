-- Sprint 5 (vervolg): basisproducten-database voor meal logging
-- `products` is een read-only referentietabel (macro's per 100 gram), zodat de
-- gebruiker een product kan kiezen + een gewicht invullen i.p.v. alle macro's
-- met de hand te moeten intypen. Handmatige invoer blijft mogelijk: `meal_logs`
-- krijgt twee extra, nullable kolommen (product_id/grams) — leeg bij een
-- handmatig gelogde maaltijd, ingevuld bij een product-gebaseerde.

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  calories_per_100g numeric not null,
  protein_per_100g numeric not null,
  carbs_per_100g numeric not null,
  fats_per_100g numeric not null,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

create policy "products_select_authenticated" on public.products
  for select
  to authenticated
  using (true);

-- LET OP (zie 005_nutrition_recovery.sql / 004_daily_progress.sql voor de volledige
-- toelichting): tabellen aangemaakt door de `postgres`-rol krijgen geen automatische
-- select-rechten voor `authenticated` — zonder deze GRANT krijgt elke request een 403.
grant select on public.products to authenticated;

-- Koppeling naar meal_logs: welk product (indien gekozen) + hoeveel gram.
-- Beide nullable, want een handmatig gelogde maaltijd heeft geen product.
alter table public.meal_logs
  add column if not exists product_id uuid references public.products(id),
  add column if not exists grams numeric;

-- Seed: basislijst van ~40 veelgebruikte producten, macro's per 100g.
insert into public.products (name, calories_per_100g, protein_per_100g, carbs_per_100g, fats_per_100g) values
  ('Kipfilet (rauw)', 165, 31, 0, 3.6),
  ('Rundergehakt (mager)', 137, 20, 0, 6),
  ('Zalm (gegrild)', 208, 20, 0, 13),
  ('Tonijn in water (blik)', 116, 26, 0, 1),
  ('Ei (heel)', 155, 13, 1.1, 11),
  ('Magere kwark', 60, 12, 4, 0.2),
  ('Griekse yoghurt (0%)', 59, 10, 3.6, 0.4),
  ('Skyr', 63, 11, 4, 0.2),
  ('Halfvolle melk', 46, 3.4, 4.7, 1.5),
  ('Cottage cheese', 98, 11, 3.4, 4.3),
  ('Rijst (wit, gekookt)', 130, 2.7, 28, 0.3),
  ('Rijst (zilvervlies, gekookt)', 111, 2.6, 23, 0.9),
  ('Havermout (droog)', 375, 13, 62, 7),
  ('Volkoren pasta (gekookt)', 124, 5, 25, 1),
  ('Pasta (wit, gekookt)', 131, 5, 25, 1.1),
  ('Aardappelen (gekookt)', 87, 2, 20, 0.1),
  ('Zoete aardappel (gekookt)', 90, 2, 21, 0.1),
  ('Quinoa (gekookt)', 120, 4.4, 21, 1.9),
  ('Volkoren brood', 247, 9, 41, 3.4),
  ('Wit brood', 265, 9, 49, 3.2),
  ('Banaan', 89, 1.1, 23, 0.3),
  ('Appel', 52, 0.3, 14, 0.2),
  ('Broccoli (gekookt)', 35, 2.4, 7, 0.4),
  ('Sperziebonen (gekookt)', 31, 1.8, 7, 0.1),
  ('Wortels (rauw)', 41, 0.9, 10, 0.2),
  ('Spinazie (rauw)', 23, 2.9, 3.6, 0.4),
  ('Tomaat', 18, 0.9, 3.9, 0.2),
  ('Komkommer', 15, 0.7, 3.6, 0.1),
  ('Avocado', 160, 2, 9, 15),
  ('Amandelen', 579, 21, 22, 50),
  ('Pindakaas', 588, 25, 20, 50),
  ('Olijfolie', 884, 0, 0, 100),
  ('Boter', 717, 0.9, 0.1, 81),
  ('Kaas (jong belegen)', 350, 25, 0, 27),
  ('Linzen (gekookt)', 116, 9, 20, 0.4),
  ('Kikkererwten (gekookt)', 164, 8.9, 27, 2.6),
  ('Zwarte bonen (gekookt)', 132, 8.9, 24, 0.5),
  ('Tofu (naturel)', 76, 8, 1.9, 4.8),
  ('Wei-eiwitpoeder (whey)', 400, 80, 8, 5)
on conflict (name) do nothing;
