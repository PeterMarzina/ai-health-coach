-- Baseline: public.rls_auto_enable() + de event trigger `ensure_rls`.
--
-- Zet automatisch RLS aan op elke nieuwe tabel in het schema `public`, als
-- vangnet voor tabellen die via de SQL-editor worden aangemaakt. Dit is door
-- het Supabase-platform aangezet en had nooit een migratie; gereconstrueerd uit
-- de live database (7 sep 2026), want zonder deze functie faalt de latere
-- migratie `revoke_rls_auto_enable_execute` op een leeg project.
--
-- De event trigger staat in een guarded DO-block: `create event trigger` vereist
-- superuser-rechten, en de `postgres`-rol van een vers Supabase-project heeft
-- die niet altijd. Mislukt hij, dan is dat geen ramp — elke migratie in deze
-- repo zet zelf al expliciet `enable row level security`. De trigger is puur
-- een extra vangnet.

create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

do $$
begin
  if not exists (select 1 from pg_event_trigger where evtname = 'ensure_rls') then
    create event trigger ensure_rls
      on ddl_command_end
      when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      execute function public.rls_auto_enable();
  end if;
exception
  when insufficient_privilege then
    raise notice 'ensure_rls event trigger overgeslagen: onvoldoende rechten (niet kritiek)';
end
$$;
