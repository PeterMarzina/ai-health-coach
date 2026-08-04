// src/types/habit.ts — schema van de habit tracker (Deel B)
import type { HabitSchedule } from '@/src/services/habitStreak';

export type HabitType = 'boolean' | 'count';

// Vaste swatch uit het bestaande theme-palet (geen vrije hex-colorpicker,
// zie AGENTS.md Deel B1). `withAlpha`/de kleur zelf wordt opgezocht via
// constants/habitColors.ts.
export type HabitColorToken = 'accent' | 'calories' | 'protein' | 'carbs' | 'fats' | 'water' | 'sleep';

export interface Habit {
  id: string;
  name: string;
  icon: string;
  colorToken: HabitColorToken;
  type: HabitType;
  targetValue: number | null; // vereist bij type 'count'
  unit: string | null;
  schedule: HabitSchedule;
  reminderEnabled: boolean;
  reminderTime: string | null; // 'HH:MM'
  archivedAt: string | null;
  createdAt: string;
}

export interface HabitEntry {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  value: number;
  completed: boolean;
}

// Vandaag-lijst-item: de habit + zijn entry van vandaag (indien die al bestaat).
export interface HabitWithToday {
  habit: Habit;
  today: HabitEntry | null;
  currentStreak: number;
}
