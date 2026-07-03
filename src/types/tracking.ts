// src/types/tracking.ts — schema voor dagelijkse tracking (Sprint 5)
// Product    = referentierij uit `products` (macro's per 100g), read-only vanuit de app.
// MealEntry  = één gelogde maaltijd, opgeslagen in `meal_logs`. Ofwel gekozen uit een
//              Product (productId + grams ingevuld, macro's berekend) ofwel volledig
//              handmatig ingevoerd (productId/grams blijven dan leeg) — de opgeslagen
//              macro's zelf zijn in beide gevallen dezelfde 4 velden, dus dag-totalen
//              tellen correct op ongeacht de bron.
// DailyLog   = slaap/trainingsbelasting/hersteldscore, één rij per gebruiker per dag
//              in `daily_logs`. Water zelf leeft al in `daily_progress` (Sprint 3,
//              zie DailyProvider/useDaily in components/store.tsx) — niet hier dupliceren.
export interface Product {
  id: string;
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatsPer100g: number;
}

export interface MealEntry {
  id: string;
  date: string;       // YYYY-MM-DD
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  loggedAt: string;    // ISO-timestamp
  productId: string | null;  // gekozen product, null bij handmatige invoer
  grams: number | null;      // ingevoerd gewicht, null bij handmatige invoer
}

export interface DailyLog {
  date: string;                        // YYYY-MM-DD
  sleepHours: number | null;
  sleepQuality: number | null;         // 1 (slecht) - 5 (uitstekend)
  trainingLoad: number | null;         // 1 (licht) - 5 (zeer zwaar)
  restingHeartRate: number | null;     // optioneel, "indien beschikbaar"
  recoveryScore: number | null;        // 0-100, zie src/services/recoveryScore.ts
}

export const EMPTY_DAILY_LOG = (date: string): DailyLog => ({
  date,
  sleepHours: null,
  sleepQuality: null,
  trainingLoad: null,
  restingHeartRate: null,
  recoveryScore: null,
});

// WeightLog — één gewichtsmeting per gebruiker per dag, in `weight_logs`
// (zie supabase/migrations/007_weight_logs.sql). Voedt de gewicht-grafiek
// op het Progress-scherm.
export interface WeightLog {
  date: string;      // YYYY-MM-DD
  weightKg: number;
}
