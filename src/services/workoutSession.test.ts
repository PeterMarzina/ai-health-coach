// Sync-gedrag van de actieve sessie: volgorde van server-writes, de
// samenvatting bij afronden en hervatten na offline gebruik. Supabase
// (./workouts), notificaties (./restTimer) en AsyncStorage zijn vervangen
// door in-memory fakes.
import type { LocalSessionState } from './localSession';
import * as workouts from './workouts';
import { loadLocalSession, saveLocalSession, loadPendingSessionDeletes, savePendingSessionDeletes } from './localSession';
import {
  startSession, resumeActiveSession, logSet, removeSet, endSession, abandonSession, syncPendingWrites, clearRestTimer,
} from './workoutSession';

// jest.mock wordt door babel-jest boven de imports gehesen.

const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async (k: string) => (mockStore.has(k) ? mockStore.get(k)! : null),
    setItem: async (k: string, v: string) => { mockStore.set(k, v); },
    removeItem: async (k: string) => { mockStore.delete(k); },
  },
}));

jest.mock('./restTimer', () => ({
  scheduleRestEndNotification: jest.fn(async () => null),
  cancelRestEndNotification: jest.fn(async () => {}),
}));

// Log van alle server-calls in volgorde van afronding.
const mockCalls: string[] = [];
jest.mock('./workouts', () => ({
  upsertSessionRemote: jest.fn(async (row: { id: string }) => { mockCalls.push(`upsertSession:${row.id}`); }),
  upsertSessionExercisesRemote: jest.fn(async () => { mockCalls.push('upsertExercises'); }),
  upsertSetRemote: jest.fn(async (row: { id: string }) => { mockCalls.push(`upsertSet:${row.id}`); }),
  deleteSetRemote: jest.fn(async (id: string) => { mockCalls.push(`deleteSet:${id}`); }),
  deleteSessionExerciseRemote: jest.fn(async (id: string) => { mockCalls.push(`deleteExercise:${id}`); }),
  deleteWorkoutSession: jest.fn(async (id: string) => { mockCalls.push(`deleteSession:${id}`); }),
  fetchActiveSession: jest.fn(async () => null),
  fetchSessionExerciseRows: jest.fn(async () => []),
  fetchSessionSets: jest.fn(async () => []),
  fetchHistoricalSetsByExercise: jest.fn(async () => ({})),
  insertPersonalRecords: jest.fn(async () => {}),
  endWorkoutSession: jest.fn(async () => {}),
}));

const mocked = workouts as jest.Mocked<typeof workouts>;
const USER = 'user-1';
const flush = () => new Promise((r) => setTimeout(r, 0));
// Wacht tot alles wat nu in de server-wachtrij staat klaar is.
const drain = () => syncPendingWrites({
  sessionId: 'drain', userId: 'drain', name: '', startedAt: '', routineId: null,
  sessionSynced: true, exercises: [], sets: [], restTimer: null,
});

beforeEach(async () => {
  mockStore.clear();
  mockCalls.length = 0;
  jest.clearAllMocks();
  await drain(); // wachtrij uit een vorige test laten leeglopen
  mockCalls.length = 0;
});

async function started(): Promise<LocalSessionState> {
  const s = await startSession(USER, {
    name: 'Push', routineId: null,
    exercises: [{ exerciseId: 'bench', targetSets: 3, targetReps: '8', targetRestSeconds: 90 }],
  });
  await syncPendingWrites(s); // start-sync laten afronden
  mockCalls.length = 0;
  return (await loadLocalSession(USER))!;
}

describe('volgorde van server-writes', () => {
  it('een trage upsert van een set landt vóór de delete van diezelfde set', async () => {
    const s = await started();
    let release!: () => void;
    mocked.upsertSetRemote.mockImplementationOnce(async (row) => {
      await new Promise<void>((r) => { release = r; });
      mockCalls.push(`upsertSet:${row.id}`);
    });

    const afterLog = await logSet(s, 'bench', { reps: 8, weightKg: 80, setType: 'normal' });
    const setId = afterLog.sets[0].localId;
    await removeSet(afterLog, setId);
    await flush();
    // De delete mag niet starten zolang de upsert nog loopt.
    expect(mockCalls).not.toContain(`deleteSet:${setId}`);

    release();
    await syncPendingWrites((await loadLocalSession(USER))!);
    const upsertAt = mockCalls.indexOf(`upsertSet:${setId}`);
    const deleteAt = mockCalls.indexOf(`deleteSet:${setId}`);
    expect(upsertAt).toBeGreaterThanOrEqual(0);
    expect(deleteAt).toBeGreaterThan(upsertAt);
  });

  it('een mislukte write blokkeert de wachtrij niet', async () => {
    const s = await started();
    mocked.upsertSetRemote.mockRejectedValueOnce(new Error('offline'));
    const afterLog = await logSet(s, 'bench', { reps: 8, weightKg: 80, setType: 'normal' });
    const synced = await syncPendingWrites(afterLog);
    expect(synced.sets[0].synced).toBe(true);
  });
});

