// src/types/workout.ts — schema van het workout-systeem
//
// Exercise             = een rij uit de `exercises`-tabel (ingebouwd of eigen).
// PlannedExercise      = een oefening zoals die in een workout-plan/-sessie staat
//                         (met doel-sets/reps/rust), zie workoutPlanGenerator.ts.
// WorkoutSession        = een gestarte/gestopte trainingssessie (`workout_sessions`).
// LoggedSet            = een individuele gelogde set (reps/gewicht/type, `workout_sets`).
// Routine              = een opgeslagen sjabloon (eigen of ingebouwd) met oefeningen.
// PersonalRecord        = een PR-gebeurtenis (`personal_records`), append-only.

export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core';
export type ExerciseType = 'push' | 'pull' | 'legs' | 'core';
export type TemplateKey = 'push' | 'pull' | 'legs' | 'full_body';
export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'kettlebell' | 'bands';

// normal = telt gewoon mee; warmup = telt nooit mee in PR's/volume;
// drop/failure = telt wel mee, maar worden apart gelabeld in de UI.
export type SetType = 'normal' | 'warmup' | 'drop' | 'failure';

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  type: ExerciseType;
  equipment: Equipment | null;
  isCustom: boolean;
}

export interface PlannedExercise {
  exercise: Exercise;
  targetSets: number;
  targetReps: string; // bv. "8-12"
  targetRestSeconds: number;
}

export interface WorkoutSession {
  id: string;
  name: string;
  startedAt: string; // ISO-timestamp
  endedAt: string | null;
  routineId: string | null;
}

export interface LoggedSet {
  id: string;
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  reps: number;
  weightKg: number;
  setType: SetType;
  completedAt: string; // ISO-timestamp
}

export interface Routine {
  id: string;
  name: string;
  isTemplate: boolean;
}

export interface RoutineExercise {
  id: string;
  exercise: Exercise;
  position: number;
  targetSets: number;
  targetReps: string;
  targetRestSeconds: number;
  setType: SetType;
}

export type PersonalRecordType = 'max_weight' | 'max_1rm' | 'max_reps_at_weight';

export interface PersonalRecord {
  id: string;
  exerciseId: string;
  sessionId: string | null;
  recordType: PersonalRecordType;
  weightKg: number;
  reps: number;
  estimatedOneRm: number;
  achievedAt: string;
}

// Samenvatting van een net afgeronde sessie (A4) — puur weergave-data, niet
// een eigen tabel: duur/volume/sets worden berekend uit de sets van de sessie,
// PR's komen uit de personal_records die net zijn weggeschreven.
export interface SessionSummary {
  session: WorkoutSession;
  durationSeconds: number;
  totalVolumeKg: number;
  totalSets: number;
  exerciseCount: number;
  personalRecords: (PersonalRecord & { exerciseName: string })[];
}
