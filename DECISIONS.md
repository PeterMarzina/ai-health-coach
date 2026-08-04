# DECISIONS.md — Gym tracker upgrade + Habit tracker

Autonome sessie op branch `feat/gym-habits`. Dit document wordt tijdens het
werk bijgewerkt: eerst de verkenning, daarna aannames en geblokkeerde punten
naarmate ze zich voordoen, en tot slot een afrondende samenvatting.

## Verkenning (Stap 0)

**Theme tokens** (`constants/theme.ts`): `Palette`-type met `bg/card/cardHi/
cardLo/line/lineHi/text/sub/dim/faint/accent/accentText/accentSoft/onAccent/
track/bad` + data-hues `calories/protein/carbs/fats/water/sleep`. `LIGHT` en
`DARK` vullen dit in, `useTheme()` (`components/store.tsx`) geeft `{ c, mode,
toggle, setMode }`. Geen hardcoded kleuren nergens in de bestaande schermen —
alles via `c.xxx`. `withAlpha(hex, a)` voor transparante varianten.

**Navigatie**: Expo Router (file-based). Root stack in `app/_layout.tsx` met
een auth-poort (`useAuth()` → login/onboarding/tabs). Tabs in
`app/(tabs)/_layout.tsx` (index/plan/progress/profile) met een eigen
`<TabBar/>` (midden-FAB met quick-add sheet). Sub-stacks per feature-map
(bv. `app/plan/_layout.tsx`) zonder header, met `animation: 'slide_from_right'`.

**Bestaande workout-code**: `exercises` / `workout_sessions` /
`workout_session_exercises` / `workout_sets` (migratie `004_workout_system.sql`),
services in `src/services/workouts.ts` + `workoutPlanGenerator.ts`, schermen
`app/plan/workout.tsx` (start/actieve sessie, template-keuze), `workout-log.tsx`
(reps/gewicht loggen per oefening) en `exercise-history.tsx` (top-set-grafiek).
Dit is een v1: geen sets-rij-UI (alleen een formulier + lijst), geen vorige-
prestatie-weergave, geen rusttimer, geen setgroei-types, geen PR-detectie, geen
routines, geen crash-safe lokale state. `fetchWorkoutVolumeHistory` (Progress-tab)
en `fetchCompletedSessionCount` (Profile-tab) lezen rechtstreeks uit deze tabellen
— die mogen niet breken.

**Supabase-schema conventies**: RLS altijd aan, policies via
`auth.uid() = user_id` waar een tabel een eigen `user_id`-kolom heeft, of via
een `exists (select 1 from parent ... where parent.user_id = auth.uid())`-join
wanneer de tabel geen eigen `user_id` heeft (bv. `workout_sets` → via
`workout_sessions`). Elke migratie eindigt met een expliciete
`grant select, insert, update on public.<tabel> to authenticated;` — zonder die
grant krijgt elke request een 403 vóór RLS wordt geëvalueerd (zie toelichting in
`005_nutrition_recovery.sql`). Composite PK `(user_id, date)` voor "1 rij per
dag"-tabellen (`daily_progress`, `weight_logs`).

**Data-fetching conventie**: geen React Query/SWR — plain `async/await` +
`useState`/`useEffect`/`useFocusEffect` per scherm, services in `src/services/*.ts`
die rechtstreeks `supabase.from(...)` aanroepen en snake_case-rijen mappen naar
camelCase-types (`src/types/*.ts`). Geen Zustand/Redux — gedeelde state via
React Context in `components/store.tsx`.

**Overig**: AsyncStorage is al een dependency (geen MMKV). Taal-systeem
(`constants/i18n.ts`, NL/EN) bestaat maar wordt alleen gebruikt in
auth/onboarding/coach-schermen; de meeste schermen (incl. alle workout-schermen)
gebruiken gewoon losse Engelse strings in JSX. Iconen: eigen SVG-set in
`components/Icon.tsx` (`IconName`-union), geen icon-library. Geen test-runner
aanwezig (geen jest/jest-expo in `package.json`, geen `test`-script).

