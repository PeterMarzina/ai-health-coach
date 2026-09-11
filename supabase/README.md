# Supabase-backend

Live project: `wrwvvlqyglvirrhwutxy` (regio eu-central-1). De ref staat in
`config.toml`; `.temp/` is machine-lokaal en hoort niet in git.

## Eenmalig per machine

```bash
npx supabase login              # opent de browser, zet een access token neer
npx supabase link --project-ref wrwvvlqyglvirrhwutxy
```

`link` vraagt om het database-wachtwoord (Dashboard → Project Settings → Database).

## Migraties

Alle bestanden in `migrations/` heten `<timestamp>_naam.sql` — dat is het formaat
dat de CLI leest. Bestanden met een andere naam worden **stilzwijgend genegeerd**;
dat is precies hoe deze repo ooit uit de pas ging lopen met de database.

```bash
npx supabase migration new mijn_wijziging   # nieuw, correct genummerd bestand
npx supabase db push                        # toepassen én registreren
npx supabase migration list                 # lokaal vs. database vergelijken
npx supabase db diff --linked               # moet leeg zijn: geen drift
```

Draai nooit meer SQL rechtstreeks in de dashboard-editor zonder er een migratie
van te maken — dan ontstaat er opnieuw schema dat nergens in de repo staat.

### Nog toe te passen

`20260907130000_drop_orphan_users_table.sql` staat klaar maar is nog niet
gedraaid. Ruimt de verweesde tabel `public."Users"` op (0 rijen, RLS zonder
policies, nergens gebruikt). Draai `npx supabase db push` om dit uit te voeren.

## Edge functions

| slug | broncode | secret |
|---|---|---|
| `ai-coach` | `functions/ai-coach/` | `NVIDIA_API_KEY` |
| `coach-chat` | `functions/coach-chat/` | `DEEPSEEK_API_KEY` |
| `product-lookup` | `functions/product-lookup/` | `OFF_USER_AGENT` (optioneel) |

```bash
npx supabase functions deploy <slug>
```

Er draait ook nog een vierde deployment `super-api` — een kopie van
`product-lookup` onder een verkeerde slug. Die kan weg met
`npx supabase functions delete super-api`.
