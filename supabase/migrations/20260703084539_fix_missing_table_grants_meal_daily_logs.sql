-- Fix: tables created via SQL editor/raw execute_sql are owned by role `postgres`,
-- whose default privileges for schema public only include Delete/Truncate/References/Trigger
-- for anon/authenticated (see pg_default_acl) -- NOT Select/Insert/Update. RLS policies were
-- correctly defined on these tables, but every request was rejected at the grant level before
-- RLS was ever evaluated (403), because `authenticated` never had base SELECT/INSERT/UPDATE
-- privileges on the table itself. This affects meal_logs, daily_logs (Sprint 5) and
-- daily_progress (Sprint 3, water/steps/workout tracking) identically.
grant select, insert, delete on public.meal_logs to authenticated;
grant select, insert, update on public.daily_logs to authenticated;
grant select, insert, update on public.daily_progress to authenticated;