## Aannames

- **UI-teksten in het Engels**, net als de bestaande workout-/plan-/progress-
  schermen. `constants/i18n.ts` wordt niet uitgebreid voor de nieuwe schermen
  (bestaand patroon: alleen auth/onboarding/coach gebruiken `t()`).
- **Bestaande workout-tabellen uitgebreid, niet vervangen.** In plaats van de
  richtlijn-namen uit AGENTS.md (`session_exercises`, `sets`) te gebruiken, zijn
  de bestaande `workout_sessions` / `workout_session_exercises` / `workout_sets`
  uitgebreid met nieuwe kolommen. Reden: `fetchWorkoutVolumeHistory` (Progress)
  en `fetchCompletedSessionCount` (Profile) lezen hier al uit; een rename zou die
  twee schermen breken zonder dat de opdracht daarom vraagt.
- **Nieuwe dependencies:** `expo-notifications` (rusttimer-notificatie op de
  achtergrond + habit-herinneringen) en `expo-haptics` (tap-feedback op het
  habit-hoofdscherm), geïnstalleerd via `npx expo install` zodat de SDK-56-
  compatibele versies gepakt worden. Dit zijn de enige nieuwe libraries;
  geen nieuwe state-library, UI-kit of navigatie-aanpak.
- **Test-runner toegevoegd:** `jest` + `babel-jest` (hergebruikt het bestaande
  `babel.config.js`) als devDependency, met een `test`-script. Er was geen
  testinfrastructuur aanwezig; dit is nodig om de gevraagde unit tests
  (1RM, PR-detectie, streak, volume) te kunnen draaien. Bewust géén `jest-expo`
  (zwaarder, RN-rendering-mocks) omdat alleen pure TS-logica getest wordt.
- **Habit-kleuren:** een vaste swatch van bestaande theme-hues
  (`accent, calories, protein, carbs, fats, water, sleep`) — geen vrije
  hex-colorpicker, geen nieuwe kleuren verzonnen.
- **PR-detectie als append-only log** (`personal_records`): bij het afronden
  van een sessie wordt per oefening de nieuwe top-set vergeleken met de
  historische bests (max gewicht, max Epley-1RM, max reps bij dat gewicht);
  bij verbetering wordt een nieuwe rij weggeschreven. Geen "huidige record"-
  upsert-tabel, want "meeste reps op een gewicht" heeft geen zinvolle unieke
  sleutel per oefening.
- **Crash-safe sessie:** de actieve sessie-state (gekozen oefeningen, welke
  sets al afgevinkt zijn, rusttimer) wordt bij elke wijziging weggeschreven naar
  AsyncStorage. Voltooide sets worden meteen (optimistisch) naar Supabase
  geschreven zoals het bestaande patroon al deed; bij een mislukte schrijf blijft
  de set in de lokale outbox staan en wordt hij bij de volgende sync-poging
  opnieuw verstuurd. Bij het openen van het workout-scherm wordt eerst de lokale
  cache gelezen ("Resume session?") en pas daarna gesynchroniseerd met Supabase.
- **Habit-streak met weekcoulance:** voor `daily`-habits telt de streak per
  kalenderdag (zelfde aanpak als de bestaande app-brede streak in
  `src/services/streak.ts`). Voor `times_per_week`/`weekdays`-habits telt de
  streak per **week** (voldaan aan het doel die week = streak+1), niet per dag —
  zodat één gemiste dag geen streak breekt zolang het weekdoel gehaald wordt.

## Geblokkeerd

*(wordt aangevuld als er iets echt niet te beslissen is)*

## Status / TODO voor jou

*(wordt aan het eind ingevuld: wat te draaien, wat te testen, wat nog open staat)*