describe('endSession', () => {
  it('bouwt de samenvatting uit de meegegeven state, niet uit een achterlopende cache', async () => {
    const s = await started();
    const withSets: LocalSessionState = {
      ...s,
      sets: [
        { localId: 'a', exerciseId: 'bench', setNumber: 1, reps: 8, weightKg: 80, setType: 'normal', completedAt: s.startedAt, synced: false },
        { localId: 'b', exerciseId: 'bench', setNumber: 2, reps: 6, weightKg: 85, setType: 'normal', completedAt: s.startedAt, synced: false },
      ],
    };
    // Cache loopt achter (bv. een AsyncStorage-write mislukte): nog zonder sets.
    await saveLocalSession(s);

    const res = await endSession(withSets, {});
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.summary.totalSets).toBe(2);
    expect(res.summary.totalVolumeKg).toBe(80 * 8 + 85 * 6);
    expect(mocked.fetchHistoricalSetsByExercise).toHaveBeenCalledWith(USER, ['bench'], s.sessionId);
    expect(await loadLocalSession(USER)).toBeNull();
  });
});

describe('resumeActiveSession', () => {
  it('houdt een lokale (offline gestarte) sessie aan als de server een andere actieve sessie heeft', async () => {
    mocked.upsertSessionRemote.mockRejectedValue(new Error('offline'));
    const local = await startSession(USER, { name: 'Offline', routineId: null, exercises: [] });
    await syncPendingWrites(local);
    mocked.upsertSessionRemote.mockReset();
    mocked.upsertSessionRemote.mockImplementation(async (row) => { mockCalls.push(`upsertSession:${row.id}`); });

    mocked.fetchActiveSession.mockResolvedValueOnce({
      id: 'other-session', userId: USER, name: 'Ander toestel', startedAt: '2026-01-01T00:00:00.000Z', endedAt: null, routineId: null,
    } as any);
    const resumed = await resumeActiveSession(USER);
    expect(resumed?.sessionId).toBe(local.sessionId);
    expect((await loadLocalSession(USER))?.sessionId).toBe(local.sessionId);
  });

  it('een offline weggegooide sessie wordt later alsnog van de server verwijderd', async () => {
    const s = await started();
    mocked.deleteWorkoutSession.mockRejectedValueOnce(new Error('offline'));
    await abandonSession(s);
    await drain();
    expect(await loadPendingSessionDeletes(USER)).toEqual([s.sessionId]);
    expect(await loadLocalSession(USER)).toBeNull();

    // Weer online: de volgende keer openen ruimt hem op.
    expect(await resumeActiveSession(USER)).toBeNull();
    await drain();
    expect(mockCalls).toContain(`deleteSession:${s.sessionId}`);
    expect(await loadPendingSessionDeletes(USER)).toEqual([]);
  });

  it('na een herstart komt een weggegooide sessie niet terug zolang de delete nog niet lukte', async () => {
    // Zoals na een app-herstart: alleen de duurzame lijst weet nog dat hij weg moet.
    await savePendingSessionDeletes(USER, ['gone']);
    mocked.deleteWorkoutSession.mockRejectedValue(new Error('offline'));
    mocked.fetchActiveSession.mockResolvedValueOnce({
      id: 'gone', userId: USER, name: 'Weg', startedAt: '2026-01-01T00:00:00.000Z', endedAt: null, routineId: null,
    } as any);
    expect(await resumeActiveSession(USER)).toBeNull();
    await drain();
    expect(await loadPendingSessionDeletes(USER)).toEqual(['gone']);
    mocked.deleteWorkoutSession.mockReset();
    mocked.deleteWorkoutSession.mockImplementation(async (id: string) => { mockCalls.push(`deleteSession:${id}`); });
  });
});

describe('weggooien', () => {
  it('legt de delete vast vóórdat de server-call klaar is (app gekild tijdens het weggooien)', async () => {
    const s = await started();
    let release!: () => void;
    mocked.deleteWorkoutSession.mockImplementationOnce(() => new Promise<void>((r) => { release = r; }));
    await abandonSession(s); // wacht niet op de (hangende) delete
    expect(await loadPendingSessionDeletes(USER)).toEqual([s.sessionId]);
    expect(await loadLocalSession(USER)).toBeNull();
    release();
    await drain();
    expect(await loadPendingSessionDeletes(USER)).toEqual([]);
  });

  it('een late write (rusttimer, nog lopende sync) zet een weggegooide sessie niet terug', async () => {
    const s = await started();
    let release!: () => void;
    mocked.upsertSetRemote.mockImplementationOnce(async (row) => {
      await new Promise<void>((r) => { release = r; });
      mockCalls.push(`upsertSet:${row.id}`);
    });
    const afterLog = await logSet(s, 'bench', { reps: 8, weightKg: 80, setType: 'normal' });
    await flush();
    await abandonSession(afterLog);
    await clearRestTimer(afterLog); // rusttimer liep af tijdens het weggooien
    release();
    await drain();
    expect(await loadLocalSession(USER)).toBeNull();
    // En de sessie wordt na de delete ook niet opnieuw op de server aangemaakt.
    await removeSet(afterLog, afterLog.sets[0].localId);
    await drain();
    const deleteAt = mockCalls.indexOf(`deleteSession:${s.sessionId}`);
    expect(deleteAt).toBeGreaterThanOrEqual(0);
    expect(mockCalls.slice(deleteAt)).not.toContain(`upsertSession:${s.sessionId}`);
  });
});

describe('hangende request', () => {
  it('blokkeert de wachtrij niet voor altijd', async () => {
    const s = await started();
    jest.useFakeTimers();
    try {
      mocked.upsertSetRemote.mockImplementationOnce(() => new Promise<void>(() => {}));
      const afterLog = await logSet(s, 'bench', { reps: 8, weightKg: 80, setType: 'normal' });
      const ending = endSession(afterLog, {});
      await jest.advanceTimersByTimeAsync(30_000); // de hangende set-upsert geeft op
      await jest.advanceTimersByTimeAsync(30_000);
      const res = await ending;
      expect(res.ok).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
});
