// src/services/workoutSession.ts — crash-safe orchestratie van de actieve sessie (Deel A1)
// Verbindt de lokale AsyncStorage-cache (localSession.ts) met Supabase
// (workouts.ts): elke wijziging wordt eerst lokaal opgeslagen (crash-safe),
// daarna best-effort naar de server gesynced. app/plan/workout.tsx roept
// alleen deze functies aan en houdt de teruggegeven state in React bij.
import { uuidv4 } from './localId';
import {
  LocalSessionState, LocalSet, LocalPlannedExercise,
  loadLocalSession, saveLocalSession, clearLocalSession,
  loadPendingSessionDeletes, savePendingSessionDeletes,
} from './localSession';
import * as workouts from './workouts';
import { detectPersonalRecords, PRSetInput } from './personalRecords';
import { FlushResult, mergeFlushResult, pendingDeletesOf, withPendingDeletes } from './sessionMerge';
import { totalVolume } from './workoutVolume';
import { scheduleRestEndNotification, cancelRestEndNotification, type RestNotificationText } from './restTimer';
import type { Exercise, PersonalRecordType, SessionSummary, SetType } from '@/src/types/workout';

// ── Volgorde van server-writes ─────────────────────────────────────
// Voert taken één voor één uit, in de volgorde waarin ze aangeboden worden.
function serialQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return <T>(task: () => Promise<T>): Promise<T> => {
    const run = tail.then(task, task);
    tail = run.catch(() => {});
    return run;
  };
}

// Alle writes naar de server lopen door deze wachtrij, in de volgorde waarin de
// wijzigingen lokaal gebeurden. Zonder wachtrij kon een trage upsert van een set
// ná de delete van diezelfde set landen (set gelogd en meteen weer verwijderd) —
// dan stond hij weer op de server en telde hij mee in PR's en volume. Een taak
// mag zelf nooit enqueueRemote aanroepen (deadlock).
const remoteQueue = serialQueue();

// supabase-js heeft geen request-timeout: één request die blijft hangen (half
// open verbinding bij wisselen van netwerk) zou anders de hele wachtrij — en
// daarmee afronden — voor altijd blokkeren.
const REMOTE_TASK_TIMEOUT_MS = 30_000;

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), REMOTE_TASK_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function enqueueRemote<T>(task: () => Promise<T>): Promise<T> {
  return remoteQueue(() => withTimeout(task()));
}

// Sessies die in deze app-run zijn afgerond of weggegooid. Een late write — een
// sync die nog liep, of de rusttimer die afliep tijdens het weggooien — mag zo'n
// sessie niet opnieuw in de cache of op de server zetten.
const closedSessionIds = new Set<string>();

async function persist(state: LocalSessionState): Promise<void> {
  // Synchroon vlak vóór de write gecheckt: abandon/end zetten de id hierin vóór
  // ze de cache wissen, dus een write die hierna nog komt wordt overgeslagen.
  if (closedSessionIds.has(state.sessionId)) return;
  await saveLocalSession(state);
}

// De lijst met weg te gooien sessies wordt zowel binnen als buiten de
// wachtrij bijgewerkt; via een eigen lock gaat er geen toevoeging verloren.
const pendingListLock = serialQueue();

function updatePendingSessionDeletes(userId: string, update: (ids: string[]) => string[]): Promise<void> {
  return pendingListLock(async () => {
    await savePendingSessionDeletes(userId, update(await loadPendingSessionDeletes(userId)));
  });
}

// Verwijdert weggegooide sessies van de server; lukt het niet (offline), dan
// blijven ze op de lijst voor een volgende keer.
function retryPendingSessionDeletes(userId: string): Promise<void> {
  return enqueueRemote(async () => {
    const pending = await loadPendingSessionDeletes(userId);
    const deleted: string[] = [];
    for (const id of pending) {
      try {
        await workouts.deleteWorkoutSession(id);
        deleted.push(id);
      } catch {}
    }
    if (deleted.length) {
      await updatePendingSessionDeletes(userId, (ids) => ids.filter((id) => !deleted.includes(id)));
    }
  });
}

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
  await persist(state); // crash-safe vóór er ook maar iets naar het net gaat
  retryPendingSessionDeletes(userId).catch(() => {});
  syncPendingWrites(state).catch(() => {});
  return state;
}

