// src/services/trackingService.ts — dagelijkse tracking (maaltijden, slaap, herstel)
// Dunne laag rond Supabase voor de tabellen `meal_logs`, `daily_logs` en `products`
// (zie supabase/migrations/005_nutrition_recovery.sql, 006_products.sql). Elke
// functie werkt op één gebruiker (user_id) + dag (date, YYYY-MM-DD). Water zelf
// loopt via useDaily()/`daily_progress` (Sprint 3) — niet via deze service.
import { supabase } from '../lib/supabase';
import type { DailyLog, MealEntry, Product, WeightLog } from '@/src/types/tracking';
import { EMPTY_DAILY_LOG } from '@/src/types/tracking';

export function todayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fats_per_100g')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    caloriesPer100g: r.calories_per_100g,
    proteinPer100g: r.protein_per_100g,
    carbsPer100g: r.carbs_per_100g,
    fatsPer100g: r.fats_per_100g,
  }));
}

export async function fetchMeals(userId: string, date: string): Promise<MealEntry[]> {
  const { data, error } = await supabase
    .from('meal_logs')
    .select('id, date, name, calories, protein_g, carbs_g, fats_g, product_id, grams, created_at')
    .eq('user_id', userId)
    .eq('date', date)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    date: r.date,
    name: r.name,
    calories: r.calories,
    proteinG: r.protein_g,
    carbsG: r.carbs_g,
    fatsG: r.fats_g,
    loggedAt: r.created_at,
    productId: r.product_id,
    grams: r.grams,
  }));
}

export async function addMeal(
  userId: string,
  date: string,
  meal: {
    name: string; calories: number; proteinG: number; carbsG: number; fatsG: number;
    productId?: string | null; grams?: number | null;
  }
): Promise<MealEntry> {
  const { data, error } = await supabase
    .from('meal_logs')
    .insert({
      user_id: userId,
      date,
      name: meal.name,
      calories: meal.calories,
      protein_g: meal.proteinG,
      carbs_g: meal.carbsG,
      fats_g: meal.fatsG,
      product_id: meal.productId ?? null,
      grams: meal.grams ?? null,
    })
    .select('id, date, name, calories, protein_g, carbs_g, fats_g, product_id, grams, created_at')
    .single();
  if (error) throw error;
  return {
    id: data.id,
    date: data.date,
    name: data.name,
    calories: data.calories,
    proteinG: data.protein_g,
    carbsG: data.carbs_g,
    fatsG: data.fats_g,
    loggedAt: data.created_at,
    productId: data.product_id,
    grams: data.grams,
  };
}

export async function deleteMeal(id: string): Promise<void> {
  const { error } = await supabase.from('meal_logs').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchDailyLog(userId: string, date: string): Promise<DailyLog> {
  const { data, error } = await supabase
    .from('daily_logs')
    .select('date, sleep_hours, sleep_quality, training_load, resting_heart_rate, recovery_score')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();
  if (error) throw error;
  if (!data) return EMPTY_DAILY_LOG(date);
  return {
    date: data.date,
    sleepHours: data.sleep_hours,
    sleepQuality: data.sleep_quality,
    trainingLoad: data.training_load,
    restingHeartRate: data.resting_heart_rate,
    recoveryScore: data.recovery_score,
  };
}

export async function upsertDailyLog(
  userId: string,
  date: string,
  patch: Partial<Omit<DailyLog, 'date'>>
): Promise<DailyLog> {
  const current = await fetchDailyLog(userId, date);
  const merged: DailyLog = { ...current, ...patch, date };
  const { data, error } = await supabase
    .from('daily_logs')
    .upsert({
      user_id: userId,
      date,
      sleep_hours: merged.sleepHours,
      sleep_quality: merged.sleepQuality,
      training_load: merged.trainingLoad,
      resting_heart_rate: merged.restingHeartRate,
      recovery_score: merged.recoveryScore,
      updated_at: new Date(),
    })
    .select('date, sleep_hours, sleep_quality, training_load, resting_heart_rate, recovery_score')
    .single();
  if (error) throw error;
  return {
    date: data.date,
    sleepHours: data.sleep_hours,
    sleepQuality: data.sleep_quality,
    trainingLoad: data.training_load,
    restingHeartRate: data.resting_heart_rate,
    recoveryScore: data.recovery_score,
  };
}

// Laatste `days` dagen (incl. vandaag), oudste eerst — gebruikt om bv. een
// rustpols-baseline te schatten in de hersteldscore.
export async function fetchRecentDailyLogs(userId: string, days: number): Promise<DailyLog[]> {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  const { data, error } = await supabase
    .from('daily_logs')
    .select('date, sleep_hours, sleep_quality, training_load, resting_heart_rate, recovery_score')
    .eq('user_id', userId)
    .gte('date', todayKey(since))
    .order('date', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    date: r.date,
    sleepHours: r.sleep_hours,
    sleepQuality: r.sleep_quality,
    trainingLoad: r.training_load,
    restingHeartRate: r.resting_heart_rate,
    recoveryScore: r.recovery_score,
  }));
}

// Laatste `days` dagen gewicht (incl. vandaag), oudste eerst — voedt de
// gewicht-grafiek op het Progress-scherm.
export async function fetchWeightLogs(userId: string, days: number): Promise<WeightLog[]> {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  const { data, error } = await supabase
    .from('weight_logs')
    .select('date, weight_kg')
    .eq('user_id', userId)
    .gte('date', todayKey(since))
    .order('date', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({ date: r.date, weightKg: Number(r.weight_kg) }));
}

// Eén gewichtsmeting loggen/overschrijven voor een gegeven dag (upsert op user_id+date).
export async function logWeight(userId: string, date: string, weightKg: number): Promise<void> {
  const { error } = await supabase
    .from('weight_logs')
    .upsert({ user_id: userId, date, weight_kg: weightKg });
  if (error) throw error;
}
