import { describe, expect, it } from 'vitest';
import { addDays, compareDays, isDayKey, laterDay, toDayKey } from './day';

describe('day keys', () => {
  it('uses the local calendar day, turning over at midnight', () => {
    expect(toDayKey(new Date(2026, 9, 11, 23, 59))).toBe('2026-10-11');
    expect(toDayKey(new Date(2026, 9, 12, 0, 0))).toBe('2026-10-12');
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('compares and picks the later day', () => {
    expect(compareDays('2026-10-10', '2026-10-11')).toBeLessThan(0);
    expect(compareDays('2026-10-11', '2026-10-11')).toBe(0);
    expect(laterDay('2026-10-12', '2026-10-11')).toBe('2026-10-12');
  });

  it('validates the format', () => {
    expect(isDayKey('2026-10-11')).toBe(true);
    expect(isDayKey('2026-1-11')).toBe(false);
    expect(isDayKey(20261011)).toBe(false);
  });
});