// Reconciliatie bij het openen van het sessie-scherm: lokale cache + server
// worden tegen elkaar gehouden zodat een gekilde app nooit een sessie kost.
export async function resumeActiveSession(userId: string): Promise<LocalSessionState | null> {
  // Openstaande deletes van weggegooide sessies op de achtergrond opnieuw
  // proberen. Niet op wachten (de wachtrij kan achter een trage request staan):
  // de lijst zelf zegt al welke sessies niet meer hervat mogen worden.
  retryPendingSessionDeletes(userId).catch(() => {});
  const discarded = await loadPendingSessionDeletes(userId);
  const isClosed = (id: string) => discarded.includes(id) || closedSessionIds.has(id);

  let local = await loadLocalSession(userId);
  if (local && isClosed(local.sessionId)) {
    await clearLocalSession(userId);
    local = null;
  }
  let remote = null;
  try {
    remote = await workouts.fetchActiveSession(userId);
  } catch {
    remote = null; // offline: vertrouw op de lokale cache
  }
  if (remote && isClosed(remote.id)) remote = null;

  if (!local && !remote) return null;

  if (remote && local && local.sessionId === remote.id) {
    return local; // lokale cache is leidend — kan sets bevatten die nog niet gesynced zijn
  }

  // Een lokale sessie gaat altijd voor op een andere sessie van de server: de
  // lokale kan sets bevatten die nog nooit gesynced zijn (offline gestart), en
  // die mogen niet overschreven worden.
  if (remote && !local) {
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
    await persist(hydrated);
    return hydrated;
  }

  // Lokaal bekend (offline gestart, of naast een andere sessie op de server):
  // vertrouw de lokale cache en probeer 'm op de achtergrond te syncen.
  if (local) {
    syncPendingWrites(local).catch(() => {});
    return local;
  }
  return null;
}

async function flushToRemote(state: LocalSessionState): Promise<LocalSessionState> {
  // Weggegooid terwijl deze flush in de wachtrij stond: niets meer versturen,
  // anders maakt de upsert de sessie na de delete opnieuw aan.
  if (closedSessionIds.has(state.sessionId)) return state;
  await workouts.upsertSessionRemote({
    id: state.sessionId, userId: state.userId, name: state.name, routineId: state.routineId, startedAt: state.startedAt,
  });
  // Eerst de delete-outbox: anders telt een verwijderde set nog mee in de
  // PR-detectie/volume van endSession.
  const deletes = pendingDeletesOf(state);
  for (const id of deletes.setIds) await workouts.deleteSetRemote(id);
  for (const id of deletes.exerciseRowIds) await workouts.deleteSessionExerciseRemote(id);
  if (state.exercises.length > 0) {
    await workouts.upsertSessionExercisesRemote(state.sessionId, state.exercises);
  }
  const unsynced = state.sets.filter((s) => !s.synced);
  for (const s of unsynced) {
    await workouts.upsertSetRemote({
      id: s.localId, userId: state.userId, sessionId: state.sessionId, exerciseId: s.exerciseId,
      setNumber: s.setNumber, reps: s.reps, weightKg: s.weightKg, setType: s.setType, completedAt: s.completedAt,
    });
  }
  const flushed: FlushResult = {
    sets: new Map(unsynced.map((s) => [s.localId, s.setNumber])),
    deletedSetIds: deletes.setIds,
    deletedExerciseRowIds: deletes.exerciseRowIds,
  };
  // In de meest recente cache verwerken, niet `state` terugschrijven: tijdens de
  // flush kan er al iets gewijzigd zijn. Is de sessie intussen afgerond of
  // weggegooid (geen cache meer), dan niets opslaan — anders komt hij terug.
  const latest = await loadLocalSession(state.userId);
  if (!latest || latest.sessionId !== state.sessionId) return mergeFlushResult(state, flushed);
  const next = mergeFlushResult(latest, flushed);
  await persist(next);
  return next;
}

