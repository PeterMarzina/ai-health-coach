// src/services/workouts.ts — Supabase-calls voor het workout-systeem (Deel A1/A2/A4)
// Oefeningen (bibliotheek + eigen), sessies starten/hervatten/beëindigen, sets
// wegschrijven en de voortgang per oefening (progressive overload + "vorige
// prestatie") uitlezen. De crash-safe orchestratie (lokale cache, sync-retries)
// leeft in workoutSession.ts — dit bestand praat alleen met Supabase.
import { supabase } from '../lib/supabase';
import type { Exercise, Equipment, LoggedSet, MuscleGroup, PersonalRecord, PersonalRecordType, PlannedExercise, SetType, WorkoutSession } from '@/src/types/workout';

function mapExercise(row: any): Exercise {
  return {
    id: row.id,
    name: row.name,
    muscleGroup: row.muscle_group,
    type: row.type,
    equipment: row.equipment ?? null,
    isCustom: !!row.is_custom,
  };
}

function mapSession(row: any): WorkoutSession {
  return { id: row.id, name: row.name, startedAt: row.started_at, endedAt: row.ended_at, routineId: row.routine_id ?? null };
}

function mapSet(row: any): LoggedSet {
  return {
    id: row.id,
    sessionId: row.session_id,
    exerciseId: row.exercise_id,
    setNumber: row.set_number,
    reps: row.reps,
    weightKg: Number(row.weight_kg),
    setType: (row.set_type ?? 'normal') as SetType,
    completedAt: row.completed_at,
  };
}

const EXERCISE_COLUMNS = 'id, name, muscle_group, type, equipment, is_custom, user_id';

// ── Oefeningenbibliotheek (Deel A2) ──────────────────────────────
export async function fetchExercises(filters?: {
  search?: string;
  muscleGroup?: MuscleGroup;
  equipment?: Equipment;
}): Promise<Exercise[]> {
  let query = supabase.from('exercises').select(EXERCISE_COLUMNS).order('name');
  if (filters?.search) query = query.ilike('name', `%${filters.search}%`);
  if (filters?.muscleGroup) query = query.eq('muscle_group', filters.muscleGroup);
  if (filters?.equipment) query = query.eq('equipment', filters.equipment);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapExercise);
}

export async function fetchExercisesByIds(exerciseIds: string[]): Promise<Exercise[]> {
  if (exerciseIds.length === 0) return [];
  const { data, error } = await supabase.from('exercises').select(EXERCISE_COLUMNS).in('id', exerciseIds);
  if (error) throw error;
  return (data ?? []).map(mapExercise);
}

export async function fetchExerciseById(exerciseId: string): Promise<Exercise | null> {
  const { data, error } = await supabase.from('exercises').select(EXERCISE_COLUMNS).eq('id', exerciseId).maybeSingle();
  if (error) throw error;
  return data ? mapExercise(data) : null;
}

export async function createCustomExercise(
  userId: string,
  input: { name: string; muscleGroup: MuscleGroup; type: Exercise['type']; equipment: Equipment | null }
): Promise<Exercise> {
  const { data, error } = await supabase
    .from('exercises')
    .insert({
      name: input.name,
      muscle_group: input.muscleGroup,
      type: input.type,
      equipment: input.equipment,
      is_custom: true,
      user_id: userId,
    })
    .select(EXERCISE_COLUMNS)
    .single();
  if (error) throw error;
  return mapExercise(data);
}

// ── Actieve sessie: lezen ────────────────────────────────────────
// Sessie die al gestart maar nog niet beëindigd is, zodat de gebruiker een
// lopende training kan hervatten i.p.v. er per ongeluk een tweede te starten.
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

export async function fetchSessionExercises(sessionId: string): Promise<PlannedExercise[]> {
  const { data, error } = await supabase
    .from('workout_session_exercises')
    .select(`position, target_sets, target_reps, target_rest_seconds, exercises(${EXERCISE_COLUMNS})`)
    .eq('session_id', sessionId)
    .order('position');
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    exercise: mapExercise(r.exercises),
    targetSets: r.target_sets,
    targetReps: r.target_reps,
    targetRestSeconds: r.target_rest_seconds,
  }));
}

// Zelfde data als fetchSessionExercises, maar met de eigen rij-id erbij — nodig
// om een lokale sessie te hydrateren (workoutSession.ts) zodat oefeningen later
// nog verwijderd/bijgewerkt kunnen worden.
export async function fetchSessionExerciseRows(sessionId: string): Promise<
  { id: string; exerciseId: string; position: number; targetSets: number; targetReps: string; targetRestSeconds: number }[]
