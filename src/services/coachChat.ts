// src/services/coachChat.ts — praat met de AI-coach (Edge Function coach-chat) en
// leest het workout-plan dat de coach schrijft.
//
// De coach-chat Edge Function schrijft het plan zelf weg (tool `update_workout_plan`,
// upsert op `workout_plans`) met de JWT van de gebruiker, dus onder RLS. De app hoeft
// het alleen nog te lezen — vandaar dat hier geen schrijf-functie voor het plan staat.
//
// Er is hooguit één rij per gebruiker (user_id is de sleutel, de coach upsert),
// dus `maybeSingle`: geen plan is een normale situatie voor wie nog geen
// coach-gesprek heeft gevoerd, geen fout.
import { supabase } from '../lib/supabase';
import { functionErrorMessage } from '../lib/functionError';
import type { AIWorkoutPlan, WorkoutPlanRecord } from '@/src/types/coach';
import type { Lang } from '@/constants/i18n';

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

// ── Chat ─────────────────────────────────────────────────────────────────────

export interface CoachChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Wat de coach server-side heeft uitgevoerd (zie executeTool in coach-chat).
export type CoachTool = 'update_workout_plan' | 'add_lifestyle_recommendation' | 'adjust_nutrition_targets' | 'complete_intake';
export interface CoachAction {
  tool: CoachTool;
  ok: boolean;
}

export interface CoachReply {
  content: string;
  actions: CoachAction[];
}

// Stuurt het hele gesprek mee (de functie is stateless) en krijgt het antwoord plus
// de acties die de coach heeft uitgevoerd. Gooit een Error met een leesbare melding.
export async function sendCoachMessage(messages: CoachChatMessage[], lang: Lang, fallbackError: string): Promise<CoachReply> {
  const { data, error } = await supabase.functions.invoke('coach-chat', {
    body: { mode: 'chat', lang, messages },
  });
  if (error) throw new Error(await functionErrorMessage(error, fallbackError));
  return {
    content: typeof data?.content === 'string' ? data.content : '',
    actions: Array.isArray(data?.actions)
      ? data.actions.map((a: any) => ({ tool: a.tool, ok: !!a.ok }))
      : [],
  };
}

// Vat een afgerond gesprek samen tot het "geheugen" van de coach
// (coach_conversation_summaries). Best-effort: een mislukte samenvatting mag de
// gebruiker niet storen, dus fouten worden alleen gelogd.
export async function summarizeCoachConversation(messages: CoachChatMessage[], lang: Lang): Promise<void> {
  if (!messages.some((m) => m.role === 'user')) return;
  const { error } = await supabase.functions.invoke('coach-chat', {
    body: { mode: 'summarize', source: 'chat', lang, messages },
  });
  if (error) console.warn('Coach-gesprek samenvatten mislukt', error);
}
