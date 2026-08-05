// src/services/trackingService.ts — dagelijkse tracking (maaltijden, slaap, herstel)
// Dunne laag rond Supabase voor de tabellen `meal_logs`, `daily_logs` en `products`
// (zie supabase/migrations/005_nutrition_recovery.sql, 006_products.sql, 009/010 voor
// de nutrition-redesign: meal_type, barcode/OFF-producten, favorieten, dagboek-afronding).
// Elke functie werkt op één gebruiker (user_id) + dag (date, YYYY-MM-DD). Water zelf
// loopt via useDaily()/`daily_progress` (Sprint 3) — niet via deze service.
import { supabase } from '../lib/supabase';
import type { DailyLog, DiaryDayStatus, MealEntry, MealType, Product, WeightLog } from '@/src/types/tracking';
import { EMPTY_DAILY_LOG } from '@/src/types/tracking';

export function todayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

const PRODUCT_COLUMNS = 'id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fats_per_100g, brand, barcode, source, image_url';
const MEAL_COLUMNS = 'id, date, name, calories, protein_g, carbs_g, fats_g, product_id, grams, created_at, meal_type';

function mapProductRow(r: any): Product {
  return {
    id: r.id,
    name: r.name,
    caloriesPer100g: r.calories_per_100g,
    proteinPer100g: r.protein_per_100g,
    carbsPer100g: r.carbs_per_100g,
    fatsPer100g: r.fats_per_100g,
    brand: r.brand,
    barcode: r.barcode,
    source: r.source,
    imageUrl: r.image_url,
  };
}

function mapMealRow(r: any): MealEntry {
  return {
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
    mealType: r.meal_type,
  };
}

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_COLUMNS)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapProductRow);
}

// Zoekscherm, tab "Alles" — RLS bepaalt vanzelf zichtbaarheid (reference/openfoodfacts
// publiek, eigen 'user'-producten alleen voor de eigenaar).
export async function searchProducts(query: string, limit = 30): Promise<Product[]> {
  const q = query.trim();
  if (!q) return [];
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_COLUMNS)
    .ilike('name', `%${q}%`)
    .order('name', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(mapProductRow);
}

// Zoekscherm, tab "Recent" — laatst gebruikte producten, nieuwste eerst, ontdubbeld.
export async function fetchRecentProducts(userId: string, limit = 20): Promise<Product[]> {
  const { data, error } = await supabase
    .from('meal_logs')
    .select(`product_id, created_at, products (${PRODUCT_COLUMNS})`)
    .eq('user_id', userId)
    .not('product_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit * 3); // marge voor ontdubbelen
  if (error) throw error;
  const seen = new Set<string>();
  const result: Product[] = [];
  for (const row of (data ?? []) as any[]) {
    if (!row.products || seen.has(row.product_id)) continue;
    seen.add(row.product_id);
    result.push(mapProductRow(row.products));
    if (result.length >= limit) break;
  }
  return result;
}

// Zoekscherm, tab "Favorieten".
export async function fetchFavoriteProducts(userId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('product_favorites')
    .select(`product_id, created_at, products (${PRODUCT_COLUMNS})`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as any[]).filter((r) => r.products).map((r) => mapProductRow(r.products));
}

export async function fetchFavoriteProductIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from('product_favorites').select('product_id').eq('user_id', userId);
  if (error) throw error;
  return new Set((data ?? []).map((r: any) => r.product_id));
}

export async function setFavoriteProduct(userId: string, productId: string, favorite: boolean): Promise<void> {
  if (favorite) {
    const { error } = await supabase.from('product_favorites').upsert({ user_id: userId, product_id: productId });
    if (error) throw error;
  } else {
    const { error } = await supabase.from('product_favorites').delete().eq('user_id', userId).eq('product_id', productId);
    if (error) throw error;
  }
}

// Zoekscherm, tab "Eigen items" — handmatig aangemaakte producten van deze gebruiker.
export async function fetchOwnProducts(userId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_COLUMNS)
    .eq('source', 'user')
    .eq('created_by', userId)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapProductRow);
}

// Handmatige invoer opslaan als eigen, herbruikbaar product (Fase 1: "slaat het item
// op als eigen product voor hergebruik"). barcode optioneel — al ingevuld als dit de
// fallback is na een mislukte barcodescan.
export async function createUserProduct(
  userId: string,
  input: { name: string; caloriesPer100g: number; proteinPer100g: number; carbsPer100g: number; fatsPer100g: number; barcode?: string | null }
): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert({
      name: input.name,
      calories_per_100g: input.caloriesPer100g,
      protein_per_100g: input.proteinPer100g,
      carbs_per_100g: input.carbsPer100g,
      fats_per_100g: input.fatsPer100g,
      barcode: input.barcode ?? null,
      source: 'user',
      created_by: userId,
    })
    .select(PRODUCT_COLUMNS)
    .single();
  if (error) throw error;
  return mapProductRow(data);
}

// Barcode → product via de 'product-lookup' Edge Function (eigen cache → Open Food
// Facts → cachen). Gooit nooit door bij "niet gevonden" — geeft dan gewoon null terug
// zodat de UI naar de handmatige-invoer-fallback kan (barcode al ingevuld).
export interface BarcodeLookupResult {
  product: Product | null;
  extra?: { fiberPer100g: number | null; sugarPer100g: number | null; saltPer100g: number | null; servingSize: string | null };
  origin: 'cache' | 'openfoodfacts' | 'not_found';
}