> {
  const { data, error } = await supabase
    .from('workout_session_exercises')
    .select('id, exercise_id, position, target_sets, target_reps, target_rest_seconds')
    .eq('session_id', sessionId)
    .order('position');
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    exerciseId: r.exercise_id,
    position: r.position,
    targetSets: r.target_sets,
    targetReps: r.target_reps,
    targetRestSeconds: r.target_rest_seconds,
  }));
}

export async function fetchSessionSets(sessionId: string): Promise<LoggedSet[]> {
  const { data, error } = await supabase.from('workout_sets').select('*').eq('session_id', sessionId).order('set_number');
  if (error) throw error;
  return (data ?? []).map(mapSet);
}

// ── Actieve sessie: schrijven (client-gegenereerde id's, zie localId.ts) ──
// Deze functies krijgen hun id's altijd al klaar aangeleverd door
// workoutSession.ts, zodat een mislukte/herhaalde poging altijd veilig
// opnieuw geprobeerd kan worden (upsert i.p.v. insert).
export async function upsertSessionRemote(row: {
  id: string;
  userId: string;
  name: string;
  routineId: string | null;
  startedAt: string;
}): Promise<void> {
  const { error } = await supabase.from('workout_sessions').upsert({
    id: row.id,
    user_id: row.userId,
    name: row.name,
    routine_id: row.routineId,
    started_at: row.startedAt,
  });
  if (error) throw error;
}

export async function upsertSessionExercisesRemote(
  sessionId: string,
  rows: { id: string; exerciseId: string; position: number; targetSets: number; targetReps: string; targetRestSeconds: number }[]
): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase.from('workout_session_exercises').upsert(
    rows.map((r) => ({
      id: r.id,
      session_id: sessionId,
      exercise_id: r.exerciseId,
      position: r.position,
      target_sets: r.targetSets,
      target_reps: r.targetReps,
      target_rest_seconds: r.targetRestSeconds,
    }))
  );
  if (error) throw error;
}

export async function deleteSessionExerciseRemote(id: string): Promise<void> {
  const { error } = await supabase.from('workout_session_exercises').delete().eq('id', id);
  if (error) throw error;
}

export async function upsertSetRemote(row: {
  id: string;
  userId: string;
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  reps: number;
  weightKg: number;
  setType: SetType;
  completedAt: string;
}): Promise<void> {
  const { error } = await supabase.from('workout_sets').upsert({
    id: row.id,
    user_id: row.userId,
    session_id: row.sessionId,
    exercise_id: row.exerciseId,
    set_number: row.setNumber,
    reps: row.reps,
    weight_kg: row.weightKg,
    set_type: row.setType,
    completed_at: row.completedAt,
  });
  if (error) throw error;
}

export async function deleteSetRemote(id: string): Promise<void> {
  const { error } = await supabase.from('workout_sets').delete().eq('id', id);
  if (error) throw error;
}

export async function endWorkoutSession(sessionId: string, endedAt: string = new Date().toISOString()): Promise<void> {
  const { error } = await supabase.from('workout_sessions').update({ ended_at: endedAt }).eq('id', sessionId);
  if (error) throw error;
}

// Sessie die per ongeluk gestart is en niet meegeteld moet worden (bv. bij het
// negeren van een "Sessie hervatten?"-prompt): verwijdert de sessie + (via
// cascade) al zijn oefeningen/sets.
export async function deleteWorkoutSession(sessionId: string): Promise<void> {
  const { error } = await supabase.from('workout_sessions').delete().eq('id', sessionId);
  if (error) throw error;
}

// ── Progressive overload & "vorige prestatie" (A1/A4) ────────────
// De belangrijkste query van dit systeem (zie AGENTS.md A5): de sets van de
// meest recente ándere sessie waarin deze oefening voorkwam, op setnummer
// gesorteerd — voedt "vorige: 80kg × 8" + de auto-fill per set.
export async function fetchPreviousExerciseSets(
  userId: string,
  exerciseId: string,
  excludeSessionId: string
): Promise<LoggedSet[]> {
  const { data: lastRow, error: lastErr } = await supabase
    .from('workout_sets')
    .select('session_id')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .neq('session_id', excludeSessionId)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastErr) throw lastErr;
  if (!lastRow) return [];

  const { data, error } = await supabase
    .from('workout_sets')
    .select('*')
    .eq('session_id', lastRow.session_id)
    .eq('exercise_id', exerciseId)
    .order('set_number');
  if (error) throw error;
  return (data ?? []).map(mapSet);
}

