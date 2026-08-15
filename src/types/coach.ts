// src/types/coach.ts — vorm van het workout-plan dat de AI-coach schrijft.
//
// Dit is geen zelfbedacht schema: het is exact de JSON die de coach-chat Edge
// Function via de tool `update_workout_plan` in `workout_plans.plan` (jsonb) zet.
// De tool-parameters daar (WORKOUT_PLAN_PARAMS) zijn leidend — wijzigt die kant,
// dan moet dit bestand mee, anders praat de app langs de opgeslagen data heen.
//
// Let op `reps`: dat is bewust een string, geen number. Het model levert een
// rep-bereik ("8-12"), niet één getal.

export interface AIWorkoutExercise {
  name: string;   // bij voorkeur exact een naam uit de exercises-tabel
  sets: number;
  reps: string;   // rep-bereik, bv. "8-12"
}

export interface AIWorkoutDay {
  name: string;                     // bv. "Push Day" of "Full Body A"
  focus?: string;                   // korte omschrijving, bv. "borst/schouders/triceps"
  exercises: AIWorkoutExercise[];
}

export interface AIWorkoutPlan {
  daysPerWeek: number;
  days: AIWorkoutDay[];
  notes?: string;                   // toelichting bij het plan (progressie, rust, etc.)
}

// Eén rij uit `workout_plans`. De tabel heeft geen eigen id-kolom: user_id is de
// sleutel, en de coach doet een upsert — er is dus hooguit één plan per gebruiker.
export interface WorkoutPlanRecord {
  plan: AIWorkoutPlan;
  source: string;      // 'coach' bij een plan uit het coach-gesprek
  updatedAt: string;   // ISO-timestamp
}
