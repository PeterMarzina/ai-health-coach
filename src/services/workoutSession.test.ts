// Sync-gedrag van de actieve sessie: volgorde van server-writes, de
// samenvatting bij afronden en hervatten na offline gebruik. Supabase
// (./workouts), notificaties (./restTimer) en AsyncStorage zijn vervangen
// door in-memory fakes.
import type { LocalSessionState } from './localSession';
import * as workouts from './workouts';
import { loadLocalSession, saveLocalSession, loadPendingSessionDeletes } from './localSession';
import {
  startSession, resumeActiveSession, logSet, removeSet, endSession, abandonSession, syncPendingWrites,
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
  upsertSessionRemote: jest.fn(async () => { mockCalls.push('upsertSession'); }),
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

beforeEach(async () => {
  mockStore.clear();
  mockCalls.length = 0;
  jest.clearAllMocks();
  // Wachtrij uit een vorige test laten leeglopen.
  await syncPendingWrites({
    sessionId: 'drain', userId: 'drain', name: '', startedAt: '', routineId: null,
    sessionSynced: true, exercises: [], sets: [], restTimer: null,
  });
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
    mocked.upsertSessionRemote.mockImplementation(async () => { mockCalls.push('upsertSession'); });

    mocked.fetchActiveSession.mockResolvedValueOnce({
      id: 'other-session', userId: USER, name: 'Ander toestel', startedAt: '2026-01-01T00:00:00.000Z', endedAt: null, routineId: null,
    } as any);
    const resumed = await resumeActiveSession(USER);
    expect(resumed?.sessionId).toBe(local.sessionId);
    expect((await loadLocalSession(USER))?.sessionId).toBe(local.sessionId);
  });

  it('een offline weggegooide sessie komt niet terug en de delete wordt later opnieuw geprobeerd', async () => {
    const s = await started();
    mocked.deleteWorkoutSession.mockRejectedValueOnce(new Error('offline'));
    await abandonSession(s);
    expect(await loadPendingSessionDeletes(USER)).toEqual([s.sessionId]);

    // Volgende keer openen, nog steeds offline: server meldt de sessie nog als actief.
    mocked.deleteWorkoutSession.mockRejectedValueOnce(new Error('offline'));
    mocked.fetchActiveSession.mockResolvedValueOnce({
      id: s.sessionId, userId: USER, name: s.name, startedAt: s.startedAt, endedAt: null, routineId: null,
    } as any);
    expect(await resumeActiveSession(USER)).toBeNull();
    expect(await loadPendingSessionDeletes(USER)).toEqual([s.sessionId]);

    // Weer online: delete lukt en de lijst is leeg.
    expect(await resumeActiveSession(USER)).toBeNull();
    expect(mockCalls).toContain(`deleteSession:${s.sessionId}`);
    expect(await loadPendingSessionDeletes(USER)).toEqual([]);
  });
});
