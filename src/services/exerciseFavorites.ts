// src/services/exerciseFavorites.ts — favorieten + recent gebruikt (Deel A2)
// Puur lokale UX-voorkeur (geen cross-device sync nodig), dus AsyncStorage
// i.p.v. een eigen tabel/migratie — zelfde soort keuze als de taalvoorkeur in
// components/store.tsx.
import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = 'exercise_favorites';
const RECENT_KEY = 'exercise_recent';
const RECENT_MAX = 10;

export async function getFavoriteExerciseIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(FAVORITES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export async function toggleFavoriteExercise(exerciseId: string): Promise<string[]> {
  const current = await getFavoriteExerciseIds();
  const next = current.includes(exerciseId) ? current.filter((id) => id !== exerciseId) : [...current, exerciseId];
  try {
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

export async function getRecentExerciseIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export async function markExerciseUsed(exerciseId: string): Promise<void> {
  const current = await getRecentExerciseIds();
  const next = [exerciseId, ...current.filter((id) => id !== exerciseId)].slice(0, RECENT_MAX);
  try {
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {}
}
