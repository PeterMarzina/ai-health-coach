// supabase/functions/coach-chat/index.ts — Sprint 8: Deep Context Coach (Edge Function, Deno)
//
// Doet drie dingen, gestuurd via `mode` in de request body:
//   'chat'      → coach-gesprek met VOLLEDIGE user-context (buildCoachContext) + action tools
//   'intake'    → chat-gebaseerde onboarding: verzamelt de intake-antwoorden en genereert
//                 direct een eerste workout-plan (tools complete_intake + update_workout_plan)
//   'summarize' → korte samenvatting van een afgerond gesprek, opgeslagen in
//                 coach_conversation_summaries (het "geheugen" van de coach)
//
// GEEN Anthropic meer. Dit draait volledig op DeepSeek's eigen (OpenAI-compatibele) API
// via de `openai` npm-package, gericht op base_url https://api.deepseek.com. Er is dus
// geen Anthropic API key nodig — alleen een DEEPSEEK_API_KEY.
//
// Model: deepseek-v4-pro voor de coach-gesprekken — reasoning-model met 1M context,
// prima geschikt voor lange, complexe USER_CONTEXT. Samenvattingen draaien op
// deepseek-v4-flash (klein/goedkoop; geen diepe context of thinking nodig).
//
// Tool calling gebeurt in het OpenAI function-calling formaat: tools zijn
// { type: 'function', function: { name, description, parameters } }, en tool-antwoorden
// van het model komen terug als message.tool_calls (met JSON-string arguments) i.p.v.
// Anthropic's tool_use content-blocks. De hele agentic loop is hierop aangepast.
//
// Alle database-reads/-writes gebruiken een Supabase-client met de JWT van de aanroeper,
// zodat RLS gewoon van kracht blijft — deze functie kan dus nooit data van andere
// gebruikers lezen of schrijven, ook niet als het model rare tool-inputs verzint.
//
// Secrets: DEEPSEEK_API_KEY (Supabase secret). SUPABASE_URL/SUPABASE_ANON_KEY worden
// automatisch geïnjecteerd. Deploy: supabase functions deploy coach-chat

import OpenAI from 'npm:openai@4';
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

const COACH_MODEL = 'deepseek-v4-pro';     // reasoning-model, voor het coach-gesprek
const SUMMARY_MODEL = 'deepseek-v4-flash'; // snel/goedkoop, voor samenvattingen
const MAX_TOOL_ITERATIONS = 8; // V4 is agressiever met tool-retries dan Claude was

// Reasoning-effort voor het coach-gesprek: 'high' geeft een goede balans tussen
// redeneerkwaliteit en output-tokens (dus kosten/latency). 'max' kan beter redeneren
// bij complexe context, maar V4-Pro staat bekend als "very verbose" in die stand —
// verhoog alleen als je merkt dat 'high' tekortschiet.
const COACH_REASONING_EFFORT = 'high';

// Guardrail (punt 8): maximale omvang van de context-payload in (geschatte) tokens.
// Boven deze grens comprimeren we verder: kortere raw-vensters, minder samenvattingen.
const MAX_CONTEXT_TOKENS = 8000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Ruwe token-schatting (~4 tekens per token). Alleen voor de guardrail — hoeft niet
// exact te zijn, zolang we maar consequent dezelfde maat gebruiken.
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function daysAgoDate(days: number): string {
  return daysAgoIso(days).slice(0, 10);
}

// ── Context-aggregator (punt 1) ──────────────────────────────────────────────
// Haalt alles over de user op en bundelt het tot één compact JSON-object.
// Recente data (≤ 4 weken) gaat vrij gedetailleerd mee; oudere workouts worden
// samengevat tot weektotalen om tokens te sparen.

interface CoachContext {
  profile: unknown;
  goals: unknown;
  measurements: unknown;
  gamification: { streakDays: number; xpTotal: number };
  exerciseDatabase: string[];
  currentWorkoutPlan: unknown;
  recentWorkouts: unknown[];       // laatste 4 weken, per sessie samengevat
  olderWorkoutsPerWeek: unknown[]; // week 5-12, weektotalen
  nutritionPerDay: unknown[];      // dagtotalen uit meal_logs
  recoveryLogs: unknown[];         // daily_logs: slaap/belasting/herstel
  dailyActivity: unknown[];        // daily_progress: stappen/water/workout + dagscores
  weightLogs: unknown[];
  lifestyleRecommendations: unknown[];
  previousConversations: unknown[]; // samenvattingen van eerdere gesprekken
}

