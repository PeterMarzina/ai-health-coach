import { totalVolume, setVolume, volumeByDate, volumeByMuscleGroup } from './workoutVolume';

describe('setVolume / totalVolume', () => {
  it('multiplies weight by reps for normal, drop and failure sets', () => {
    expect(setVolume({ weightKg: 80, reps: 8, setType: 'normal' })).toBe(640);
    expect(setVolume({ weightKg: 40, reps: 10, setType: 'drop' })).toBe(400);
    expect(setVolume({ weightKg: 20, reps: 20, setType: 'failure' })).toBe(400);
  });

  it('excludes warmup sets entirely from volume (AGENTS.md A1)', () => {
    expect(setVolume({ weightKg: 100, reps: 10, setType: 'warmup' })).toBe(0);
  });

  it('sums volume across a session, ignoring warmups', () => {
    const sets = [
      { weightKg: 20, reps: 10, setType: 'warmup' },
      { weightKg: 80, reps: 8, setType: 'normal' },
      { weightKg: 80, reps: 7, setType: 'normal' },
      { weightKg: 60, reps: 12, setType: 'drop' },
    ];
    expect(totalVolume(sets)).toBe(80 * 8 + 80 * 7 + 60 * 12);
  });
});

describe('volumeByDate', () => {
  it('groups by day and skips warmups', () => {
    const sets = [
      { weightKg: 20, reps: 10, setType: 'warmup', completedAt: '2026-08-01T10:00:00Z' },
      { weightKg: 80, reps: 8, setType: 'normal', completedAt: '2026-08-01T10:05:00Z' },
      { weightKg: 90, reps: 5, setType: 'normal', completedAt: '2026-08-03T10:00:00Z' },
    ];
    expect(volumeByDate(sets)).toEqual([
      { date: '2026-08-01', volumeKg: 640 },
      { date: '2026-08-03', volumeKg: 450 },
    ]);
  });
});

describe('volumeByMuscleGroup', () => {
  it('attributes volume to each exercise muscle group and skips warmups', () => {
    const sets = [
      { weightKg: 80, reps: 8, setType: 'normal', exerciseId: 'bench' },
      { weightKg: 100, reps: 5, setType: 'normal', exerciseId: 'squat' },
      { weightKg: 20, reps: 12, setType: 'warmup', exerciseId: 'squat' },
    ];
    const groups = volumeByMuscleGroup(sets, { bench: 'chest', squat: 'legs' });
    expect(groups).toEqual({ chest: 640, legs: 500 });
  });
});
