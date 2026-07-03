// src/types/workout.ts — schema van het workout-systeem (Sprint 4)
//
// Exercise             = een rij uit de `exercises`-referentietabel.
// PlannedExercise      = een oefening zoals die in een workout-plan/-sessie staat
//                         (met doel-sets/reps), zie src/services/workoutPlanGenerator.ts.
// WorkoutSession        = een gestarte/gestopte trainingssessie (`workout_sessions`).
// LoggedSet            = een individuele gelogde set (reps/gewicht, `workout_sets`),
//                         de basis voor de progressive-overload view.

export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core';
export type ExerciseType = 'push' | 'pull' | 'legs' | 'core';
export type TemplateKey = 'push' | 'pull' | 'legs' | 'full_body';

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  type: ExerciseType;
}

export interface PlannedExercise {
  exercise: Exercise;
  targetSets: number;
  targetReps: string; // bv. "8-12"
}

export interface WorkoutSession {
  id: string;
  name: string;
  startedAt: string; // ISO-timestamp
  endedAt: string | null;
}

export interface LoggedSet {
  id: string;
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  reps: number;
  weightKg: number;
  completedAt: string; // ISO-timestamp
}
