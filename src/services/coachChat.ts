// src/services/coachChat.ts — leest het workout-plan van de AI-coach.
//
// De coach-chat Edge Function schrijft het plan zelf weg (tool `update_workout_plan`,
// upsert op `workout_plans`) met de JWT van de gebruiker, dus onder RLS. De app hoeft
// het alleen nog te lezen — vandaar dat hier geen schrijf-functie staat.
//
// Er is hooguit één rij per gebruiker (user_id is de sleutel, de coach upsert),
// dus `maybeSingle`: geen plan is een normale situatie voor wie nog geen
// coach-gesprek heeft gevoerd, geen fout.
import { supabase } from '../lib/supabase';
import type { AIWorkoutPlan, WorkoutPlanRecord } from '@/src/types/coach';

const PLAN_COLUMNS = 'plan, source, updated_at';

// `plan` is een jsonb-kolom: Postgres bewaart wat het model aanleverde, zonder dat
// iets die vorm afdwingt. Daarom hier een minimale check op de twee velden waar
// plan.tsx op rekent (daysPerWeek + days), zodat een half plan de Plan-tab niet
// laat crashen op `aiPlan.days.map`.
function isWorkoutPlan(value: unknown): value is AIWorkoutPlan {
  const p = value as AIWorkoutPlan | null;
  return !!p && typeof p.daysPerWeek === 'number' && Array.isArray(p.days);
}

export async function fetchAIWorkoutPlan(userId: string): Promise<WorkoutPlanRecord | null> {
  const { data, error } = await supabase
    .from('workout_plans')
    .select(PLAN_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data || !isWorkoutPlan(data.plan)) return null;

  return {
    plan: data.plan,
    source: data.source,
    updatedAt: data.updated_at,
  };
}
