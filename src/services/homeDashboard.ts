// src/services/homeDashboard.ts — data voor de stat-tegels en gewicht-kaart op Home.
// Haalt alles in één keer parallel op, per dag uitgelijnd op dezelfde datumlijst
// zodat elke sparkline dezelfde dagen toont. Bronnen (geen eigen tabel):
//   stappen   → daily_progress.steps (Sprint 3)
//   kcal/eiwit → som van meal_logs per dag
//   slaap     → daily_logs.sleep_hours (Recovery-scherm)
//   gewicht   → weight_logs
import { supabase } from '../lib/supabase';
import { todayKey, fetchRecentDailyLogs, fetchWeightLogs } from './trackingService';
import type { WeightLog } from '@/src/types/tracking';

export interface HomeStats {
  dates: string[];               // oudste eerst, laatste = vandaag
  steps: number[];               // 0 op dagen zonder rij
  calories: number[];
  proteinG: number[];
  sleepHours: (number | null)[]; // null = die dag niet gelogd (≠ 0 uur geslapen)
  weightLogs: WeightLog[];       // laatste 30 dagen, oudste eerst
}

function lastDateKeys(days: number): string[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return todayKey(d);
  });
}

export async function fetchHomeStats(userId: string, days = 7): Promise<HomeStats> {
  const dates = lastDateKeys(days);
  const since = dates[0];

  const [progressRes, mealsRes, dailyLogs, weightLogs] = await Promise.all([
    supabase.from('daily_progress').select('date, steps').eq('user_id', userId).gte('date', since),
    supabase.from('meal_logs').select('date, calories, protein_g').eq('user_id', userId).gte('date', since),
    fetchRecentDailyLogs(userId, days),
    // 30 dagen i.p.v. 7: de week-vergelijking heeft een meting van ≥ 7 dagen oud nodig.
    fetchWeightLogs(userId, 30),
  ]);
  if (progressRes.error) throw progressRes.error;
  if (mealsRes.error) throw mealsRes.error;

  const stepsByDate = new Map<string, number>((progressRes.data ?? []).map((r: any) => [r.date, r.steps]));

  const caloriesByDate = new Map<string, number>();
  const proteinByDate = new Map<string, number>();
  for (const m of mealsRes.data ?? []) {
    caloriesByDate.set(m.date, (caloriesByDate.get(m.date) ?? 0) + Number(m.calories));
    proteinByDate.set(m.date, (proteinByDate.get(m.date) ?? 0) + Number(m.protein_g));
  }

  const sleepByDate = new Map(dailyLogs.map((l) => [l.date, l.sleepHours]));

  return {
    dates,
    steps: dates.map((d) => stepsByDate.get(d) ?? 0),
    calories: dates.map((d) => Math.round(caloriesByDate.get(d) ?? 0)),
    proteinG: dates.map((d) => Math.round(proteinByDate.get(d) ?? 0)),
    sleepHours: dates.map((d) => sleepByDate.get(d) ?? null),
    weightLogs,
  };
}
