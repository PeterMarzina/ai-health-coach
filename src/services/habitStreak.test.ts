import { computeCurrentStreak, computeLongestStreak, HabitSchedule } from './habitStreak';

// Ankerdatum: 2024-01-01 is een maandag (UTC), zodat weekday-rekenwerk in deze
// tests met de hand te verifiëren is.

describe('computeCurrentStreak — daily', () => {
  const schedule: HabitSchedule = { type: 'daily' };

  it('counts consecutive completed days ending yesterday when today is not done yet (grace)', () => {
    const entries = [
      { date: '2024-01-01', completed: true },
      { date: '2024-01-02', completed: true },
      { date: '2024-01-03', completed: true },
    ];
    expect(computeCurrentStreak(schedule, entries, '2024-01-04')).toBe(3);
  });

  it('includes today when today is already completed', () => {
    const entries = [
      { date: '2024-01-01', completed: true },
      { date: '2024-01-02', completed: true },
    ];
    expect(computeCurrentStreak(schedule, entries, '2024-01-02')).toBe(2);
  });

  it('resets on a missed day', () => {
    const entries = [
      { date: '2024-01-01', completed: true },
      // 01-02 gemist
      { date: '2024-01-03', completed: true },
    ];
    expect(computeCurrentStreak(schedule, entries, '2024-01-03')).toBe(1);
  });

  it('is 0 with no entries', () => {
    expect(computeCurrentStreak(schedule, [], '2024-01-03')).toBe(0);
  });
});

describe('computeCurrentStreak — weekdays (bv. ma/wo/vr)', () => {
  const schedule: HabitSchedule = { type: 'weekdays', weekdays: [1, 3, 5] }; // Mon/Wed/Fri

  it('counts only the scheduled days, skipping non-scheduled days silently', () => {
    const entries = [
      { date: '2024-01-01', completed: true }, // Mon
      { date: '2024-01-03', completed: true }, // Wed
      { date: '2024-01-05', completed: true }, // Fri
    ];
    expect(computeCurrentStreak(schedule, entries, '2024-01-05')).toBe(3);
  });

  it('does not break the streak on a non-scheduled day (Saturday)', () => {
    const entries = [
      { date: '2024-01-01', completed: true }, // Mon
      { date: '2024-01-03', completed: true }, // Wed
      { date: '2024-01-05', completed: true }, // Fri
    ];
    expect(computeCurrentStreak(schedule, entries, '2024-01-06')).toBe(3); // Sat, not scheduled
  });

  it('breaks on a missed scheduled day', () => {
    const entries = [
      { date: '2024-01-01', completed: true }, // Mon
      { date: '2024-01-03', completed: true }, // Wed
      // Fri 01-05 gemist
      { date: '2024-01-08', completed: true }, // volgende Mon
    ];
    expect(computeCurrentStreak(schedule, entries, '2024-01-08')).toBe(1);
  });
});

describe('computeCurrentStreak — times_per_week (weekcoulance)', () => {
  const schedule: HabitSchedule = { type: 'times_per_week', daysPerWeek: 3 };

  it('gives the in-progress current week grace (does not break the streak) while not yet counting it', () => {
    // Week 1 (ma 01-01 .. zo 01-07): 3x voltooid -> doel gehaald.
    const entries = [
      { date: '2024-01-01', completed: true },
      { date: '2024-01-02', completed: true },
      { date: '2024-01-03', completed: true },
      // Week 2 (ma 01-08 .. ): pas 1x zo ver, nog niet voorbij.
      { date: '2024-01-09', completed: true },
    ];
    expect(computeCurrentStreak(schedule, entries, '2024-01-10')).toBe(1);
  });

  it('counts the current week too once its weekly target is already met', () => {
    const entries = [
      { date: '2024-01-01', completed: true },
      { date: '2024-01-02', completed: true },
      { date: '2024-01-03', completed: true },
      { date: '2024-01-08', completed: true },
      { date: '2024-01-09', completed: true },
      { date: '2024-01-10', completed: true },
    ];
    expect(computeCurrentStreak(schedule, entries, '2024-01-12')).toBe(2);
  });

  it('breaks the streak when the most recent fully-finished week missed the target', () => {
    const entries = [
      // Week 1: doel gehaald.
      { date: '2024-01-01', completed: true },
      { date: '2024-01-02', completed: true },
      { date: '2024-01-03', completed: true },
      // Week 2 (volledig voorbij t.o.v. 'today' in week 3): maar 1x.
      { date: '2024-01-08', completed: true },
    ];
    expect(computeCurrentStreak(schedule, entries, '2024-01-17')).toBe(0);
  });
});

describe('computeLongestStreak', () => {
  it('daily: finds the longest historical run, even if the current one is shorter', () => {
    const schedule: HabitSchedule = { type: 'daily' };
    const entries = [
      { date: '2024-01-01', completed: true },
      { date: '2024-01-02', completed: true },
      { date: '2024-01-03', completed: true }, // run van 3
      { date: '2024-01-30', completed: true },
      { date: '2024-01-31', completed: true }, // huidige, kortere run van 2
    ];
    expect(computeLongestStreak(schedule, entries, '2024-02-01')).toBe(3);
  });

  it('times_per_week: longest run of weeks that hit the target', () => {
    const schedule: HabitSchedule = { type: 'times_per_week', daysPerWeek: 2 };
    const entries = [
      // Week 1 + 2: doel gehaald (2 losse weken op rij).
      { date: '2024-01-01', completed: true },
      { date: '2024-01-02', completed: true },
      { date: '2024-01-08', completed: true },
      { date: '2024-01-09', completed: true },
      // Week 3: gemist.
      { date: '2024-01-15', completed: true },
      // Week 4: huidige, in-progress week met 1x (nog geen 2x).
      { date: '2024-01-22', completed: true },
    ];
    expect(computeLongestStreak(schedule, entries, '2024-01-24')).toBe(2);
  });
});