async function buildCoachContext(supabase: SupabaseClient, userId: string): Promise<CoachContext> {
  const RAW_DAYS = 28;      // "laatste 4 weken raw"
  const OLDER_DAYS = 84;    // daarbuiten: samenvatten per week
  const MEAL_DAYS = 14;
  const SUMMARY_COUNT = 8;

  const [
    profileRes,
    exercisesRes,
    planRes,
    sessionsRes,
    olderSetsRes,
    mealsRes,
    dailyLogsRes,
    dailyProgressRes,
    weightRes,
    recsRes,
    summariesRes,
  ] = await Promise.all([
    supabase.from('profiles')
      .select('full_name, profile_context, goals, measurements, streak_days, xp_total')
      .eq('id', userId).maybeSingle(),
    supabase.from('exercises').select('name').order('name'),
    supabase.from('workout_plans').select('plan, updated_at').eq('user_id', userId).maybeSingle(),
    supabase.from('workout_sessions')
      .select('id, name, started_at, ended_at')
      .eq('user_id', userId)
      .gte('started_at', daysAgoIso(RAW_DAYS))
      .order('started_at', { ascending: false }),
    supabase.from('workout_sets')
      .select('session_id, reps, weight_kg, completed_at, workout_sessions!inner(user_id)')
      .eq('workout_sessions.user_id', userId)
      .gte('completed_at', daysAgoIso(OLDER_DAYS))
      .lt('completed_at', daysAgoIso(RAW_DAYS)),
    supabase.from('meal_logs')
      .select('date, calories, protein_g, carbs_g, fats_g')
      .eq('user_id', userId)
      .gte('date', daysAgoDate(MEAL_DAYS)),
    supabase.from('daily_logs')
      .select('date, sleep_hours, sleep_quality, training_load, resting_heart_rate, recovery_score')
      .eq('user_id', userId)
      .gte('date', daysAgoDate(RAW_DAYS))
      .order('date', { ascending: true }),
    supabase.from('daily_progress')
      .select('date, workout_done, steps, water_l')
      .eq('user_id', userId)
      .gte('date', daysAgoDate(RAW_DAYS))
      .order('date', { ascending: true }),
    supabase.from('weight_logs')
      .select('date, weight_kg')
      .eq('user_id', userId)
      .gte('date', daysAgoDate(OLDER_DAYS))
      .order('date', { ascending: true }),
    supabase.from('lifestyle_recommendations')
      .select('category, text, created_at')
      .eq('user_id', userId)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('coach_conversation_summaries')
      .select('created_at, source, summary')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(SUMMARY_COUNT),
  ]);

  // Sets van de recente sessies ophalen (met oefeningnaam) en per sessie comprimeren
  // tot: per oefening → aantal sets, totaal reps, topgewicht, volume.
  const sessions = sessionsRes.data ?? [];
  let recentWorkouts: unknown[] = [];
  if (sessions.length > 0) {
    const { data: setRows } = await supabase.from('workout_sets')
      .select('session_id, reps, weight_kg, exercises(name)')
      .in('session_id', sessions.map((s: any) => s.id));

    recentWorkouts = sessions.map((s: any) => {
      const perExercise = new Map<string, { sets: number; totalReps: number; topWeightKg: number; volumeKg: number }>();
      for (const row of (setRows ?? []).filter((r: any) => r.session_id === s.id)) {
        const name = (row as any).exercises?.name ?? 'unknown';
        const cur = perExercise.get(name) ?? { sets: 0, totalReps: 0, topWeightKg: 0, volumeKg: 0 };
        const weight = Number((row as any).weight_kg);
        cur.sets += 1;
        cur.totalReps += (row as any).reps;
        cur.topWeightKg = Math.max(cur.topWeightKg, weight);
        cur.volumeKg += (row as any).reps * weight;
        perExercise.set(name, cur);
      }
      return {
        date: (s.started_at as string).slice(0, 10),
        name: s.name,
        completed: !!s.ended_at,
        exercises: Array.from(perExercise.entries()).map(([name, agg]) => ({
          name,
          ...agg,
          volumeKg: Math.round(agg.volumeKg),
        })),
      };
    });
  }

  // Oudere workouts (week 5-12): alleen weektotalen — sessies + volume per week.
  const perWeek = new Map<string, { sessionIds: Set<string>; volumeKg: number }>();
  for (const row of olderSetsRes.data ?? []) {
    const d = new Date((row as any).completed_at);
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // maandag van die week
    const key = monday.toISOString().slice(0, 10);
    const cur = perWeek.get(key) ?? { sessionIds: new Set<string>(), volumeKg: 0 };
    cur.sessionIds.add((row as any).session_id);
    cur.volumeKg += (row as any).reps * Number((row as any).weight_kg);
    perWeek.set(key, cur);
  }
  const olderWorkoutsPerWeek = Array.from(perWeek.entries())
    .map(([weekStart, agg]) => ({ weekStart, sessions: agg.sessionIds.size, volumeKg: Math.round(agg.volumeKg) }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  // Maaltijden → dagtotalen (raw maaltijden zijn te veel tokens voor te weinig signaal).
  const perDay = new Map<string, { meals: number; kcal: number; proteinG: number; carbsG: number; fatsG: number }>();
  for (const m of mealsRes.data ?? []) {
    const cur = perDay.get((m as any).date) ?? { meals: 0, kcal: 0, proteinG: 0, carbsG: 0, fatsG: 0 };
    cur.meals += 1;
    cur.kcal += (m as any).calories;
    cur.proteinG += (m as any).protein_g;
    cur.carbsG += (m as any).carbs_g;
    cur.fatsG += (m as any).fats_g;
    perDay.set((m as any).date, cur);
  }
  const nutritionPerDay = Array.from(perDay.entries())
    .map(([date, agg]) => ({ date, ...agg }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const profile = profileRes.data ?? {};
  return {
    profile: (profile as any).profile_context ?? null,
    goals: (profile as any).goals ?? null,
    measurements: (profile as any).measurements ?? null,
    gamification: {
      streakDays: (profile as any).streak_days ?? 0,
      xpTotal: (profile as any).xp_total ?? 0,
    },
    exerciseDatabase: (exercisesRes.data ?? []).map((e: any) => e.name),
    currentWorkoutPlan: planRes.data?.plan ?? null,
    recentWorkouts,
    olderWorkoutsPerWeek,
    nutritionPerDay,
    recoveryLogs: dailyLogsRes.data ?? [],
    dailyActivity: dailyProgressRes.data ?? [],
    weightLogs: weightRes.data ?? [],
    lifestyleRecommendations: recsRes.data ?? [],
    previousConversations: summariesRes.data ?? [],
  };
}

// Guardrail (punt 8): als de payload te groot is, comprimeer verder — steeds een
// stap agressiever, tot het past. Werkt op het al-opgehaalde object (geen refetch).
function enforceContextBudget(ctx: CoachContext): CoachContext {
  const fits = (c: CoachContext) => estimateTokens(JSON.stringify(c)) <= MAX_CONTEXT_TOKENS;
  if (fits(ctx)) return ctx;

  // Stap 1: raw-venster naar 2 weken, minder samenvattingen/gewichtspunten.
  const cutoff14 = daysAgoDate(14);
  let c: CoachContext = {
    ...ctx,
    recentWorkouts: (ctx.recentWorkouts as any[]).filter((w) => w.date >= cutoff14),
    nutritionPerDay: (ctx.nutritionPerDay as any[]).slice(-7),
    recoveryLogs: (ctx.recoveryLogs as any[]).slice(-14),
    dailyActivity: (ctx.dailyActivity as any[]).slice(-14),
    weightLogs: (ctx.weightLogs as any[]).filter((_, i, arr) => i % 2 === 0 || i === arr.length - 1),
    previousConversations: (ctx.previousConversations as any[]).slice(0, 4),
  };
  if (fits(c)) return c;

  // Stap 2: alleen de allerlaatste week raw + weektotalen, minimale historie.
  const cutoff7 = daysAgoDate(7);
  c = {
    ...c,
    recentWorkouts: (c.recentWorkouts as any[]).filter((w) => w.date >= cutoff7),
    nutritionPerDay: (c.nutritionPerDay as any[]).slice(-3),
    recoveryLogs: (c.recoveryLogs as any[]).slice(-7),
    dailyActivity: (c.dailyActivity as any[]).slice(-7),
    weightLogs: (c.weightLogs as any[]).slice(-8),
    previousConversations: (c.previousConversations as any[]).slice(0, 2),
  };
  return c;
}

// ── System prompts (punt 3) ─────────────────────────────────────────────────

function langLabel(lang: string): string {
  return lang === 'en' ? 'English' : 'Nederlands';
}

function chatSystemPrompt(lang: string): string {
  return `Je bent de persoonlijke AI-coach in de app "AI Health Coach" (fitness + voeding + herstel).

WERKWIJZE — ALTIJD IN DEZE VOLGORDE
1. Analyseer eerst de VOLLEDIGE context in het blok USER_CONTEXT (profiel, workout-history, voeding, slaap/herstel, gewicht, streak/XP, eerdere gesprekken) voordat je ook maar iets antwoordt.
2. Zoek naar patronen en verbanden over de tijd, niet naar losse datapunten. Voorbeelden: stagnatie in topgewicht/volume per oefening, verband tussen slechte slaap en lage herstelscores of gemiste workouts, te lage eiwit-inname t.o.v. het doel, te veel of te weinig trainingsvolume voor het niveau, gewichtstrend vs. streefgewicht.
3. Verwerk wat eerder is besproken (previousConversations) — herhaal geen advies dat al gegeven is, maar bouw erop voort.
4. Kom waar relevant met CONCRETE actie, niet alleen praat: gebruik je tools om het workout-plan aan te passen (update_workout_plan), een lifestyle-aanbeveling vast te leggen (add_lifestyle_recommendation) of voedingsdoelen bij te stellen (adjust_nutrition_targets). Gebruik een tool alleen als het gesprek daar aanleiding toe geeft of de gebruiker erom vraagt — niet bij elk bericht.

REGELS
- Baseer je uitsluitend op cijfers/feiten uit USER_CONTEXT en het gesprek. Verzin nooit getallen. Ontbreekt iets, benoem dat dan kort.
- Bij update_workout_plan: kies bij voorkeur oefeningen uit exerciseDatabase (die kent de app), en respecteer niveau en beschikbare trainingsdagen van de gebruiker.
- Je bent geen arts. Bij signalen van een mogelijk medisch probleem adviseer je een arts/specialist te raadplegen in plaats van zelf een oplossing te verzinnen.
- Toon: warm, direct, motiverend, geen jargon. Antwoord in lopende tekst zonder markdown-opmaak (geen koppen, geen sterretjes), maximaal ~130 woorden per antwoord. Bullets mogen alleen als je een plan of lijstje opsomt, met "-".
- Als het eerste bericht [SESSION_START] is: begroet de gebruiker persoonlijk bij naam en noem 1-2 concrete, opvallende observaties uit de data (positief of aandachtspunt), en nodig uit tot een vraag. Geen lange monoloog.
- Verwijs niet naar jezelf als AI of taalmodel en leg je werkwijze niet uit.

TAAL VOOR ALLE ANTWOORDEN: ${langLabel(lang)}. Mix geen talen.`;
}

function intakeSystemPrompt(lang: string): string {
  return `Je bent de AI-coach van de app "AI Health Coach" en voert het INTAKE-GESPREK met een nieuwe gebruiker, als alternatief voor een formulier.

DOEL
Verzamel in een natuurlijk, vlot gesprek precies deze gegevens:
- name (voornaam)
- goal: lose | muscle | fit | maintain
- fitnessLevel: beginner | intermediate | advanced
- trainingDaysPerWeek: 0-7 (huidige routine)
- routineTypes: subset van [strength, cardio, sports] of [none]
- sleepHours (gemiddeld per nacht), stressLevel (1-5), alcohol (ja/nee), smoking (ja/nee)
- currentWeight (kg), targetWeight (kg), height (cm), age (jaren)
- activityLevel: low | med | high (dagelijkse activiteit buiten trainingen)

WERKWIJZE
- Stel per beurt maximaal 2 korte vragen; groepeer wat logisch samen hoort (bv. gewicht+streefgewicht, of slaap+stress). Reageer kort en menselijk op de antwoorden.
- Vertaal spreektaal zelf naar de juiste waarde (bv. "ik wil afvallen" → goal=lose, "3x per week naar de sportschool" → trainingDaysPerWeek=3, routineTypes=[strength]).
- Vraag door als een antwoord niet te mappen is of onrealistisch lijkt (bv. lengte 30 cm).
- Zodra ALLES compleet is: roep EERST de tool complete_intake aan met de exacte waarden, en roep DAARNA (in dezelfde beurt) update_workout_plan aan met een passend eerste weekplan: aantal dagen ≤ wat haalbaar is voor de gebruiker, oefeningen bij voorkeur uit exerciseDatabase in USER_CONTEXT, sets/reps passend bij niveau en doel.
- Sluit daarna af met een korte, motiverende samenvatting van het plan. Zeg erbij dat de app op basis van de antwoorden ook calorie-, eiwit- en slaapdoelen berekent en klaarzet. Verzin die getallen NIET zelf.

REGELS
- Geen medische diagnoses. Lopende tekst zonder markdown-opmaak, kort en vriendelijk (max ~90 woorden per beurt).
- Bij [SESSION_START]: stel jezelf in 1 zin voor en stel meteen de eerste vraag (naam + hoofddoel).

TAAL VOOR ALLE ANTWOORDEN: ${langLabel(lang)}. Mix geen talen.`;
}

// ── Action tools (punt 4) — OpenAI function-calling formaat ─────────────────

const WORKOUT_PLAN_PARAMS = {
  type: 'object',
  properties: {
    daysPerWeek: { type: 'integer', description: 'Aantal trainingsdagen per week (1-7)' },
    days: {
      type: 'array',
      description: 'De trainingsdagen van het weekplan, in volgorde',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Naam van de dag, bv. "Push Day" of "Full Body A"' },
          focus: { type: 'string', description: 'Korte focus-omschrijving, bv. "borst/schouders/triceps"' },
          exercises: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Naam van de oefening, bij voorkeur exact uit exerciseDatabase' },
                sets: { type: 'integer' },
                reps: { type: 'string', description: 'Rep-bereik, bv. "8-12"' },
              },
              required: ['name', 'sets', 'reps'],
            },
          },
        },
        required: ['name', 'exercises'],
      },
    },
    notes: { type: 'string', description: 'Korte toelichting bij het plan (progressie, rust, etc.)' },
  },
  required: ['daysPerWeek', 'days'],
} as const;

