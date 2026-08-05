-- Favorieten-tab in het zoekscherm: eenvoudige join-tabel user_id x product_id.
create table if not exists public.product_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

alter table public.product_favorites enable row level security;

create policy "product_favorites_select_own" on public.product_favorites
  for select using (auth.uid() = user_id);
create policy "product_favorites_insert_own" on public.product_favorites
  for insert with check (auth.uid() = user_id);
create policy "product_favorites_delete_own" on public.product_favorites
  for delete using (auth.uid() = user_id);

grant select, insert, delete on public.product_favorites to authenticated;
