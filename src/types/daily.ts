// src/types/daily.ts — types voor de dagelijkse loop (score, focus-taken, streak/XP)
// DailyProgress is de "vandaag"-rij: wat de gebruiker al gedaan heeft, plus welke
// acties al XP hebben opgeleverd (zodat XP maar één keer per actie wordt toegekend).

export interface DailyProgress {
  date: string; // YYYY-MM-DD
  workoutDone: boolean;
  steps: number;
  waterL: number;
  xpAwarded: {
    workout: boolean;
    steps: boolean;
    water: boolean;
  };
}

export function emptyDailyProgress(date: string): DailyProgress {
  return {
    date,
    workoutDone: false,
    steps: 0,
    waterL: 0,
    xpAwarded: { workout: false, steps: false, water: false },
  };
}

// Heeft de gebruiker vandaag al iets gedaan? Bepaalt of een nieuwe actie de
// eerste van de dag is (en dus de streak mag ophogen).
export function hasAnyActivity(p: DailyProgress): boolean {
  return p.workoutDone || p.steps > 0 || p.waterL > 0;
}
