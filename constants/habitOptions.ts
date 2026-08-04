// constants/habitOptions.ts — vaste keuzes voor het aanmaken van een habit
// Kleuren: uitsluitend bestaande theme-hues (geen vrije hex-colorpicker, zie
// AGENTS.md Deel B1). Iconen: uitsluitend bestaande namen uit components/Icon.tsx.
import type { HabitColorToken } from '@/src/types/habit';
import type { IconName } from '@/components/Icon';

export const HABIT_COLOR_TOKENS: HabitColorToken[] = [
  'accent', 'water', 'protein', 'calories', 'fats', 'sleep', 'carbs',
];

export const HABIT_ICONS: IconName[] = [
  'target', 'droplet', 'moon', 'footsteps', 'flame', 'leaf', 'sparkle', 'dumbbell', 'check', 'flag',
];
