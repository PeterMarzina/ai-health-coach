// src/services/oneRepMax.ts — geschat 1RM (one-rep max) via de Epley-formule
// 1RM = gewicht × (1 + reps/30). Puur functioneel, geen Supabase hier — zie
// src/services/personalRecords.ts en app/plan/exercise-history.tsx voor gebruik.

export function estimateOneRepMax(weightKg: number, reps: number): number {
  if (!(weightKg > 0) || !(reps > 0)) return 0;
  return weightKg * (1 + reps / 30);
}

// Beste (hoogste geschatte 1RM) set uit een lijst, of null als de lijst leeg is.
export function bestSetByEstimatedOneRepMax<T extends { weightKg: number; reps: number }>(
  sets: T[]
): T | null {
  let best: T | null = null;
  let bestOneRm = -Infinity;
  for (const s of sets) {
    const oneRm = estimateOneRepMax(s.weightKg, s.reps);
    if (oneRm > bestOneRm) {
      bestOneRm = oneRm;
      best = s;
    }
  }
  return best;
}
