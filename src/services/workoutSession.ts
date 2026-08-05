// src/services/workoutSession.ts — crash-safe orchestratie van de actieve sessie (Deel A1)
// Verbindt de lokale AsyncStorage-cache (localSession.ts) met Supabase
// (workouts.ts): elke wijziging wordt eerst lokaal opgeslagen (crash-safe),
// daarna best-effort naar de server gesynced. app/plan/workout.tsx roept
// alleen deze functies aan en houdt de teruggegeven state in React bij.
import { uuidv4 } from './localId';
import {
  LocalSessionState, LocalSet, LocalPlannedExercise,
  loadLocalSession, saveLocalSession, clearLocalSession,
} from './localSession';
import * as workouts from './workouts';
import { detectPersonalRecords, PRSetInput } from './personalRecords';
import { totalVolume } from './workoutVolume';
import { scheduleRestEndNotification, cancelRestEndNotification } from './restTimer';
import type { Exercise, PersonalRecordType, SessionSummary, SetType } from '@/src/types/workout';

// ── Starten / hervatten ───────────────────────────────────────────
export async function startSession(
  userId: string,
  opts: {
    name: string;
    routineId: string | null;
    exercises: { exerciseId: string; targetSets: number; targetReps: string; targetRestSeconds: number }[];
  }
): Promise<LocalSessionState> {
  const localExercises: LocalPlannedExercise[] = opts.exercises.map((e, i) => ({
    id: uuidv4(),
    exerciseId: e.exerciseId,
    position: i,
    targetSets: e.targetSets,
    targetReps: e.targetReps,
    targetRestSeconds: e.targetRestSeconds,
  }));
  const state: LocalSessionState = {
    sessionId: uuidv4(),
    userId,
    name: opts.name,
    startedAt: new Date().toISOString(),
    routineId: opts.routineId,
    sessionSynced: false,
    exercises: localExercises,
    sets: [],
    restTimer: null,
  };
  await saveLocalSession(state); // crash-safe vóór er ook maar iets naar het net gaat
  syncPendingWrites(state).catch(() => {});
  return state;
}

// Reconciliatie bij het openen van het sessie-scherm: lokale cache + server
// worden tegen elkaar gehouden zodat een gekilde app nooit een sessie kost.
export async function resumeActiveSession(userId: string): Promise<LocalSessionState | null> {
  const local = await loadLocalSession(userId);
  let remote = null;
  try {
    remote = await workouts.fetchActiveSession(userId);
  } catch {
    remote = null; // offline: vertrouw op de lokale cache
  }

  if (!local && !remote) return null;

  if (remote && local && local.sessionId === remote.id) {
    return local; // lokale cache is leidend — kan sets bevatten die nog niet gesynced zijn
  }

  if (remote) {
    // Sessie bestaat op de server maar niet (meer) lokaal bekend — gestart op
    // een ander toestel, of de lokale cache ging verloren. Herbouw 'm.
    const [rows, sets] = await Promise.all([
      workouts.fetchSessionExerciseRows(remote.id),
      workouts.fetchSessionSets(remote.id),
    ]);
    const hydrated: LocalSessionState = {
      sessionId: remote.id,
      userId,
      name: remote.name,
      startedAt: remote.startedAt,
      routineId: remote.routineId,
      sessionSynced: true,
      exercises: rows.map((r) => ({
        id: r.id, exerciseId: r.exerciseId, position: r.position,
        targetSets: r.targetSets, targetReps: r.targetReps, targetRestSeconds: r.targetRestSeconds,
      })),
      sets: sets.map((s) => ({
        localId: s.id, exerciseId: s.exerciseId, setNumber: s.setNumber, reps: s.reps,
        weightKg: s.weightKg, setType: s.setType, completedAt: s.completedAt, synced: true,
      })),
      restTimer: null,
    };
    await saveLocalSession(hydrated);
    return hydrated;
  }

  // Alleen lokaal bekend (volledig offline gestart): vertrouw de lokale cache
  // en probeer 'm op de achtergrond alsnog naar de server te krijgen.
  if (local) {
    syncPendingWrites(local).catch(() => {});
    return local;
  }
  return null;
}

