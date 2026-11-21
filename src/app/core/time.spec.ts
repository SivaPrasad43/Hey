import { dayLabel, isSameDay, shortAgo } from './time';

describe('time helpers', () => {
  const now = new Date(2026, 10, 21, 15, 0);

  it('labels today and yesterday', () => {
    expect(dayLabel(new Date(2026, 10, 21, 9), now)).toBe('Today');
    expect(dayLabel(new Date(2026, 10, 20, 23), now)).toBe('Yesterday');
    expect(dayLabel(new Date(2026, 10, 10), now)).not.toMatch(/Today|Yesterday/);
  });

  it('isSameDay compares calendar days', () => {
    expect(isSameDay(new Date(2026, 0, 1, 0, 1), new Date(2026, 0, 1, 23, 59))).toBeTrue();
    expect(isSameDay(new Date(2026, 0, 1), new Date(2026, 0, 2))).toBeFalse();
  });

  it('shortAgo gives compact labels', () => {
    expect(shortAgo(new Date(now.getTime() - 10_000), now)).toBe('now');
    expect(shortAgo(new Date(now.getTime() - 5 * 60_000), now)).toBe('5m');
    expect(shortAgo(new Date(now.getTime() - 3 * 3_600_000), now)).toBe('3h');
  });
});