function buildTools(mode: 'chat' | 'intake'): OpenAI.Chat.Completions.ChatCompletionTool[] {
  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
      type: 'function',
      function: {
        name: 'update_workout_plan',
        description:
          'Vervang het actuele workout-plan van de gebruiker door een nieuw weekplan. Gebruik dit wanneer het gesprek aanleiding geeft om de training aan te passen (stagnatie, ander doel, te hoog/laag volume) of wanneer de gebruiker om een (nieuw) plan vraagt. Het plan wordt direct opgeslagen en in de app getoond.',
        parameters: WORKOUT_PLAN_PARAMS as any,
      },
    },
    {
      type: 'function',
      function: {
        name: 'add_lifestyle_recommendation',
        description:
          'Leg één concrete lifestyle-aanbeveling vast die de gebruiker in de app terugziet (bv. "Ga 30 min eerder naar bed op trainingsdagen"). Gebruik dit voor advies dat de moeite waard is om te onthouden en op te volgen — niet voor elke losse opmerking.',
        parameters: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'De aanbeveling, kort en concreet, in de taal van het gesprek' },
            category: {
              type: 'string',
              enum: ['sleep', 'stress', 'nutrition', 'activity', 'recovery', 'habits', 'other'],
            },
          },
          required: ['text', 'category'],
        } as any,
      },
    },
    {
      type: 'function',
      function: {
        name: 'adjust_nutrition_targets',
        description:
          'Pas de dagelijkse voedingsdoelen van de gebruiker aan (kcal en/of macro\'s in gram). Alleen de meegegeven velden worden gewijzigd. Gebruik dit alleen met duidelijke onderbouwing vanuit de data of op verzoek van de gebruiker.',
        parameters: {
          type: 'object',
          properties: {
            calories: { type: 'integer', description: 'Nieuw calorie-doel per dag (kcal)' },
            protein_g: { type: 'integer', description: 'Nieuw eiwit-doel per dag (gram)' },
            carbs_g: { type: 'integer', description: 'Nieuw koolhydraat-doel per dag (gram)' },
            fats_g: { type: 'integer', description: 'Nieuw vet-doel per dag (gram)' },
          },
          required: [],
        } as any,
      },
    },
  ];

  if (mode === 'intake') {
    tools.push({
      type: 'function',
      function: {
        name: 'complete_intake',
        description:
          'Rond het intake-gesprek af. Roep dit pas aan als ALLE intake-gegevens bekend zijn. De app bouwt hiermee het profiel en berekent calorie-/macro-/slaap-/stappendoelen.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            goal: { type: 'string', enum: ['lose', 'muscle', 'fit', 'maintain'] },
            fitnessLevel: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
            trainingDaysPerWeek: { type: 'integer' },
            routineTypes: {
              type: 'array',
              items: { type: 'string', enum: ['strength', 'cardio', 'sports', 'none'] },
            },
            sleepHours: { type: 'number' },
            stressLevel: { type: 'integer' },
            alcohol: { type: 'boolean' },
            smoking: { type: 'boolean' },
            currentWeight: { type: 'number' },
            targetWeight: { type: 'number' },
            height: { type: 'number' },
            age: { type: 'integer' },
            activityLevel: { type: 'string', enum: ['low', 'med', 'high'] },
          },
          required: [
            'name', 'goal', 'fitnessLevel', 'trainingDaysPerWeek', 'routineTypes',
            'sleepHours', 'stressLevel', 'alcohol', 'smoking',
            'currentWeight', 'targetWeight', 'height', 'age', 'activityLevel',
          ],
        } as any,
      },
    });
  }
  return tools;
}

