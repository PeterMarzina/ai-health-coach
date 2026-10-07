// src/services/sessionMerge.ts — pure helpers voor de sessie-sync (workoutSession.ts)
// Los van AsyncStorage/Supabase zodat ze zonder mocks te testen zijn.
import type { LocalPendingDeletes, LocalSessionState, LocalSet } from './localSession';

export const NO_PENDING_DELETES: LocalPendingDeletes = { setIds: [], exerciseRowIds: [] };

export function pendingDeletesOf(state: LocalSessionState): LocalPendingDeletes {
  return state.pendingDeletes ?? NO_PENDING_DELETES;
}

// Voegt ids toe aan de delete-outbox (zonder dubbelen).
export function withPendingDeletes(
  state: LocalSessionState,
  add: Partial<LocalPendingDeletes>
): LocalSessionState {
  const cur = pendingDeletesOf(state);
  return {
    ...state,
    pendingDeletes: {
      setIds: Array.from(new Set([...cur.setIds, ...(add.setIds ?? [])])),
      exerciseRowIds: Array.from(new Set([...cur.exerciseRowIds, ...(add.exerciseRowIds ?? [])])),
    },
  };
}

// Wat een flush naar de server heeft weggeschreven: per set-id het setnummer
// dat verstuurd is, en welke deletes gelukt zijn.
export type FlushResult = {
  sets: Map<string, number>;
  deletedSetIds: string[];
  deletedExerciseRowIds: string[];
};

// Neemt uit de cache over welke sets al op de server staan (zelfde id én
// setnummer), zodat die niet opnieuw verstuurd worden. Alleen de synced-vlag:
// de inhoud van `state` blijft leidend.
export function withSyncedFlagsFrom(state: LocalSessionState, cached: LocalSessionState | null): LocalSessionState {
  if (!cached || cached.sessionId !== state.sessionId) return state;
  const done = new Map(cached.sets.filter((s) => s.synced).map((s) => [s.localId, s.setNumber]));
  return {
    ...state,
    sets: state.sets.map((s) => (!s.synced && done.get(s.localId) === s.setNumber ? { ...s, synced: true } : s)),
  };
}

// Verwerkt een geslaagde flush in de meest recente lokale state. Belangrijk:
// niet de state van vóór de flush terugschrijven — tijdens de flush kan de
// gebruiker al nieuwe sets hebben gelogd of verwijderd. Een set telt alleen als
// gesynced als hij sindsdien niet hernummerd is (removeSet).
export function mergeFlushResult(latest: LocalSessionState, flushed: FlushResult): LocalSessionState {
  const doneSets = new Set(flushed.deletedSetIds);
  const doneExercises = new Set(flushed.deletedExerciseRowIds);
  const pending = pendingDeletesOf(latest);
  return {
    ...latest,
    sessionSynced: true,
    sets: latest.sets.map((s: LocalSet) =>
      flushed.sets.get(s.localId) === s.setNumber ? { ...s, synced: true } : s
    ),
    pendingDeletes: {
      setIds: pending.setIds.filter((id) => !doneSets.has(id)),
      exerciseRowIds: pending.exerciseRowIds.filter((id) => !doneExercises.has(id)),
    },
  };
}
