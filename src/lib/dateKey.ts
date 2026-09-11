// src/lib/dateKey.ts — kalenderdatum (YYYY-MM-DD) in de LOKALE tijdzone.
//
// Niet d.toISOString().slice(0, 10): dat is de UTC-datum. In Nederland (UTC+1/+2)
// viel alles wat je tussen middernacht en 01:00/02:00 logde dan op gisteren —
// stappen, water, maaltijden, gewicht én de streak.
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Milliseconden tot de volgende lokale middernacht (+1s marge, zodat de nieuwe
// datum er zeker is als de timer afgaat).
export function msUntilNextLocalMidnight(now: Date = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
  return next.getTime() - now.getTime();
}