export async function lookupProductByBarcode(barcode: string): Promise<BarcodeLookupResult> {
  const { data, error } = await supabase.functions.invoke('product-lookup', { body: { barcode } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return {
    product: data.product ? { ...data.product, brand: data.product.brand ?? null, barcode: data.product.barcode ?? null, imageUrl: data.product.imageUrl ?? null } : null,
    extra: data.extra,
    origin: data.origin,
  };
}

export async function fetchMeals(userId: string, date: string): Promise<MealEntry[]> {
  const { data, error } = await supabase
    .from('meal_logs')
    .select(MEAL_COLUMNS)
    .eq('user_id', userId)
    .eq('date', date)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapMealRow);
}

export async function addMeal(
  userId: string,
  date: string,
  meal: {
    name: string; calories: number; proteinG: number; carbsG: number; fatsG: number;
    mealType: MealType; productId?: string | null; grams?: number | null;
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
      meal_type: meal.mealType,
      product_id: meal.productId ?? null,
      grams: meal.grams ?? null,
    })
    .select(MEAL_COLUMNS)
    .single();
  if (error) throw error;
  return mapMealRow(data);
}

export async function deleteMeal(id: string): Promise<void> {
  const { error } = await supabase.from('meal_logs').delete().eq('id', id);
  if (error) throw error;
}

// Overflow-menu op een dagboeksectie: "wis maaltijd" voor de hele sectie.
export async function clearMealSection(userId: string, date: string, mealType: MealType): Promise<void> {
  const { error } = await supabase.from('meal_logs').delete().eq('user_id', userId).eq('date', date).eq('meal_type', mealType);
  if (error) throw error;
}

// Overflow-menu: "kopieer van gisteren" — dupliceert alle items van dezelfde sectie
// van gisteren naar vandaag.
export async function copyMealsFromYesterday(userId: string, date: string, mealType: MealType): Promise<MealEntry[]> {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() - 1);
  const yesterday = todayKey(d);
  const { data: source, error: fetchError } = await supabase
    .from('meal_logs')
    .select('name, calories, protein_g, carbs_g, fats_g, product_id, grams')
    .eq('user_id', userId)
    .eq('date', yesterday)
    .eq('meal_type', mealType);
  if (fetchError) throw fetchError;
  if (!source || source.length === 0) return [];
  const rows = source.map((m: any) => ({
    user_id: userId, date, meal_type: mealType,
    name: m.name, calories: m.calories, protein_g: m.protein_g, carbs_g: m.carbs_g, fats_g: m.fats_g,
    product_id: m.product_id, grams: m.grams,
  }));
  const { data, error } = await supabase.from('meal_logs').insert(rows).select(MEAL_COLUMNS);
  if (error) throw error;
  return (data ?? []).map(mapMealRow);
}

// Overflow-menu: "kopieer naar andere maaltijd" — dupliceert één item naar een
// andere sectie van vandaag.
export async function copyMealToType(userId: string, meal: MealEntry, targetMealType: MealType): Promise<MealEntry> {
  return addMeal(userId, meal.date, {
    name: meal.name, calories: meal.calories, proteinG: meal.proteinG, carbsG: meal.carbsG, fatsG: meal.fatsG,
    mealType: targetMealType, productId: meal.productId, grams: meal.grams,
  });
}

// Weekstrip: per dag heeft de gebruiker iets gelogd + is het dagboek afgesloten.
// `dates` moet oplopend gesorteerd zijn (bv. maandag t/m zondag van de huidige week).
export async function fetchDiaryStatus(userId: string, dates: string[]): Promise<Record<string, DiaryDayStatus>> {
  if (dates.length === 0) return {};
  const from = dates[0];
  const to = dates[dates.length - 1];
  const [{ data: progressRows, error: progressError }, { data: mealRows, error: mealError }] = await Promise.all([
    supabase.from('daily_progress').select('date, diary_completed').eq('user_id', userId).gte('date', from).lte('date', to),
    supabase.from('meal_logs').select('date').eq('user_id', userId).gte('date', from).lte('date', to),
  ]);
  if (progressError) throw progressError;
  if (mealError) throw mealError;
  const completedByDate = new Map((progressRows ?? []).map((r: any) => [r.date, !!r.diary_completed]));
  const mealDates = new Set((mealRows ?? []).map((r: any) => r.date));
  const result: Record<string, DiaryDayStatus> = {};
  for (const date of dates) {
    result[date] = { date, hasMeals: mealDates.has(date), completed: completedByDate.get(date) ?? false };
  }
  return result;
}

// "Dagboek voltooien"-knop — alleen deze ene vlag, raakt steps/water/workout niet
// (partial upsert: PostgREST update-set bevat alleen de meegegeven kolommen).
export async function setDiaryCompleted(userId: string, date: string, completed: boolean): Promise<void> {
  const { error } = await supabase
    .from('daily_progress')
    .upsert({ user_id: userId, date, diary_completed: completed, updated_at: new Date() });
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
