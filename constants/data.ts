// constants/data.ts — startwaarden voor SettingsContext (components/store.tsx)
// Geen voorbeeld-data meer: alle schermen lezen echte gegevens uit Supabase.

// Standaard-doelen tot de onboarding ze vervangt door berekende waarden.
export const DEFAULT_GOALS = {
  calories: 2400,
  protein: 160,
  carbs: 300,
  fats: 80,
  water: 2.5,   // litres
  sleepHours: 8,
  steps: 10000,
  weightTarget: 75,
};

// 0 = nog niet ingevuld. Geen verzonnen lichaamsmaten: die zouden na onboarding
// als "jouw" metingen in Supabase belanden (onboarding vult alleen gewicht + lengte).
export const DEFAULT_MEASUREMENTS = {
  weight: 0,    // kg
  height: 0,    // cm
  bodyFat: 0,   // %
  chest: 0,     // cm
  waist: 0,     // cm
  hips: 0,      // cm
  arms: 0,      // cm
  thighs: 0,    // cm
};
