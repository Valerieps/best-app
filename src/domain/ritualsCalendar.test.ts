import { describe, expect, it } from 'vitest';
import { calendarDayState, monthWeeks } from './ritualsCalendar';

describe('rituals calendar', () => {
  it('lays a month out in weeks starting on Sunday', () => {
    // October 2026 starts on a Thursday and ends on a Saturday.
    const weeks = monthWeeks('2026-10');
    expect(weeks).toHaveLength(5);
    expect(weeks[0]).toEqual([null, null, null, null, '2026-10-01', '2026-10-02', '2026-10-03']);
    expect(weeks[4]).toEqual(['2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31']);
    expect(weeks.flat().filter(Boolean)).toHaveLength(31);
  });

  it('pads the last week of a month that ends mid-week', () => {
    // February 2026 starts on a Sunday and ends on a Saturday: four full weeks.
    expect(monthWeeks('2026-02')).toHaveLength(4);
    const september = monthWeeks('2026-09');
    expect(september.at(-1)).toEqual(['2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', null, null, null]);
  });

  it('tells each day apart: pending, today, closed, without a note and future', () => {
    const today = '2026-10-15';
    const pending = new Set(['2026-10-05', '2026-10-14']);
    const written = new Set(['2026-10-05', '2026-10-12', '2026-10-14', '2026-10-15']);
    const state = (day: string) => calendarDayState(day, today, pending, written);
    expect(state('2026-10-05')).toBe('pending');
    expect(state('2026-10-14')).toBe('pending');
    expect(state('2026-10-15')).toBe('today');
    expect(state('2026-10-12')).toBe('closed');
    expect(state('2026-10-11')).toBe('empty');
    expect(state('2026-10-16')).toBe('future');
  });

  it('keeps today clickable even when it has nothing pending', () => {
    expect(calendarDayState('2026-10-15', '2026-10-15', new Set(), new Set())).toBe('today');
  });
});
