// src/services/personalRecords.ts — PR-detectie (Deel A4)
// Puur functioneel: vergelijkt de sets van de zojuist afgeronde sessie met de
// historische sets van diezelfde oefening en bepaalt welke PR's verbroken zijn.
// Warming-up-sets doen nooit mee (zelfde regel als volume, zie workoutVolume.ts).
// De Supabase-kant (ophalen historie, wegschrijven) leeft in workouts.ts —
// deze functie krijgt gewone data binnen zodat hij zonder backend te testen is.
import { estimateOneRepMax } from './oneRepMax';

export type PRSetInput = { weightKg: number; reps: number; setType: string };

export type PersonalRecordType = 'max_weight' | 'max_1rm' | 'max_reps_at_weight';

export type DetectedPR = {
  type: PersonalRecordType;
  weightKg: number;
  reps: number;
  estimatedOneRm: number;
};

function nonWarmup(sets: PRSetInput[]): PRSetInput[] {
  return sets.filter((s) => s.setType !== 'warmup');
}

// Geen PR's op de allereerste keer dat je een oefening doet — er is dan niets
// om te verbreken, en elke set zou anders "een record" zijn (schreeuwerig én
// zinloos). Zie AGENTS.md: "vier dat met een duidelijke maar niet-schreeuwerige
// melding".
export function detectPersonalRecords(newSets: PRSetInput[], priorSets: PRSetInput[]): DetectedPR[] {
  const newCounted = nonWarmup(newSets);
  const priorCounted = nonWarmup(priorSets);
  if (newCounted.length === 0 || priorCounted.length === 0) return [];

  const results: DetectedPR[] = [];

  // 1) Zwaarste gewicht ooit.
  const priorMaxWeight = Math.max(...priorCounted.map((s) => s.weightKg));
  const bestWeightSet = newCounted.reduce((best, s) => (s.weightKg > best.weightKg ? s : best));
  if (bestWeightSet.weightKg > priorMaxWeight) {
    results.push({
      type: 'max_weight',
      weightKg: bestWeightSet.weightKg,
      reps: bestWeightSet.reps,
      estimatedOneRm: estimateOneRepMax(bestWeightSet.weightKg, bestWeightSet.reps),
    });
  }

  // 2) Beste geschatte 1RM (Epley) ooit.
  const priorMax1Rm = Math.max(...priorCounted.map((s) => estimateOneRepMax(s.weightKg, s.reps)));
  const bestOneRmSet = newCounted.reduce((best, s) =>
    estimateOneRepMax(s.weightKg, s.reps) > estimateOneRepMax(best.weightKg, best.reps) ? s : best
  );
  const bestOneRm = estimateOneRepMax(bestOneRmSet.weightKg, bestOneRmSet.reps);
  if (bestOneRm > priorMax1Rm) {
    results.push({
      type: 'max_1rm',
      weightKg: bestOneRmSet.weightKg,
      reps: bestOneRmSet.reps,
      estimatedOneRm: bestOneRm,
    });
  }

  // 3) Meeste reps bij een specifiek gewicht — per gewicht uit deze sessie
  // vergeleken met het beste ooit bij precies dat gewicht.
  const newWeights = Array.from(new Set(newCounted.map((s) => s.weightKg)));
  for (const weight of newWeights) {
    const bestNewRepsAtWeight = Math.max(...newCounted.filter((s) => s.weightKg === weight).map((s) => s.reps));
    const priorRepsAtWeight = priorCounted.filter((s) => s.weightKg === weight).map((s) => s.reps);
    const bestPriorRepsAtWeight = priorRepsAtWeight.length ? Math.max(...priorRepsAtWeight) : 0;
    if (priorRepsAtWeight.length > 0 && bestNewRepsAtWeight > bestPriorRepsAtWeight) {
      results.push({
        type: 'max_reps_at_weight',
        weightKg: weight,
        reps: bestNewRepsAtWeight,
        estimatedOneRm: estimateOneRepMax(weight, bestNewRepsAtWeight),
      });
    }
  }

  return results;
}
