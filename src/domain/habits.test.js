import { describe, expect, it } from 'vitest';
import { habitStats, isExpectedOn } from './habits';
import { monthRange, shiftMonth } from './month';
const weekdaysOnly = {
    id: 'h',
    name: 'Ler 10 páginas',
    criterion: '',
    weekdays: [1, 2, 3, 4, 5],
    objectiveId: null,
    status: 'active',
    createdAt: '',
    updatedAt: '',
};
const log = (day, done = true) => ({ id: `h:${day}`, habitId: 'h', day, done, updatedAt: '' });
describe('habits', () => {
    it('is expected only on its weekdays', () => {
        expect(isExpectedOn(weekdaysOnly, '2026-10-12')).toBe(true); // Monday
        expect(isExpectedOn(weekdaysOnly, '2026-10-11')).toBe(false); // Sunday
    });
    it('counts completion over expected days, and weekends do not break the streak', () => {
        // Week of 5 to 11 October: Mon–Fri expected. Done Thu, Fri; then Mon 12 too.
        const logs = [log('2026-10-05'), log('2026-10-06', false), log('2026-10-08'), log('2026-10-09'), log('2026-10-12')];
        const stats = habitStats(weekdaysOnly, logs, '2026-10-05', '2026-10-12');
        expect(stats).toEqual({ expected: 6, done: 4, completion: 4 / 6, longestStreak: 3 });
    });
    it('does not count days before the habit existed', () => {
        const createdMonday = { ...weekdaysOnly, createdAt: new Date(2026, 9, 12, 9).toISOString() };
        const stats = habitStats(createdMonday, [log('2026-10-12')], '2026-10-05', '2026-10-12');
        expect(stats).toMatchObject({ expected: 1, done: 1, completion: 1 });
    });
    it('has no completion when nothing was expected', () => {
        expect(habitStats(weekdaysOnly, [], '2026-10-10', '2026-10-11').completion).toBeNull();
    });
});
describe('months', () => {
    it('knows the first and last day', () => {
        expect(monthRange('2026-02')).toEqual({ key: '2026-02', start: '2026-02-01', end: '2026-02-28' });
        expect(monthRange('2026-12').end).toBe('2026-12-31');
    });
    it('moves between months across years', () => {
        expect(shiftMonth('2026-12', 1)).toBe('2027-01');
        expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    });
});
