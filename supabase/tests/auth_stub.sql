-- Minimale nabootsing van wat Supabase standaard aanlevert (rollen, auth.users,
-- auth.uid()), zodat alle migraties op een kale Postgres te testen zijn.
-- Alleen voor scripts/test-migrations.sh — nooit op een echte database draaien.
-- Rollen zijn cluster-breed: alleen aanmaken als ze nog niet bestaan.
do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated', 'service_role'] loop
    if not exists (select 1 from pg_roles where rolname = r) then
      execute format('create role %I', r);
    end if;
  end loop;
end $$;

create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant usage on schema public to anon, authenticated;
