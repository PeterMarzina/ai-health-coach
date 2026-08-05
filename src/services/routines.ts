// src/services/routines.ts — Supabase-calls voor routines/templates (Deel A3)
import { supabase } from '../lib/supabase';
import type { Routine, RoutineExercise } from '@/src/types/workout';

function mapRoutine(row: any): Routine {
  return { id: row.id, name: row.name, isTemplate: !!row.is_template };
}

// Ingebouwde templates (Full Body, Push/Pull/Legs, Upper/Lower) + eigen
// opgeslagen routines van deze user, templates eerst.
export async function fetchRoutines(userId: string): Promise<Routine[]> {
  const { data, error } = await supabase
    .from('routines')
    .select('id, name, is_template')
    .or(`is_template.eq.true,user_id.eq.${userId}`)
    .order('is_template', { ascending: false })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapRoutine);
}

export async function fetchRoutineExercises(routineId: string): Promise<RoutineExercise[]> {
  const { data, error } = await supabase
    .from('routine_exercises')
    .select('id, position, target_sets, target_reps, target_rest_seconds, set_type, exercises(id, name, muscle_group, type, equipment, is_custom)')
    .eq('routine_id', routineId)
    .order('position');
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    position: r.position,
    targetSets: r.target_sets,
    targetReps: r.target_reps,
    targetRestSeconds: r.target_rest_seconds,
    setType: r.set_type,
    exercise: {
      id: r.exercises.id,
      name: r.exercises.name,
      muscleGroup: r.exercises.muscle_group,
      type: r.exercises.type,
      equipment: r.exercises.equipment ?? null,
      isCustom: !!r.exercises.is_custom,
    },
  }));
}

// Een afgeronde sessie opslaan als eigen routine (A3): kopieert de oefeningen
// (met hun geplande sets/reps) naar een nieuwe, niet-template routine.
export async function saveSessionAsRoutine(
  userId: string,
  name: string,
  exercises: { exerciseId: string; targetSets: number; targetReps: string; targetRestSeconds: number }[]
): Promise<Routine> {
  const { data: routineRow, error: routineError } = await supabase
    .from('routines')
    .insert({ user_id: userId, name, is_template: false })
    .select('id, name, is_template')
    .single();
  if (routineError) throw routineError;

  if (exercises.length > 0) {
    const { error: exError } = await supabase.from('routine_exercises').insert(
      exercises.map((e, i) => ({
        routine_id: routineRow.id,
        exercise_id: e.exerciseId,
        position: i,
        target_sets: e.targetSets,
        target_reps: e.targetReps,
        target_rest_seconds: e.targetRestSeconds,
      }))
    );
    if (exError) throw exError;
  }
  return mapRoutine(routineRow);
}

export async function deleteRoutine(routineId: string): Promise<void> {
  const { error } = await supabase.from('routines').delete().eq('id', routineId);
  if (error) throw error;
}
