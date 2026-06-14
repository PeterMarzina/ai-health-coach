// Minimal defaults for goals and measurements expected by the app
export const DEFAULT_GOALS = {
    dailySteps: 8000,
    caloriesPerDay: 2000,
    workoutMinutes: 30,
} as const;

export const DEFAULT_MEASUREMENTS = {
    weightKg: 70,
    bodyFatPercent: 20,
} as const;
