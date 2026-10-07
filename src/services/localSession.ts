// src/services/localSession.ts — crash-safe lokale cache van de actieve sessie (Deel A1)
// Bewaart de actieve workout in AsyncStorage: welke oefeningen, welke sets al
// afgevinkt zijn en de rusttimer. Wordt bij elke wijziging herschreven, zodat
// een gekilde app nooit een sessie kost — bij heropenen leest het sessie-scherm
// dit eerst uit en biedt het "Sessie hervatten?" aan (zie workoutSession.ts).
//
// Scope bewust beperkt: dit beschermt tegen een gekilde/herstarte app tijdens
// een training. Niet-gesyncte sets en verwijderingen (pendingDeletes) worden bij
// de volgende sync opnieuw verstuurd, maar er is geen retry-met-backoff of
// conflict-resolutie tussen meerdere toestellen — zie DECISIONS.md.
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
  id: string; // = workout_session_exercises.id (client-gegenereerd, zie localId.ts)
  exerciseId: string;
  position: number;
  targetSets: number;
  targetReps: string;
  targetRestSeconds: number;
};

export type LocalRestTimer = { exerciseId: string; endsAt: string; notificationId: string | null };

// Verwijderingen die nog naar de server moeten. Een delete is idempotent (een
// al verwijderde rij nogmaals verwijderen is geen fout), dus dubbel versturen
// na een race is onschuldig.
export type LocalPendingDeletes = { setIds: string[]; exerciseRowIds: string[] };

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
  // Optioneel: caches van vóór deze toevoeging hebben het veld niet.
  pendingDeletes?: LocalPendingDeletes;
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

// Weggegooide sessies waarvan de server-delete nog niet lukte (offline). Zonder
// deze lijst bleef zo'n sessie op de server "actief" en kwam hij later terug als
// "Sessie hervatten?". workoutSession.ts probeert ze opnieuw bij het (her)openen.
const pendingDeleteKey = (userId: string) => `pending_session_deletes:${userId}`;

export async function loadPendingSessionDeletes(userId: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(pendingDeleteKey(userId));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export async function savePendingSessionDeletes(userId: string, sessionIds: string[]): Promise<void> {
  try {
    if (sessionIds.length) await AsyncStorage.setItem(pendingDeleteKey(userId), JSON.stringify(sessionIds));
    else await AsyncStorage.removeItem(pendingDeleteKey(userId));
  } catch {}
}
