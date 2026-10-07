import type { LocalSessionState, LocalSet } from './localSession';
import { mergeFlushResult, withPendingDeletes } from './sessionMerge';

function set(localId: string, setNumber: number, synced = false): LocalSet {
  return { localId, exerciseId: 'ex', setNumber, reps: 8, weightKg: 80, setType: 'normal', completedAt: '2026-08-01T10:00:00Z', synced };
}

function state(sets: LocalSet[], extra: Partial<LocalSessionState> = {}): LocalSessionState {
  return {
    sessionId: 's1', userId: 'u1', name: 'Push', startedAt: '2026-08-01T09:00:00Z', routineId: null,
    sessionSynced: false, exercises: [], sets, restTimer: null, ...extra,
  };
}

describe('withPendingDeletes', () => {
  it('adds ids without duplicates and works on caches without the field', () => {
    const s1 = withPendingDeletes(state([]), { setIds: ['a'] });
    const s2 = withPendingDeletes(s1, { setIds: ['a', 'b'], exerciseRowIds: ['e1'] });
    expect(s2.pendingDeletes).toEqual({ setIds: ['a', 'b'], exerciseRowIds: ['e1'] });
  });
});

describe('mergeFlushResult', () => {
  it('marks flushed sets as synced', () => {
    const merged = mergeFlushResult(state([set('a', 1)]), { sets: new Map([['a', 1]]), deletedSetIds: [], deletedExerciseRowIds: [] });
    expect(merged.sets[0].synced).toBe(true);
    expect(merged.sessionSynced).toBe(true);
  });

  it('keeps sets logged during the flush as unsynced', () => {
    const latest = state([set('a', 1), set('b', 2)]);
    const merged = mergeFlushResult(latest, { sets: new Map([['a', 1]]), deletedSetIds: [], deletedExerciseRowIds: [] });
    expect(merged.sets.map((s) => s.synced)).toEqual([true, false]);
  });

  it('does not mark a set synced when it was renumbered after the flush started', () => {
    const latest = state([set('b', 1)]); // was set 2 when flushed, renumbered since
    const merged = mergeFlushResult(latest, { sets: new Map([['b', 2]]), deletedSetIds: [], deletedExerciseRowIds: [] });
    expect(merged.sets[0].synced).toBe(false);
  });

  it('removes only the deletes that were sent', () => {
    const latest = state([], { pendingDeletes: { setIds: ['x', 'y'], exerciseRowIds: ['e1'] } });
    const merged = mergeFlushResult(latest, { sets: new Map(), deletedSetIds: ['x'], deletedExerciseRowIds: ['e1'] });
    expect(merged.pendingDeletes).toEqual({ setIds: ['y'], exerciseRowIds: [] });
  });
});
