import { describe, expect, it } from 'vitest';
import { dueReflectionWeek, lastScheduledMoment } from './reflectionSchedule';

const friday17 = { weekday: 5, hour: 17 };

describe('weekly reflection schedule', () => {
  it('finds the latest scheduled moment', () => {
    expect(lastScheduledMoment(new Date(2026, 9, 16, 18), friday17)).toEqual(new Date(2026, 9, 16, 17));
    expect(lastScheduledMoment(new Date(2026, 9, 16, 16), friday17)).toEqual(new Date(2026, 9, 9, 17));
    expect(lastScheduledMoment(new Date(2026, 9, 18, 9), friday17)).toEqual(new Date(2026, 9, 16, 17));
  });

  it('is due for the week of a Friday reflection until the week is closed', () => {
    const now = new Date(2026, 9, 16, 18);
    expect(dueReflectionWeek(now, friday17, () => false)?.key).toBe('2026-W42');
    expect(dueReflectionWeek(now, friday17, () => true)).toBeNull();
  });

  it('a Monday reflection looks at the week that just ended', () => {
    expect(dueReflectionWeek(new Date(2026, 9, 12, 10), { weekday: 1, hour: 9 }, () => false)?.key).toBe('2026-W41');
  });

  it('is never due without a schedule', () => {
    expect(dueReflectionWeek(new Date(), null, () => false)).toBeNull();
  });
});