// Voert een tool-aanroep van het model direct uit in de database (punt 4).
// complete_intake is de uitzondering: die wordt niet hier maar client-side verwerkt
// (de app hergebruikt buildAIProfile voor de afgeleide doelen), dus we bevestigen alleen.
async function executeTool(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  input: any
): Promise<{ ok: boolean; result: string }> {
  try {
    switch (name) {
      case 'update_workout_plan': {
        const { error } = await supabase.from('workout_plans').upsert({
          user_id: userId,
          plan: input,
          source: 'coach',
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
        return { ok: true, result: 'Workout-plan opgeslagen en zichtbaar in de app.' };
      }
      case 'add_lifestyle_recommendation': {
        const { error } = await supabase.from('lifestyle_recommendations').insert({
          user_id: userId,
          text: input.text,
          category: input.category ?? 'other',
        });
        if (error) throw error;
        return { ok: true, result: 'Aanbeveling vastgelegd.' };
      }
      case 'adjust_nutrition_targets': {
        const { data: row, error: readError } = await supabase
          .from('profiles').select('goals').eq('id', userId).single();
        if (readError) throw readError;
        const goals = { ...(row?.goals ?? {}) };
        if (typeof input.calories === 'number') goals.calories = input.calories;
        if (typeof input.protein_g === 'number') goals.protein = input.protein_g;
        if (typeof input.carbs_g === 'number') goals.carbs = input.carbs_g;
        if (typeof input.fats_g === 'number') goals.fats = input.fats_g;
        const { error } = await supabase
          .from('profiles')
          .update({ goals, updated_at: new Date().toISOString() })
          .eq('id', userId);
        if (error) throw error;
        return { ok: true, result: `Voedingsdoelen bijgewerkt: ${JSON.stringify(goals)}` };
      }
      case 'complete_intake':
        return {
          ok: true,
          result: 'Intake-antwoorden geregistreerd. De app bouwt nu het profiel en berekent de doelen.',
        };
      default:
        return { ok: false, result: `Onbekende tool: ${name}` };
    }
  } catch (e) {
    return { ok: false, result: `Tool mislukt: ${String((e as any)?.message ?? e)}` };
  }
}

// Parseert de JSON-string arguments die OpenAI-style tool_calls meegeven. Als het
// model onverhoopt kapotte JSON teruggeeft, behandelen we dat als een mislukte tool-call
// i.p.v. de hele request te laten crashen.
function parseToolArguments(raw: string): { ok: true; value: any } | { ok: false; error: string } {
  try {
    return { ok: true, value: raw ? JSON.parse(raw) : {} };
  } catch (e) {
    return { ok: false, error: `Kon tool-argumenten niet parsen: ${String((e as any)?.message ?? e)}` };
  }
}

// ── De agentic loop: model ↔ tools tot het klaar is ─────────────────────────

interface ChatRequestMessage { role: 'user' | 'assistant'; content: string }
interface CoachAction { tool: string; input: unknown; ok: boolean }

async function runCoachChat(
  deepseek: OpenAI,
  supabase: SupabaseClient,
  userId: string,
  mode: 'chat' | 'intake',
  lang: string,
  history: ChatRequestMessage[]
): Promise<{ content: string; actions: CoachAction[] }> {
  // Context bouwen — óók bij intake (dan zit er vooral de oefeningen-database in,
  // plus alles wat er eventueel al is van een eerder/half afgerond profiel).
  const context = enforceContextBudget(await buildCoachContext(supabase, userId));

  // Bij het openen van de chat (punt 6) stuurt de client een lege history: het
  // model moet dan zelf openen, volledig geïnformeerd door de context.
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: mode === 'intake' ? intakeSystemPrompt(lang) : chatSystemPrompt(lang) },
    { role: 'system', content: `USER_CONTEXT (JSON):\n${JSON.stringify(context)}` },
    ...(history.length
      ? history.map((m) => ({ role: m.role, content: m.content } as OpenAI.Chat.Completions.ChatCompletionMessageParam))
      : [{ role: 'user', content: '[SESSION_START]' } as OpenAI.Chat.Completions.ChatCompletionMessageParam]),
  ];

  const tools = buildTools(mode);
  const actions: CoachAction[] = [];
  let finalText = '';

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    // deepseek-v4-pro met reasoning_effort 'high': redeneert over de volledige
    // USER_CONTEXT zonder overdreven veel output-tokens te verstoken (V4-Pro op
    // 'max' staat bekend als erg verbose). Geen temperature/top_p meegeven — de
    // API-defaults zijn prima voor dit gebruik.
    const response = await deepseek.chat.completions.create({
      model: COACH_MODEL,
      max_tokens: 4096,
      messages,
      tools,
      reasoning_effort: COACH_REASONING_EFFORT,
      // @ts-ignore — DeepSeek-specifiek veld, niet in de standaard OpenAI-types
      thinking: { type: 'enabled' },
    } as any);

    const choice = response.choices[0];
    const message = choice.message;
    finalText = (message.content ?? '').trim();

    const toolCalls = message.tool_calls ?? [];
    if (choice.finish_reason !== 'tool_calls' || toolCalls.length === 0) break;

    // Assistant-beurt (incl. tool_calls) integraal terugsturen, en per tool_call
    // een apart 'tool'-bericht met het resultaat — vereist door de Chat Completions API.
    messages.push({ role: 'assistant', content: message.content ?? null, tool_calls: toolCalls } as any);

    for (const toolCall of toolCalls) {
      const fnName = toolCall.function.name;
      const parsed = parseToolArguments(toolCall.function.arguments);
      let outcome: { ok: boolean; result: string };
      if (!parsed.ok) {
        outcome = { ok: false, result: parsed.error };
      } else {
        outcome = await executeTool(supabase, userId, fnName, parsed.value);
      }
      actions.push({ tool: fnName, input: parsed.ok ? parsed.value : toolCall.function.arguments, ok: outcome.ok });
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: outcome.result,
      } as any);
    }
  }

  return { content: finalText, actions };
}

