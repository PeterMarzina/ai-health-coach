// src/services/dailyScore.ts — dagscore-algoritme v1
// Zuivere, testbare functie: input -> score (0-100) + puntenverdeling.
// Alle gewichten staan hieronder in WEIGHTS zodat de logica later makkelijk
// is bij te stellen zonder de rest van de app te hoeven aanpassen.

export interface DailyScoreInput {
  workoutDone: boolean;
  steps: number;
  stepGoal: number;
  waterL: number;
  waterGoalL: number;
  streakDays: number;
}

export interface DailyScoreBreakdown {
  workout: number;
  movement: number;
  nutrition: number;
  streakBonus: number;
}

export interface DailyScoreResult {
  score: number;
  breakdown: DailyScoreBreakdown;
}

const WEIGHTS = {
  workout: 40,
  movement: 30,
  nutrition: 20,
  streakBonus: 10, // 1 punt per streak-dag, tot dit maximum
};

function ratio(value: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.max(0, Math.min(1, value / goal));
}

export function calculateDailyScore(input: DailyScoreInput): DailyScoreResult {
  const workout = input.workoutDone ? WEIGHTS.workout : 0;
  const movement = Math.round(ratio(input.steps, input.stepGoal) * WEIGHTS.movement);
  const nutrition = Math.round(ratio(input.waterL, input.waterGoalL) * WEIGHTS.nutrition);
  const streakBonus = Math.min(Math.max(0, input.streakDays), WEIGHTS.streakBonus);

  const breakdown: DailyScoreBreakdown = { workout, movement, nutrition, streakBonus };
  const score = Math.min(100, workout + movement + nutrition + streakBonus);

  return { score, breakdown };
}
