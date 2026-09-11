// src/services/weightTrend.ts — gewichtsverandering t.o.v. een week eerder.
// Puur (geen Supabase) zodat het los te testen is, zie weightTrend.test.ts.
//
// Er wordt niet elke dag gewogen, dus "een week geleden" is de laatste meting
// op of vóór (laatste meting − 7 dagen). Is er geen meting die oud genoeg is,
// dan is er geen eerlijke week-vergelijking: null i.p.v. een verzonnen 0.
import type { WeightLog } from '@/src/types/tracking';

// `logs` moet oplopend op datum gesorteerd zijn (zoals fetchWeightLogs teruggeeft).
export function weeklyWeightChange(logs: WeightLog[]): number | null {
  if (logs.length < 2) return null;
  const latest = logs[logs.length - 1];

  const cutoff = new Date(`${latest.date}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - 7);
  const cutoffKey = cutoff.toISOString().slice(0, 10);

  // YYYY-MM-DD-strings sorteren als datums, dus <= werkt direct.
  const baseline = [...logs].reverse().find((l) => l.date <= cutoffKey);
  if (!baseline) return null;
  return Math.round((latest.weightKg - baseline.weightKg) * 10) / 10;
}
