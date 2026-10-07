# AI Health Coach

Fitness- en voedingsapp (Expo SDK 56 + Expo Router) met een Supabase-backend:
workout-tracker met routines en PR-detectie, voedingsdagboek met barcodescanner
(Open Food Facts), herstel/slaap, gewoontes en een AI-coach (chat met volledige
context + advies na de onboarding). Inloggen kan met e-mail of gebruikersnaam.

## Setup

1. `npm ci`
2. Kopieer `.env.example` naar `.env` en vul de Supabase-URL en publishable key in.
3. Development build starten (camera, notificaties en secure store hebben native code):

   ```bash
   npx expo run:ios      # of: npx expo run:android
   npx expo start        # dev server voor een al geïnstalleerde dev build
   ```

   Veranderd `.env`? Start Metro dan met `--clear`: `EXPO_PUBLIC_*`-waarden worden
   bij het bundelen ingebakken en anders uit de cache gehaald.

Backend (migraties, Edge Functions, secrets): zie [`supabase/README.md`](supabase/README.md).

## Checks

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint incl. React Compiler-regels (0 waarschuwingen)
npm test            # jest — pure logica in src/services
```

GitHub Actions (`.github/workflows/ci.yml`) draait deze checks plus `deno check`
op de Edge Functions en alle migraties + RLS-tests op een lege Postgres.

## Talen

Alle teksten staan in `constants/i18n.ts` (NL + EN). `en` is getypeerd als
`Record<TKey, string>`, dus een sleutel die in één taal ontbreekt is een
TypeScript-fout. Variabelen via `fill(t('sleutel'), { n: 3 })`.

## Structuur

- `app/` — schermen (file-based routing)
- `components/` — gedeelde UI, thema en React Context-store
- `src/services/` — Supabase-calls en pure logica (met tests)
- `supabase/` — migraties, Edge Functions, RLS-tests
- `DECISIONS.md` — ontwerpkeuzes