// ── Samenvatting van een gesprek (punt 7) ────────────────────────────────────

async function summarizeConversation(
  deepseek: OpenAI,
  supabase: SupabaseClient,
  userId: string,
  source: 'chat' | 'intake',
  lang: string,
  history: ChatRequestMessage[]
): Promise<string> {
  const transcript = history
    .map((m) => `${m.role === 'user' ? 'GEBRUIKER' : 'COACH'}: ${m.content}`)
    .join('\n')
    .slice(0, 24000); // hard cap; samenvatten hoeft niet op een compleet boek

  const response = await deepseek.chat.completions.create({
    model: SUMMARY_MODEL,
    max_tokens: 300,
    messages: [
      {
        role: 'system',
        content:
          `Vat het volgende coach-gesprek samen in maximaal 5 zinnen, in het ${langLabel(lang)}. ` +
          'Benoem: waar de gebruiker mee zat of naar vroeg, wat de coach adviseerde, en welke concrete acties/wijzigingen er zijn doorgevoerd (plan/doelen/aanbevelingen). ' +
          'Schrijf feitelijk, derde persoon, geen opmaak. Deze samenvatting is het geheugen van de coach voor volgende gesprekken.',
      },
      { role: 'user', content: transcript },
    ],
  });

  const summary = (response.choices[0]?.message?.content ?? '').trim();

  if (summary) {
    const { error } = await supabase.from('coach_conversation_summaries').insert({
      user_id: userId,
      source,
      summary,
    });
    if (error) throw error;
  }
  return summary;
}

