import { estimateOneRepMax, bestSetByEstimatedOneRepMax } from './oneRepMax';

describe('estimateOneRepMax (Epley)', () => {
  it('returns the weight itself at 1 rep (Epley: weight * (1 + 1/30))', () => {
    expect(estimateOneRepMax(100, 1)).toBeCloseTo(103.333, 2);
  });

  it('matches the formula from AGENTS.md: weight * (1 + reps/30)', () => {
    expect(estimateOneRepMax(80, 8)).toBeCloseTo(80 * (1 + 8 / 30), 6);
    expect(estimateOneRepMax(60, 10)).toBeCloseTo(80, 6);
  });

  it('returns 0 for non-positive weight or reps', () => {
    expect(estimateOneRepMax(0, 8)).toBe(0);
    expect(estimateOneRepMax(80, 0)).toBe(0);
    expect(estimateOneRepMax(-10, 8)).toBe(0);
    expect(estimateOneRepMax(80, -1)).toBe(0);
  });
});

describe('bestSetByEstimatedOneRepMax', () => {
  it('picks the set with the highest estimated 1RM, not just the heaviest', () => {
    const sets = [
      { weightKg: 100, reps: 1 }, // 1RM ≈ 103.3
      { weightKg: 80, reps: 8 },  // 1RM ≈ 101.3
      { weightKg: 60, reps: 15 }, // 1RM = 90
    ];
    expect(bestSetByEstimatedOneRepMax(sets)).toEqual({ weightKg: 100, reps: 1 });
  });

  it('returns null for an empty list', () => {
    expect(bestSetByEstimatedOneRepMax([])).toBeNull();
  });
});