async function flushToRemote(state: LocalSessionState): Promise<LocalSessionState> {
  await workouts.upsertSessionRemote({
    id: state.sessionId, userId: state.userId, name: state.name, routineId: state.routineId, startedAt: state.startedAt,
  });
  if (state.exercises.length > 0) {
    await workouts.upsertSessionExercisesRemote(state.sessionId, state.exercises);
  }
  for (const s of state.sets.filter((s) => !s.synced)) {
    await workouts.upsertSetRemote({
      id: s.localId, userId: state.userId, sessionId: state.sessionId, exerciseId: s.exerciseId,
      setNumber: s.setNumber, reps: s.reps, weightKg: s.weightKg, setType: s.setType, completedAt: s.completedAt,
    });
  }
  const next: LocalSessionState = { ...state, sessionSynced: true, sets: state.sets.map((s) => ({ ...s, synced: true })) };
  await saveLocalSession(next);
  return next;
}

// Best-effort: lukt het niet (offline), dan blijft de ongewijzigde state gewoon
// lokaal staan voor een volgende poging — nooit een throw richting de UI.
export async function syncPendingWrites(state: LocalSessionState): Promise<LocalSessionState> {
  try {
    return await flushToRemote(state);
  } catch {
    return state;
  }
}

// ── Oefeningen tijdens de sessie ─────────────────────────────────
export async function addExerciseToSession(
  state: LocalSessionState,
  exerciseId: string,
  defaults: { targetSets: number; targetReps: string; targetRestSeconds: number } = { targetSets: 3, targetReps: '8-12', targetRestSeconds: 90 }
): Promise<LocalSessionState> {
  const entry: LocalPlannedExercise = { id: uuidv4(), exerciseId, position: state.exercises.length, ...defaults };
  const next = { ...state, exercises: [...state.exercises, entry] };
  await saveLocalSession(next);
  workouts.upsertSessionExercisesRemote(state.sessionId, [entry]).catch(() => {});
  return next;
}

export async function removeExerciseFromSession(state: LocalSessionState, exerciseId: string): Promise<LocalSessionState> {
  const entry = state.exercises.find((e) => e.exerciseId === exerciseId);
  const setsToRemove = state.sets.filter((s) => s.exerciseId === exerciseId);
  const next: LocalSessionState = {
    ...state,
    exercises: state.exercises.filter((e) => e.exerciseId !== exerciseId),
    sets: state.sets.filter((s) => s.exerciseId !== exerciseId),
  };
  await saveLocalSession(next);
  if (entry) workouts.deleteSessionExerciseRemote(entry.id).catch(() => {});
  for (const s of setsToRemove) workouts.deleteSetRemote(s.localId).catch(() => {});
  return next;
}

// ── Sets loggen ───────────────────────────────────────────────────
export async function logSet(
  state: LocalSessionState,
  exerciseId: string,
  input: { reps: number; weightKg: number; setType: SetType }
): Promise<LocalSessionState> {
  const setNumber = state.sets.filter((s) => s.exerciseId === exerciseId).length + 1;
  const set: LocalSet = {
    localId: uuidv4(), exerciseId, setNumber, reps: input.reps, weightKg: input.weightKg,
    setType: input.setType, completedAt: new Date().toISOString(), synced: false,
  };
  const next: LocalSessionState = { ...state, sets: [...state.sets, set] };
  await saveLocalSession(next);
  syncOneSet(next, set).catch(() => {});
  return next;
}

async function syncOneSet(state: LocalSessionState, set: LocalSet): Promise<void> {
  await workouts.upsertSetRemote({
    id: set.localId, userId: state.userId, sessionId: state.sessionId, exerciseId: set.exerciseId,
    setNumber: set.setNumber, reps: set.reps, weightKg: set.weightKg, setType: set.setType, completedAt: set.completedAt,
  });
  // Herlees de meest recente lokale state i.p.v. de meegegeven `state` terug te
  // schrijven — anders overschrijft een trage sync een inmiddels alweer
  // gewijzigde cache (extra set toegevoegd terwijl deze nog liep).
  const latest = await loadLocalSession(state.userId);
  if (!latest || latest.sessionId !== state.sessionId) return;
  await saveLocalSession({ ...latest, sets: latest.sets.map((s) => (s.localId === set.localId ? { ...s, synced: true } : s)) });
}

export async function removeSet(state: LocalSessionState, localSetId: string): Promise<LocalSessionState> {
  const removed = state.sets.find((s) => s.localId === localSetId);
  if (!removed) return state;
  const remaining = state.sets
    .filter((s) => s.exerciseId === removed.exerciseId && s.localId !== localSetId)
    .sort((a, b) => a.setNumber - b.setNumber)
    .map((s, i) => ({ ...s, setNumber: i + 1 }));
  const others = state.sets.filter((s) => s.exerciseId !== removed.exerciseId);
  const next: LocalSessionState = { ...state, sets: [...others, ...remaining] };
  await saveLocalSession(next);
  workouts.deleteSetRemote(removed.localId).catch(() => {});
  for (const s of remaining) {
    workouts
      .upsertSetRemote({
        id: s.localId, userId: state.userId, sessionId: state.sessionId, exerciseId: s.exerciseId,
        setNumber: s.setNumber, reps: s.reps, weightKg: s.weightKg, setType: s.setType, completedAt: s.completedAt,
      })
      .catch(() => {});
  }
  return next;
}

