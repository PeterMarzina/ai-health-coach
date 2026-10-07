-- workout_sets / personal_records: de policies checkten alleen `auth.uid() = user_id`,
-- niet of session_id ook van die gebruiker is. Daardoor kon je met een bekende
-- sessie-id sets of PR's aan andermans sessie hangen. Nu moet de sessie van de
-- aanroeper zijn (personal_records.session_id mag null blijven).
-- `alter policy` i.p.v. drop/create: alleen de with check verandert.

alter policy "workout_sets_manage_own" on public.workout_sets
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.workout_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );

alter policy "personal_records_insert_own" on public.personal_records
  with check (
    auth.uid() = user_id
    and (
      session_id is null
      or exists (
        select 1 from public.workout_sessions s
        where s.id = session_id and s.user_id = auth.uid()
      )
    )
  );
