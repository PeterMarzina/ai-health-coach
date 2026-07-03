-- Fix voor Sprint 4: workout-tabellen misten table-level GRANTs
-- Root cause: dit project heeft geen "default privileges" ingesteld die nieuwe
-- tabellen in `public` automatisch SELECT/INSERT/UPDATE/DELETE geven aan de
-- rollen `anon`/`authenticated` (zoals `profiles` die wel heeft, vermoedelijk
-- via de dashboard Table Editor aangemaakt). RLS-policies bepalen alleen wélke
-- rijen zichtbaar zijn — zonder GRANT wordt de query al daarvóór geweigerd met
-- "permission denied for table ...", nog vóór RLS wordt geëvalueerd.
-- (De RLS-policies uit 004_workout_system.sql waren dus al correct.)

grant select on public.exercises to authenticated;

grant select, insert, update, delete on public.workout_sessions to authenticated;
grant select, insert, update, delete on public.workout_session_exercises to authenticated;
grant select, insert, update, delete on public.workout_sets to authenticated;
