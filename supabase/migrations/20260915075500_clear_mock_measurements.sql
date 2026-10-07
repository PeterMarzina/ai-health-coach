-- Mock-lichaamsmaten uit profielen halen.
--
-- Tot 2026-09-11 stonden er verzonnen startwaarden in constants/data.ts
-- (bodyFat 18, chest 102, waist 82, hips 98, arms 38, thighs 58). Wie de onboarding
-- afrondde, kreeg die als "eigen" metingen in Supabase — en op Progress een
-- lichaamssamenstelling die nergens op sloeg. De defaults zijn inmiddels 0
-- ("niet ingevuld"); deze migratie ruimt de rijen op die de oude set nog hebben.
--
-- Gewicht en lengte blijven staan: die vult de gebruiker zelf in tijdens de onboarding.
--
-- (Was al op de live database toegepast maar stond nog niet in de repo; inhoud
-- overgenomen uit supabase_migrations.schema_migrations.)
update public.profiles
set measurements = measurements || jsonb_build_object(
      'bodyFat', 0, 'chest', 0, 'waist', 0, 'hips', 0, 'arms', 0, 'thighs', 0
    ),
    updated_at = now()
where (measurements->>'bodyFat')::numeric = 18
  and (measurements->>'chest')::numeric = 102
  and (measurements->>'waist')::numeric = 82
  and (measurements->>'hips')::numeric = 98
  and (measurements->>'arms')::numeric = 38
  and (measurements->>'thighs')::numeric = 58;