// Best-effort: lukt het niet (offline), dan blijft de ongewijzigde state gewoon
// lokaal staan voor een volgende poging — nooit een throw richting de UI.
export async function syncPendingWrites(state: LocalSessionState): Promise<LocalSessionState> {
  try {
    return await enqueueRemote(() => flushToRemote(state));
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
  await persist(next);
  enqueueRemote(async () => {
    if (!closedSessionIds.has(state.sessionId)) await workouts.upsertSessionExercisesRemote(state.sessionId, [entry]);
  }).catch(() => {});
  return next;
}

export async function removeExerciseFromSession(state: LocalSessionState, exerciseId: string): Promise<LocalSessionState> {
  const entry = state.exercises.find((e) => e.exerciseId === exerciseId);
  const setsToRemove = state.sets.filter((s) => s.exerciseId === exerciseId);
  // Deletes gaan via de outbox: lukt de call nu niet (offline), dan probeert de
  // volgende sync (uiterlijk bij endSession) het opnieuw.
  const next = withPendingDeletes({
    ...state,
    exercises: state.exercises.filter((e) => e.exerciseId !== exerciseId),
    sets: state.sets.filter((s) => s.exerciseId !== exerciseId),
  }, {
    setIds: setsToRemove.map((s) => s.localId),
    exerciseRowIds: entry ? [entry.id] : [],
  });
  await persist(next);
  syncPendingWrites(next).catch(() => {});
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
  await persist(next);
  enqueueRemote(() => syncOneSet(next, set)).catch(() => {});
  return next;
}

async function syncOneSet(state: LocalSessionState, set: LocalSet): Promise<void> {
  if (closedSessionIds.has(state.sessionId)) return;
  await workouts.upsertSetRemote({
    id: set.localId, userId: state.userId, sessionId: state.sessionId, exerciseId: set.exerciseId,
    setNumber: set.setNumber, reps: set.reps, weightKg: set.weightKg, setType: set.setType, completedAt: set.completedAt,
  });
  // Herlees de meest recente lokale state i.p.v. de meegegeven `state` terug te
  // schrijven — anders overschrijft een trage sync een inmiddels alweer
  // gewijzigde cache (extra set toegevoegd terwijl deze nog liep).
  const latest = await loadLocalSession(state.userId);
  if (!latest || latest.sessionId !== state.sessionId) return;
  await persist(mergeFlushResult(latest, {
    sets: new Map([[set.localId, set.setNumber]]), deletedSetIds: [], deletedExerciseRowIds: [],
  }));
}

export async function removeSet(state: LocalSessionState, localSetId: string): Promise<LocalSessionState> {
  const removed = state.sets.find((s) => s.localId === localSetId);
  if (!removed) return state;
  // Hernummerde sets moeten opnieuw naar de server (synced: false) en de
  // verwijderde set gaat via de outbox — beide worden bij een mislukte sync
  // later opnieuw geprobeerd.
  const remaining = state.sets
    .filter((s) => s.exerciseId === removed.exerciseId && s.localId !== localSetId)
    .sort((a, b) => a.setNumber - b.setNumber)
    .map((s, i) => (s.setNumber === i + 1 ? s : { ...s, setNumber: i + 1, synced: false }));
  const others = state.sets.filter((s) => s.exerciseId !== removed.exerciseId);
  const next = withPendingDeletes({ ...state, sets: [...others, ...remaining] }, { setIds: [removed.localId] });
  await persist(next);
  syncPendingWrites(next).catch(() => {});
  return next;
}

// ── Rusttimer (Deel A1) ────────────────────────────────────────────
export async function startRestTimer(
  state: LocalSessionState,
  exerciseId: string,
  seconds: number,
  notificationText: RestNotificationText
): Promise<LocalSessionState> {
  await cancelRestEndNotification(state.restTimer?.notificationId);
  const notificationId = await scheduleRestEndNotification(seconds, notificationText);
  const next: LocalSessionState = {
    ...state,
    restTimer: { exerciseId, endsAt: new Date(Date.now() + seconds * 1000).toISOString(), notificationId },
  };
  await persist(next);
  return next;
}

export async function clearRestTimer(state: LocalSessionState): Promise<LocalSessionState> {
  await cancelRestEndNotification(state.restTimer?.notificationId);
  const next: LocalSessionState = { ...state, restTimer: null };
  await persist(next);
  return next;
}

// ── Afronden / annuleren ───────────────────────────────────────────
export async function abandonSession(state: LocalSessionState): Promise<void> {
  closedSessionIds.add(state.sessionId);
  // Eerst duurzaam vastleggen dat deze sessie weg moet, dan pas de cache wissen:
  // wordt de app daartussen gekild, dan ruimt het volgende openen 'm alsnog op.
  await updatePendingSessionDeletes(state.userId, (ids) => (ids.includes(state.sessionId) ? ids : [...ids, state.sessionId]));
  await cancelRestEndNotification(state.restTimer?.notificationId);
  await clearLocalSession(state.userId);
  // De server-delete loopt op de achtergrond via de wachtrij (een nog lopende
  // sync mag de sessie niet ná de delete opnieuw aanmaken) en blijft op de
  // lijst staan tot hij lukt. Stond de sessie nog niet op de server, dan is de
  // delete een onschuldige no-op.
  retryPendingSessionDeletes(state.userId).catch(() => {});
}

export type EndSessionResult = { ok: true; summary: SessionSummary } | { ok: false; error: string };

export async function endSession(
  state: LocalSessionState,
  exercisesById: Record<string, Exercise>
): Promise<EndSessionResult> {
  try {
    // De samenvatting en PR's komen uit `state` (wat de gebruiker op het scherm
    // ziet), niet uit de cache: die kan achterlopen als een AsyncStorage-write
    // mislukte.
    await enqueueRemote(() => flushToRemote(state));

    const exerciseIds = Array.from(new Set(state.sets.map((s) => s.exerciseId)));
    const historical = await workouts.fetchHistoricalSetsByExercise(state.userId, exerciseIds, state.sessionId);

    const prRows: { exerciseId: string; recordType: PersonalRecordType; weightKg: number; reps: number; estimatedOneRm: number }[] = [];
    for (const exerciseId of exerciseIds) {
      const newSets: PRSetInput[] = state.sets
        .filter((s) => s.exerciseId === exerciseId)
        .map((s) => ({ weightKg: s.weightKg, reps: s.reps, setType: s.setType }));
      const priorSets: PRSetInput[] = (historical[exerciseId] ?? []).map((s) => ({
        weightKg: s.weightKg, reps: s.reps, setType: s.setType,
      }));
      for (const pr of detectPersonalRecords(newSets, priorSets)) {
        prRows.push({ exerciseId, recordType: pr.type, weightKg: pr.weightKg, reps: pr.reps, estimatedOneRm: pr.estimatedOneRm });
      }
    }
    await workouts.insertPersonalRecords(state.userId, state.sessionId, prRows);

    const endedAt = new Date().toISOString();
    await workouts.endWorkoutSession(state.sessionId, endedAt);

    closedSessionIds.add(state.sessionId);
    await cancelRestEndNotification(state.restTimer?.notificationId);
    await clearLocalSession(state.userId);

    const durationSeconds = Math.max(0, Math.round((new Date(endedAt).getTime() - new Date(state.startedAt).getTime()) / 1000));
    const summary: SessionSummary = {
      session: { id: state.sessionId, name: state.name, startedAt: state.startedAt, endedAt, routineId: state.routineId },
      durationSeconds,
      totalVolumeKg: totalVolume(state.sets),
      totalSets: state.sets.length,
      exerciseCount: exerciseIds.length,
      personalRecords: prRows.map((r, i) => ({
        id: `pending-${i}`,
        exerciseId: r.exerciseId,
        sessionId: state.sessionId,
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
    // Lege melding als er geen foutdetail is: het scherm toont zelf de vertaalde uitleg.
    return { ok: false, error: e?.message ?? '' };
  }
}
