-- RLS-/rechten-checks na alle migraties (zie scripts/test-migrations.sh).
-- Elke check gooit een exception als het gedrag niet klopt.

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"username": "alice"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"username": "bob"}');
insert into public.profiles (id, full_name, username) values
  ('00000000-0000-0000-0000-00000000000a', 'A', 'alice'),
  ('00000000-0000-0000-0000-00000000000b', 'B', 'bob');
insert into public.workout_sessions (id, user_id, name) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'A session'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'B session');

-- Een helper die checkt dat een statement door RLS/rechten geweigerd wordt.
create function pg_temp.expect_denied(sql text, label text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'FAIL: % was allowed', label;
exception
  when insufficient_privilege then null; -- 42501: RLS-violation of geen rechten
end $$;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';

-- workout_sets: niet in andermans sessie, wel in de eigen (20261007150000).
select pg_temp.expect_denied($$
  insert into public.workout_sets (session_id, exercise_id, set_number, reps, weight_kg, user_id)
  select '10000000-0000-0000-0000-00000000000b', id, 1, 5, 100, '00000000-0000-0000-0000-00000000000a'
  from public.exercises limit 1
$$, 'set in other user''s session');

insert into public.workout_sets (session_id, exercise_id, set_number, reps, weight_kg, user_id)
select '10000000-0000-0000-0000-00000000000a', id, 1, 5, 100, '00000000-0000-0000-0000-00000000000a'
from public.exercises limit 1;

-- personal_records: niet gekoppeld aan andermans sessie.
select pg_temp.expect_denied($$
  insert into public.personal_records (user_id, exercise_id, session_id, record_type, weight_kg, reps, estimated_1rm)
  select '00000000-0000-0000-0000-00000000000a', id, '10000000-0000-0000-0000-00000000000b', 'max_weight', 100, 5, 116
  from public.exercises limit 1
$$, 'PR in other user''s session');

-- Profielen: alleen de eigen rij zichtbaar.
do $$ begin
  if (select count(*) from public.profiles) <> 1 then raise exception 'FAIL: other profiles visible'; end if;
end $$;

-- is_username_available: andermans naam bezet, eigen naam en onbekende naam vrij.
do $$ begin
  if public.is_username_available('Bob') then raise exception 'FAIL: bob should be taken'; end if;
  if not public.is_username_available('alice') then raise exception 'FAIL: own username reported as taken'; end if;
  if not public.is_username_available('carol') then raise exception 'FAIL: carol should be free'; end if;
end $$;

-- Ingelogd mag je get_email_by_username niet aanroepen (alleen service_role, via username-login).
select pg_temp.expect_denied($$ select public.get_email_by_username('bob') $$, 'authenticated email lookup');

reset role;

-- anon: geen username-check, geen e-mail-lookup, geen profielen.
set role anon;
select pg_temp.expect_denied($$ select public.is_username_available('bob') $$, 'anon username check');
select pg_temp.expect_denied($$ select public.get_email_by_username('bob') $$, 'anon email lookup');
select pg_temp.expect_denied($$ select count(*) from public.profiles $$, 'anon reading profiles');
reset role;

-- clear_mock_measurements: seed-metingen naar 0, echte metingen blijven staan.
update public.profiles set measurements = '{"weight": 80, "bodyFat": 18, "chest": 102, "waist": 82, "hips": 98, "arms": 38, "thighs": 58}'
  where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set measurements = '{"weight": 70, "bodyFat": 18, "chest": 100, "waist": 82, "hips": 98, "arms": 38, "thighs": 58}'
  where id = '00000000-0000-0000-0000-00000000000b';
\i supabase/migrations/20260915075500_clear_mock_measurements.sql
do $$ begin
  if (select (measurements->>'bodyFat')::numeric from public.profiles where id = '00000000-0000-0000-0000-00000000000a') <> 0 then
    raise exception 'FAIL: seed measurements not cleared';
  end if;
  if (select (measurements->>'weight')::numeric from public.profiles where id = '00000000-0000-0000-0000-00000000000a') <> 80 then
    raise exception 'FAIL: weight was touched';
  end if;
  if (select (measurements->>'chest')::numeric from public.profiles where id = '00000000-0000-0000-0000-00000000000b') <> 100 then
    raise exception 'FAIL: real measurements were cleared';
  end if;
end $$;

select 'rls checks passed' as result;
