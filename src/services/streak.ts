// src/services/streak.ts — streak-systeem v1
// Telt opeenvolgende dagen dat de gebruiker actief was (minstens 1 actie
// voltooid). Werkt op lokale kalenderdatums (YYYY-MM-DD, zie src/lib/dateKey.ts);
// het rekenen tussen twee datums gebeurt in UTC, zodat zomertijd geen dag scheelt.
import { localDateKey } from '../lib/dateKey';

export function toDateKey(d: Date): string {
  return localDateKey(d);
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / msPerDay);
}

// Bepaalt de nieuwe streak zodra de gebruiker vandaag zijn eerste actie voltooit.
// - Geen vorige actieve dag           -> streak start op 1
// - Vorige actieve dag was vandaag    -> streak blijft gelijk (al meegeteld)
// - Vorige actieve dag was gisteren   -> streak +1
// - Groter gat                        -> streak reset naar 1
export function nextStreak(lastActiveDate: string | null, currentStreak: number, today: string = toDateKey(new Date())): number {
  if (!lastActiveDate) return 1;
  const gap = daysBetween(lastActiveDate, today);
  if (gap <= 0) return currentStreak;
  if (gap === 1) return currentStreak + 1;
  return 1;
}
