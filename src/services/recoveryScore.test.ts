import { computeRecoveryScore, recoveryLabel } from './recoveryScore';

describe('computeRecoveryScore', () => {
  it('scores perfect sleep and light load without HR as 100', () => {
    expect(computeRecoveryScore({ sleepHours: 8, sleepQuality: 5, trainingLoad: 1 })).toEqual({ score: 100, label: 'high' });
  });

  it('uses the personal sleep target', () => {
    const base = { sleepHours: 7.5, sleepQuality: 5, trainingLoad: 1 };
    expect(computeRecoveryScore({ ...base, sleepTargetHours: 7.5 }).score).toBe(100);
    expect(computeRecoveryScore({ ...base, sleepTargetHours: 8.5 }).score).toBeLessThan(100);
  });

  it('includes resting heart rate only when a baseline exists', () => {
    const base = { sleepHours: 8, sleepQuality: 5, trainingLoad: 1, restingHeartRate: 70 };
    expect(computeRecoveryScore(base).score).toBe(100);
    expect(computeRecoveryScore({ ...base, restingHeartRateBaseline: 60 }).score).toBe(80);
  });
});

describe('recoveryLabel', () => {
  it('maps score bands', () => {
    expect(recoveryLabel(75)).toBe('high');
    expect(recoveryLabel(74)).toBe('medium');
    expect(recoveryLabel(45)).toBe('medium');
    expect(recoveryLabel(44)).toBe('low');
  });
});
