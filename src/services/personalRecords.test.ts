import { detectPersonalRecords } from './personalRecords';

describe('detectPersonalRecords', () => {
  it('detects no PRs on the very first time doing an exercise (nothing to break)', () => {
    const newSets = [{ weightKg: 100, reps: 5, setType: 'normal' }];
    expect(detectPersonalRecords(newSets, [])).toEqual([]);
  });

  it('detects a new max-weight PR', () => {
    const prior = [{ weightKg: 80, reps: 8, setType: 'normal' }];
    const fresh = [{ weightKg: 85, reps: 5, setType: 'normal' }];
    const prs = detectPersonalRecords(fresh, prior);
    expect(prs).toContainEqual(
      expect.objectContaining({ type: 'max_weight', weightKg: 85, reps: 5 })
    );
  });

  it('does not report a max-weight PR when the new top weight does not beat history', () => {
    const prior = [{ weightKg: 100, reps: 3, setType: 'normal' }];
    const fresh = [{ weightKg: 90, reps: 8, setType: 'normal' }];
    const prs = detectPersonalRecords(fresh, prior);
    expect(prs.find((p) => p.type === 'max_weight')).toBeUndefined();
  });

  it('detects a new estimated-1RM PR even without a heavier top weight', () => {
    // Prior best: 100kg x 1 (1RM ≈ 103.3). New: 90kg x 8 (1RM = 90*(1+8/30) ≈ 114) beats it.
    const prior = [{ weightKg: 100, reps: 1, setType: 'normal' }];
    const fresh = [{ weightKg: 90, reps: 8, setType: 'normal' }];
    const prs = detectPersonalRecords(fresh, prior);
    expect(prs.find((p) => p.type === 'max_1rm')).toEqual(
      expect.objectContaining({ type: 'max_1rm', weightKg: 90, reps: 8 })
    );
    expect(prs.find((p) => p.type === 'max_weight')).toBeUndefined();
  });

  it('detects a max-reps-at-weight PR only for weights with prior history at that exact weight', () => {
    const prior = [
      { weightKg: 60, reps: 8, setType: 'normal' },
      { weightKg: 60, reps: 6, setType: 'normal' },
    ];
    const fresh = [
      { weightKg: 60, reps: 10, setType: 'normal' }, // beats prior best (8) at 60kg
      { weightKg: 70, reps: 5, setType: 'normal' }, // never lifted 70kg before -> no reps-PR (nothing to compare)
    ];
    const prs = detectPersonalRecords(fresh, prior);
    expect(prs).toContainEqual(
      expect.objectContaining({ type: 'max_reps_at_weight', weightKg: 60, reps: 10 })
    );
    expect(prs.find((p) => p.type === 'max_reps_at_weight' && p.weightKg === 70)).toBeUndefined();
  });

  it('ignores warmup sets on both sides of the comparison', () => {
    const prior = [
      { weightKg: 120, reps: 1, setType: 'warmup' }, // should not count as a real prior best
      { weightKg: 80, reps: 8, setType: 'normal' },
    ];
    const fresh = [
      { weightKg: 20, reps: 20, setType: 'warmup' },
      { weightKg: 85, reps: 5, setType: 'normal' },
    ];
    const prs = detectPersonalRecords(fresh, prior);
    expect(prs).toContainEqual(expect.objectContaining({ type: 'max_weight', weightKg: 85 }));
  });

  it('returns an empty array when the session had only warmup sets', () => {
    const prior = [{ weightKg: 80, reps: 8, setType: 'normal' }];
    const fresh = [{ weightKg: 20, reps: 10, setType: 'warmup' }];
    expect(detectPersonalRecords(fresh, prior)).toEqual([]);
  });
});