// Alle historische sets (alle sessies) van deze user voor een lijst oefeningen,
// exclusief de net afgeronde sessie — input voor PR-detectie (personalRecords.ts).
export async function fetchHistoricalSetsByExercise(
  userId: string,
  exerciseIds: string[],
  excludeSessionId: string
): Promise<Record<string, LoggedSet[]>> {
  if (exerciseIds.length === 0) return {};
  const { data, error } = await supabase
    .from('workout_sets')
    .select('*')
    .eq('user_id', userId)
    .in('exercise_id', exerciseIds)
    .neq('session_id', excludeSessionId);
  if (error) throw error;
  const byExercise: Record<string, LoggedSet[]> = {};
  for (const row of data ?? []) {
    const set = mapSet(row);
    (byExercise[set.exerciseId] ??= []).push(set);
  }
  return byExercise;
}

// Progressive overload: alle gelogde sets van 1 oefening over alle sessies van
// deze user, oplopend op tijd. Voedt de grafiek/tabel op exercise-history.tsx.
export async function fetchExerciseHistory(userId: string, exerciseId: string): Promise<LoggedSet[]> {
  const { data, error } = await supabase
    .from('workout_sets')
    .select('*')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
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

// Totale trainingsvolume (som van reps × gewicht, warmups uitgesloten) per dag,
// over de laatste `days` dagen — voedt de workout-trendgrafiek op Progress.
export async function fetchWorkoutVolumeHistory(userId: string, days: number): Promise<{ date: string; volumeKg: number }[]> {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  const { data, error } = await supabase
    .from('workout_sets')
    .select('reps, weight_kg, completed_at, set_type')
    .eq('user_id', userId)
    .gte('completed_at', since.toISOString())
    .order('completed_at');
  if (error) throw error;

  const byDate = new Map<string, number>();
  for (const row of data ?? []) {
    if (row.set_type === 'warmup') continue;
    const day = (row.completed_at as string).slice(0, 10);
    byDate.set(day, (byDate.get(day) ?? 0) + row.reps * Number(row.weight_kg));
  }
  return Array.from(byDate.entries())
    .map(([date, volumeKg]) => ({ date, volumeKg }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ── Personal records (Deel A4) ────────────────────────────────────
// Append-only: personalRecords.ts (puur) bepaalt WELKE PR's verbroken zijn,
// hier schrijven we ze alleen weg / lezen we ze terug voor de sessie-samenvatting.
export async function insertPersonalRecords(
  userId: string,
  sessionId: string,
  records: { exerciseId: string; recordType: PersonalRecordType; weightKg: number; reps: number; estimatedOneRm: number }[]
): Promise<void> {
  if (records.length === 0) return;
  const { error } = await supabase.from('personal_records').insert(
    records.map((r) => ({
      user_id: userId,
      session_id: sessionId,
      exercise_id: r.exerciseId,
      record_type: r.recordType,
      weight_kg: r.weightKg,
      reps: r.reps,
      estimated_1rm: r.estimatedOneRm,
    }))
  );
  if (error) throw error;
}

function mapPersonalRecord(row: any): PersonalRecord & { exerciseName: string } {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    sessionId: row.session_id,
    recordType: row.record_type,
    weightKg: Number(row.weight_kg),
    reps: row.reps,
    estimatedOneRm: Number(row.estimated_1rm),
    achievedAt: row.achieved_at,
    exerciseName: row.exercises?.name ?? '',
  };
}

export async function fetchPersonalRecordsForSession(sessionId: string): Promise<(PersonalRecord & { exerciseName: string })[]> {
  const { data, error } = await supabase.from('personal_records').select('*, exercises(name)').eq('session_id', sessionId);
  if (error) throw error;
  return (data ?? []).map(mapPersonalRecord);
}

export async function fetchRecentPersonalRecords(userId: string, limit = 20): Promise<(PersonalRecord & { exerciseName: string })[]> {
  const { data, error } = await supabase
    .from('personal_records')
    .select('*, exercises(name)')
    .eq('user_id', userId)
    .order('achieved_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(mapPersonalRecord);
}