// ── Rusttimer (Deel A1) ────────────────────────────────────────────
export async function startRestTimer(
  state: LocalSessionState,
  exerciseId: string,
  seconds: number,
  exerciseName: string
): Promise<LocalSessionState> {
  await cancelRestEndNotification(state.restTimer?.notificationId);
  const notificationId = await scheduleRestEndNotification(seconds, exerciseName);
  const next: LocalSessionState = {
    ...state,
    restTimer: { exerciseId, endsAt: new Date(Date.now() + seconds * 1000).toISOString(), notificationId },
  };
  await saveLocalSession(next);
  return next;
}

export async function clearRestTimer(state: LocalSessionState): Promise<LocalSessionState> {
  await cancelRestEndNotification(state.restTimer?.notificationId);
  const next: LocalSessionState = { ...state, restTimer: null };
  await saveLocalSession(next);
  return next;
}

// ── Afronden / annuleren ───────────────────────────────────────────
export async function abandonSession(state: LocalSessionState): Promise<void> {
  await cancelRestEndNotification(state.restTimer?.notificationId);
  await clearLocalSession(state.userId);
  try {
    await workouts.deleteWorkoutSession(state.sessionId);
  } catch {
    // Sessie was nog niet gesynced — er staat dan toch niets op de server.
  }
}

export type EndSessionResult = { ok: true; summary: SessionSummary } | { ok: false; error: string };

export async function endSession(
  state: LocalSessionState,
  exercisesById: Record<string, Exercise>
): Promise<EndSessionResult> {
  try {
    const synced = await flushToRemote(state);

    const exerciseIds = Array.from(new Set(synced.sets.map((s) => s.exerciseId)));
    const historical = await workouts.fetchHistoricalSetsByExercise(synced.userId, exerciseIds, synced.sessionId);

    const prRows: { exerciseId: string; recordType: PersonalRecordType; weightKg: number; reps: number; estimatedOneRm: number }[] = [];
    for (const exerciseId of exerciseIds) {
      const newSets: PRSetInput[] = synced.sets
        .filter((s) => s.exerciseId === exerciseId)
        .map((s) => ({ weightKg: s.weightKg, reps: s.reps, setType: s.setType }));
      const priorSets: PRSetInput[] = (historical[exerciseId] ?? []).map((s) => ({
        weightKg: s.weightKg, reps: s.reps, setType: s.setType,
      }));
      for (const pr of detectPersonalRecords(newSets, priorSets)) {
        prRows.push({ exerciseId, recordType: pr.type, weightKg: pr.weightKg, reps: pr.reps, estimatedOneRm: pr.estimatedOneRm });
      }
    }
    await workouts.insertPersonalRecords(synced.userId, synced.sessionId, prRows);

    const endedAt = new Date().toISOString();
    await workouts.endWorkoutSession(synced.sessionId, endedAt);

    await cancelRestEndNotification(synced.restTimer?.notificationId);
    await clearLocalSession(synced.userId);

    const durationSeconds = Math.max(0, Math.round((new Date(endedAt).getTime() - new Date(synced.startedAt).getTime()) / 1000));
    const summary: SessionSummary = {
      session: { id: synced.sessionId, name: synced.name, startedAt: synced.startedAt, endedAt, routineId: synced.routineId },
      durationSeconds,
      totalVolumeKg: totalVolume(synced.sets),
      totalSets: synced.sets.length,
      exerciseCount: exerciseIds.length,
      personalRecords: prRows.map((r, i) => ({
        id: `pending-${i}`,
        exerciseId: r.exerciseId,
        sessionId: synced.sessionId,
        recordType: r.recordType,
        weightKg: r.weightKg,
        reps: r.reps,
        estimatedOneRm: r.estimatedOneRm,
        achievedAt: endedAt,
        exerciseName: exercisesById[r.exerciseId]?.name ?? '',
      })),
    };
    return { ok: true, summary };
  } catch (e: any) {
    // Lokale cache blijft bewust intact bij een fout: niets loggen als
    // "afgerond" totdat het echt naar de server is geschreven, zodat de
    // gebruiker het gewoon opnieuw kan proberen.
    return { ok: false, error: e?.message ?? 'Could not save this workout.' };
  }
}
