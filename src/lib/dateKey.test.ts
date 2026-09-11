import { localDateKey, msUntilNextLocalMidnight } from './dateKey';

describe('localDateKey', () => {
  it('uses the local calendar date, also just after midnight', () => {
    // Local 00:30 on 11 Sep — in UTC+2 this is still 10 Sep, which toISOString() would return.
    expect(localDateKey(new Date(2026, 8, 11, 0, 30))).toBe('2026-09-11');
  });

  it('pads month and day', () => {
    expect(localDateKey(new Date(2026, 0, 5, 12, 0))).toBe('2026-01-05');
  });

  it('handles the last minute of the year', () => {
    expect(localDateKey(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });
});

describe('msUntilNextLocalMidnight', () => {
  it('points just past the next local midnight', () => {
    const now = new Date(2026, 8, 11, 23, 0, 0);
    const fireAt = new Date(now.getTime() + msUntilNextLocalMidnight(now));
    expect(localDateKey(fireAt)).toBe('2026-09-12');
    expect(fireAt.getHours()).toBe(0);
  });
});
