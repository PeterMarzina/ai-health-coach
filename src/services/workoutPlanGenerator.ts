// src/services/workoutPlanGenerator.ts — genereert een workout-plan uit simpele templates
// Kiest oefeningen uit de exercise-database op basis van hun 'type' (push/pull/legs/core),
// gekoppeld aan een template (Push/Pull/Legs of Full Body). Puur functioneel: geen
// Supabase-calls hier, dat gebeurt in src/services/workouts.ts.
import type { Exercise, ExerciseType, PlannedExercise, TemplateKey } from '@/src/types/workout';

const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  push: 'Push Day',
  pull: 'Pull Day',
  legs: 'Leg Day',
  full_body: 'Full Body',
};

// Welke oefening-types (kolom 'type') horen bij elke template, en hoeveel oefeningen
// van dat type de generator pakt.
const TEMPLATE_COMPOSITION: Record<TemplateKey, { type: ExerciseType; count: number }[]> = {
  push: [{ type: 'push', count: 5 }],
  pull: [{ type: 'pull', count: 5 }],
  legs: [{ type: 'legs', count: 5 }, { type: 'core', count: 1 }],
  full_body: [{ type: 'push', count: 2 }, { type: 'pull', count: 2 }, { type: 'legs', count: 2 }, { type: 'core', count: 1 }],
};

const DEFAULT_SETS = 3;
const DEFAULT_REPS = '8-12';

export function templateLabel(key: TemplateKey): string {
  return TEMPLATE_LABELS[key];
}

export function generateWorkoutPlan(exercises: Exercise[], template: TemplateKey): PlannedExercise[] {
  const composition = TEMPLATE_COMPOSITION[template];
  const used = new Set<string>();
  const plan: PlannedExercise[] = [];

  for (const part of composition) {
    const pool = exercises.filter((e) => e.type === part.type && !used.has(e.id));
    for (const exercise of pool.slice(0, part.count)) {
      used.add(exercise.id);
      plan.push({ exercise, targetSets: DEFAULT_SETS, targetReps: DEFAULT_REPS });
    }
  }
  return plan;
}
