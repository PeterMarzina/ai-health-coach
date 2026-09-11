import { weeklyWeightChange } from './weightTrend';

describe('weeklyWeightChange', () => {
  it('returns null without at least two logs', () => {
    expect(weeklyWeightChange([])).toBeNull();
    expect(weeklyWeightChange([{ date: '2026-09-10', weightKg: 78 }])).toBeNull();
  });

  it('compares against the log exactly 7 days earlier', () => {
    const logs = [
      { date: '2026-09-03', weightKg: 79.0 },
      { date: '2026-09-07', weightKg: 78.8 },
      { date: '2026-09-10', weightKg: 78.4 },
    ];
    expect(weeklyWeightChange(logs)).toBe(-0.6);
  });

  it('uses the most recent log on or before the cutoff when that day was skipped', () => {
    const logs = [
      { date: '2026-08-30', weightKg: 80.0 },
      { date: '2026-09-01', weightKg: 79.5 },
      { date: '2026-09-06', weightKg: 79.0 },
      { date: '2026-09-10', weightKg: 79.2 },
    ];
    expect(weeklyWeightChange(logs)).toBe(-0.3);
  });

  it('returns null when all logs are from the last 7 days', () => {
    const logs = [
      { date: '2026-09-05', weightKg: 79.0 },
      { date: '2026-09-10', weightKg: 78.5 },
    ];
    expect(weeklyWeightChange(logs)).toBeNull();
  });
});
