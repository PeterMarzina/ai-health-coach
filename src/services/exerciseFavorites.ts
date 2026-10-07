// src/services/exerciseFavorites.ts — favorieten + recent gebruikt (Deel A2)
// Puur lokale UX-voorkeur (geen cross-device sync nodig), dus AsyncStorage
// i.p.v. een eigen tabel/migratie — zelfde soort keuze als de taalvoorkeur in
// components/store.tsx. Per gebruiker opgeslagen, zodat twee accounts op één
// toestel elkaars lijstjes niet zien.
import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = 'exercise_favorites';
const RECENT_KEY = 'exercise_recent';
const RECENT_MAX = 10;

const keyFor = (base: string, userId: string) => `${base}:${userId}`;

// Leest de lijst van deze gebruiker. De oude, gedeelde sleutel (van vóór de
// per-gebruiker-opslag) wordt eenmalig overgezet naar de eerste gebruiker die
// hem leest en daarna verwijderd — anders zou elk ander account op dit toestel
// die lijst ook te zien krijgen.
async function readList(base: string, userId: string): Promise<string[]> {
  try {
    let raw = await AsyncStorage.getItem(keyFor(base, userId));
    if (raw === null) {
      const legacy = await AsyncStorage.getItem(base);
      if (legacy !== null) {
        await AsyncStorage.setItem(keyFor(base, userId), legacy);
        await AsyncStorage.removeItem(base);
        raw = legacy;
      }
    }
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

async function writeList(base: string, userId: string, ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(keyFor(base, userId), JSON.stringify(ids));
  } catch {}
}

export function getFavoriteExerciseIds(userId: string): Promise<string[]> {
  return readList(FAVORITES_KEY, userId);
}

export async function toggleFavoriteExercise(userId: string, exerciseId: string): Promise<string[]> {
  const current = await getFavoriteExerciseIds(userId);
  const next = current.includes(exerciseId) ? current.filter((id) => id !== exerciseId) : [...current, exerciseId];
  await writeList(FAVORITES_KEY, userId, next);
  return next;
}

export function getRecentExerciseIds(userId: string): Promise<string[]> {
  return readList(RECENT_KEY, userId);
}

export async function markExerciseUsed(userId: string, exerciseId: string): Promise<void> {
  const current = await getRecentExerciseIds(userId);
  const next = [exerciseId, ...current.filter((id) => id !== exerciseId)].slice(0, RECENT_MAX);
  await writeList(RECENT_KEY, userId, next);
}