// ── Guardrails: rate limit + gespreksomvang ──────────────────────────────────
// Zelfde reden als ai-coach: DEEPSEEK_API_KEY is één gedeelde, betaalde sleutel.
// Teller in coach_chat_calls, geschreven met de service-role key (de client mag zijn
// eigen limiet niet kunnen resetten). Elke aanroep telt, ook summarize.

const RATE_LIMIT_PER_MINUTE = 10;
const RATE_LIMIT_PER_DAY = 80;
const MAX_HISTORY_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 4000;

// De client stuurt het hele gesprek mee; zonder plafond kan één request de
// context (en de rekening) onbeperkt opblazen. Houd de nieuwste berichten.
function capHistory(history: ChatRequestMessage[]): ChatRequestMessage[] {
  return history
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }));
}

// Geeft een foutmelding terug als de limiet bereikt is, anders null (en telt de aanroep).
async function checkRateLimit(userId: string): Promise<string | null> {
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );
  const nowMs = Date.now();
  const [minuteRes, dayRes] = await Promise.all([
    admin.from('coach_chat_calls').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).gte('called_at', new Date(nowMs - 60_000).toISOString()),
    admin.from('coach_chat_calls').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).gte('called_at', new Date(nowMs - 24 * 60 * 60_000).toISOString()),
  ]);
  if (minuteRes.error) throw minuteRes.error;
  if (dayRes.error) throw dayRes.error;
  if ((minuteRes.count ?? 0) >= RATE_LIMIT_PER_MINUTE) return 'Even rustig aan — probeer het over een minuut opnieuw.';
  if ((dayRes.count ?? 0) >= RATE_LIMIT_PER_DAY) return 'Daglimiet voor de coach bereikt, probeer het morgen opnieuw.';

  const { error } = await admin.from('coach_chat_calls').insert({ user_id: userId });
  if (error) throw error;
  return null;
}

