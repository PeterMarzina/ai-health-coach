// src/services/localSession.ts — crash-safe lokale cache van de actieve sessie (Deel A1)
// Bewaart de actieve workout in AsyncStorage: welke oefeningen, welke sets al
// afgevinkt zijn en de rusttimer. Wordt bij elke wijziging herschreven, zodat
// een gekilde app nooit een sessie kost — bij heropenen leest het sessie-scherm
// dit eerst uit en biedt het "Sessie hervatten?" aan (zie workoutSession.ts).
//
// Scope bewust beperkt: dit beschermt tegen een gekilde/herstarte app tijdens
// een training. Het is geen volwaardige offline-queue met retries-met-backoff
// of conflict-resolutie tussen meerdere toestellen — zie DECISIONS.md.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SetType } from '@/src/types/workout';

export type LocalSet = {
  localId: string;
  exerciseId: string;
  setNumber: number;
  reps: number;
  weightKg: number;
  setType: SetType;
  completedAt: string;
  synced: boolean;
};

export type LocalPlannedExercise = {
  exerciseId: string;
  position: number;
  targetSets: number;
  targetReps: string;
  targetRestSeconds: number;
};

export type LocalRestTimer = { exerciseId: string; endsAt: string; notificationId: string | null };

export type LocalSessionState = {
  sessionId: string;
  userId: string;
  name: string;
  startedAt: string;
  routineId: string | null;
  sessionSynced: boolean;
  exercises: LocalPlannedExercise[];
  sets: LocalSet[];
  restTimer: LocalRestTimer | null;
};

const keyFor = (userId: string) => `active_workout_session:${userId}`;

export async function loadLocalSession(userId: string): Promise<LocalSessionState | null> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    return raw ? (JSON.parse(raw) as LocalSessionState) : null;
  } catch {
    return null;
  }
}

export async function saveLocalSession(state: LocalSessionState): Promise<void> {
  try {
    await AsyncStorage.setItem(keyFor(state.userId), JSON.stringify(state));
  } catch {
    // Best-effort: lukt de schrijf niet, dan werkt de sessie gewoon door in
    // React state voor de rest van deze app-launch — alleen de crash-safety
    // voor déze wijziging gaat dan verloren, niet de hele sessie.
  }
}

export async function clearLocalSession(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(keyFor(userId));
  } catch {}
}
