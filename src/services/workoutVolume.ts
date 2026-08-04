// src/services/workoutVolume.ts — trainingsvolume (kg × reps), puur functioneel
// Warming-up-sets tellen bewust nooit mee (zie AGENTS.md Deel A1): "Warming-up
// telt niet mee in PR's of volume".

export type VolumeSetInput = { weightKg: number; reps: number; setType: string };

export function isCountedTowardVolume(set: VolumeSetInput): boolean {
  return set.setType !== 'warmup';
}

export function setVolume(set: VolumeSetInput): number {
  return isCountedTowardVolume(set) ? set.weightKg * set.reps : 0;
}

export function totalVolume(sets: VolumeSetInput[]): number {
  return sets.reduce((sum, s) => sum + setVolume(s), 0);
}

// Volume per dag (YYYY-MM-DD), oplopend gesorteerd — voedt trendgrafieken.
export function volumeByDate<T extends VolumeSetInput & { completedAt: string }>(
  sets: T[]
): { date: string; volumeKg: number }[] {
  const byDate = new Map<string, number>();
  for (const s of sets) {
    if (!isCountedTowardVolume(s)) continue;
    const day = s.completedAt.slice(0, 10);
    byDate.set(day, (byDate.get(day) ?? 0) + s.weightKg * s.reps);
  }
  return Array.from(byDate.entries())
    .map(([date, volumeKg]) => ({ date, volumeKg }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Volume per spiergroep — voedt het weekoverzicht (A4).
export function volumeByMuscleGroup<T extends VolumeSetInput & { exerciseId: string }>(
  sets: T[],
  muscleGroupByExerciseId: Record<string, string>
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of sets) {
    if (!isCountedTowardVolume(s)) continue;
    const group = muscleGroupByExerciseId[s.exerciseId] ?? 'other';
    out[group] = (out[group] ?? 0) + s.weightKg * s.reps;
  }
  return out;
}