// ── HTTP entrypoint ──────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('DEEPSEEK_API_KEY');
    if (!apiKey) {
      console.error('coach-chat: DEEPSEEK_API_KEY ontbreekt (zet als Supabase secret)');
      return json({ error: 'De coach is nu niet bereikbaar, probeer het later opnieuw.' }, 500);
    }

    // Supabase-client met de JWT van de aanroeper: alle queries/writes vallen
    // onder RLS van deze gebruiker.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Geen Authorization header' }, 401);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
    );
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) return json({ error: 'Niet ingelogd' }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const mode: string = body.mode ?? 'chat';
    const lang: string = body.lang === 'en' ? 'en' : 'nl';
    const history = capHistory(
      Array.isArray(body.messages)
        ? body.messages
            .filter((m: any) => (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string')
            .map((m: any) => ({ role: m.role, content: m.content }))
        : []
    );

    const limited = await checkRateLimit(userId);
    if (limited) return json({ error: limited }, 429);

    // Native DeepSeek-client (OpenAI SDK, DeepSeek base_url). Geen Anthropic meer nodig.
    const deepseek = new OpenAI({ apiKey, baseURL: DEEPSEEK_BASE_URL });

    if (mode === 'summarize') {
      if (!history.some((m) => m.role === 'user')) {
        return json({ summary: '' }); // niets te onthouden
      }
      const summary = await summarizeConversation(
        deepseek, supabase, userId,
        body.source === 'intake' ? 'intake' : 'chat',
        lang, history
      );
      return json({ summary });
    }

    if (mode !== 'chat' && mode !== 'intake') {
      return json({ error: `Onbekende mode: ${mode}` }, 400);
    }

    const result = await runCoachChat(deepseek, supabase, userId, mode, lang, history);
    return json(result);
  } catch (e) {
    // Details alleen in de functie-logs; de ruwe fout (bv. van DeepSeek) hoort niet in de app.
    console.error('coach-chat: onverwachte fout', e);
    return json({ error: 'De coach kon nu niet antwoorden, probeer het later opnieuw.' }, 500);
  }
});
