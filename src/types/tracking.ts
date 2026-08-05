// src/types/tracking.ts — schema voor dagelijkse tracking (Sprint 5, uitgebreid
// voor de nutrition-redesign: maaltijdcategorie + barcode/OFF-producten)
// Product    = referentierij uit `products` (macro's per 100g), read-only vanuit de app.
//              per-100g-velden zijn nullable: een via Open Food Facts opgehaald product
//              kan een macro missen — dat blijft dan eerlijk null, nooit stiekem 0.
// MealEntry  = één gelogde maaltijd, opgeslagen in `meal_logs`. Ofwel gekozen uit een
//              Product (productId + grams ingevuld, macro's berekend) ofwel volledig
//              handmatig ingevoerd (productId/grams blijven dan leeg) — de opgeslagen
//              macro's zelf zijn in beide gevallen dezelfde 4 velden, dus dag-totalen
//              tellen correct op ongeacht de bron. mealType bepaalt de dagboeksectie.
// DailyLog   = slaap/trainingsbelasting/hersteldscore, één rij per gebruiker per dag
//              in `daily_logs`. Water zelf leeft al in `daily_progress` (Sprint 3,
//              zie DailyProvider/useDaily in components/store.tsx) — niet hier dupliceren.
export type ProductSource = 'reference' | 'openfoodfacts' | 'user';

export interface Product {
  id: string;
  name: string;
  caloriesPer100g: number | null;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatsPer100g: number | null;
  brand: string | null;
  barcode: string | null;
  source: ProductSource;
  imageUrl: string | null;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_TYPES: { key: MealType; label: string; icon: 'sun' | 'utensils' | 'moon' | 'cookie' }[] = [
  { key: 'breakfast', label: 'Ontbijt', icon: 'sun' },
  { key: 'lunch', label: 'Middageten', icon: 'utensils' },
  { key: 'dinner', label: 'Avondeten', icon: 'moon' },
  { key: 'snack', label: 'Tussendoortjes', icon: 'cookie' },
];

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
  mealType: MealType;
}

// Status van één dag in de weekstrip: heeft de gebruiker iets gelogd, en is het
// dagboek expliciet afgesloten via "Dagboek voltooien" (`daily_progress.diary_completed`)?
export interface DiaryDayStatus {
  date: string;         // YYYY-MM-DD
  hasMeals: boolean;
  completed: boolean;
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
