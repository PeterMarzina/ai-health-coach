// src/services/workouts.ts — Supabase-calls voor het workout-systeem
// Oefeningen ophalen, een sessie starten/stoppen, sets loggen en de
// voortgang per oefening (progressive overload) uitlezen.
import { supabase } from '../lib/supabase';
import type { Exercise, LoggedSet, PlannedExercise, TemplateKey, WorkoutSession } from '@/src/types/workout';
import { generateWorkoutPlan, templateLabel } from './workoutPlanGenerator';

function mapExercise(row: any): Exercise {
  return { id: row.id, name: row.name, muscleGroup: row.muscle_group, type: row.type };
}

function mapSession(row: any): WorkoutSession {
  return { id: row.id, name: row.name, startedAt: row.started_at, endedAt: row.ended_at };
}

function mapSet(row: any): LoggedSet {
  return {
    id: row.id,
    sessionId: row.session_id,
    exerciseId: row.exercise_id,
    setNumber: row.set_number,
    reps: row.reps,
    weightKg: row.weight_kg,
    completedAt: row.completed_at,
  };
}

export async function fetchExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase.from('exercises').select('id, name, muscle_group, type').order('name');
  if (error) throw error;
  return (data ?? []).map(mapExercise);
}

// Sessie die al gestart maar nog niet beëindigd is (ended_at = null), zodat de
// gebruiker een lopende training kan hervatten in plaats van er per ongeluk
// een tweede te starten.
export async function fetchActiveSession(userId: string): Promise<WorkoutSession | null> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapSession(data) : null;
}

// Start een nieuwe workout-sessie op basis van een template: haalt de oefeningen-
// database op, genereert het plan, en maakt de sessie + gekoppelde oefeningen aan.
export async function startWorkoutSession(
  userId: string,
  template: TemplateKey
): Promise<{ session: WorkoutSession; plan: PlannedExercise[] }> {
  const exercises = await fetchExercises();
  const plan = generateWorkoutPlan(exercises, template);

  const { data: sessionRow, error: sessionError } = await supabase
    .from('workout_sessions')
    .insert({ user_id: userId, name: templateLabel(template) })
    .select()
    .single();
  if (sessionError) throw sessionError;

  const rows = plan.map((p, i) => ({
    session_id: sessionRow.id,
    exercise_id: p.exercise.id,
    position: i,
    target_sets: p.targetSets,
    target_reps: p.targetReps,
  }));
  const { error: linkError } = await supabase.from('workout_session_exercises').insert(rows);
  if (linkError) throw linkError;

  return { session: mapSession(sessionRow), plan };
}

export async function endWorkoutSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('workout_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', sessionId);
  if (error) throw error;
}

// De oefeningen (het gegenereerde plan) die bij een sessie horen, in volgorde.
export async function fetchSessionExercises(sessionId: string): Promise<PlannedExercise[]> {
  const { data, error } = await supabase
    .from('workout_session_exercises')
    .select('position, target_sets, target_reps, exercises(id, name, muscle_group, type)')
    .eq('session_id', sessionId)
    .order('position');
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    exercise: mapExercise(r.exercises),
    targetSets: r.target_sets,
    targetReps: r.target_reps,
  }));
}

// Aantal gelogde sets per oefening binnen een sessie — voor de voortgangsindicator
// ("2/3 sets") op het sessie-overzicht.
export async function fetchSessionSetCounts(sessionId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase.from('workout_sets').select('exercise_id').eq('session_id', sessionId);
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of data ?? []) counts[row.exercise_id] = (counts[row.exercise_id] ?? 0) + 1;
  return counts;
}

// Alle gelogde sets van 1 oefening binnen 1 sessie, voor het logformulier.
export async function fetchSessionExerciseSets(sessionId: string, exerciseId: string): Promise<LoggedSet[]> {
  const { data, error } = await supabase
    .from('workout_sets')
    .select('*')
    .eq('session_id', sessionId)
    .eq('exercise_id', exerciseId)
    .order('set_number');
  if (error) throw error;
  return (data ?? []).map(mapSet);
}

// Sets/reps/gewicht loggen voor 1 oefening binnen een sessie.
export async function logSet(
  sessionId: string,
  exerciseId: string,
  setNumber: number,
  reps: number,
  weightKg: number
): Promise<void> {
  const { error } = await supabase.from('workout_sets').insert({
    session_id: sessionId,
    exercise_id: exerciseId,
    set_number: setNumber,
    reps,
    weight_kg: weightKg,
  });
  if (error) throw error;
}

// Progressive overload: alle gelogde sets van 1 oefening over alle sessies van
// deze user, oplopend op tijd. Voedt de grafiek/tabel op het geschiedenisscherm.
export async function fetchExerciseHistory(userId: string, exerciseId: string): Promise<LoggedSet[]> {
  const { data, error } = await supabase
    .from('workout_sets')
    .select('*, workout_sessions!inner(user_id)')
    .eq('exercise_id', exerciseId)
    .eq('workout_sessions.user_id', userId)
    .order('completed_at');
  if (error) throw error;
  return (data ?? []).map(mapSet);
}

// Aantal afgeronde trainingen (sessies met een ended_at) van deze gebruiker —
// voedt de "Workouts / Total"-tegel op het Profiel-scherm.
export async function fetchCompletedSessionCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('workout_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .not('ended_at', 'is', null);
  if (error) throw error;
  return count ?? 0;
}

// Totale trainingsvolume (som van reps × gewicht) per dag, over de laatste
// `days` dagen — voedt de workout-trendgrafiek op het Progress-scherm.
export async function fetchWorkoutVolumeHistory(userId: string, days: number): Promise<{ date: string; volumeKg: number }[]> {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  const { data, error } = await supabase
    .from('workout_sets')
    .select('reps, weight_kg, completed_at, workout_sessions!inner(user_id)')
    .eq('workout_sessions.user_id', userId)
    .gte('completed_at', since.toISOString())
    .order('completed_at');
  if (error) throw error;

  const byDate = new Map<string, number>();
  for (const row of data ?? []) {
    const day = (row.completed_at as string).slice(0, 10);
    byDate.set(day, (byDate.get(day) ?? 0) + row.reps * Number(row.weight_kg));
  }
  return Array.from(byDate.entries())
    .map(([date, volumeKg]) => ({ date, volumeKg }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
