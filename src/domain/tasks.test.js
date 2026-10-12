import { describe, expect, it } from 'vitest';
import { section, task, note } from '../test/builders';
import { canEditFreely, isPostponement, isTaskPendingOn, lastTriagedDayAfterReopen, nextPlanningDay, } from './tasks';
describe('isPostponement', () => {
    it('counts moving the date later and removing it', () => {
        expect(isPostponement('2026-10-11', '2026-10-12')).toBe(true);
        expect(isPostponement('2026-10-11', null)).toBe(true);
    });
    it('does not count the first intended date or moving earlier', () => {
        expect(isPostponement(null, '2026-10-12')).toBe(false);
        expect(isPostponement('2026-10-14', '2026-10-12')).toBe(false);
        expect(isPostponement('2026-10-12', '2026-10-12')).toBe(false);
    });
});
describe('nextPlanningDay', () => {
    it('is the day after the triaged day, but never before today', () => {
        expect(nextPlanningDay('2026-10-11', '2026-10-11')).toBe('2026-10-12');
        expect(nextPlanningDay('2026-10-08', '2026-10-11')).toBe('2026-10-11');
    });
});
describe('isTaskPendingOn', () => {
    const s = section({ day: '2026-10-10' });
    it('is pending on the day it was written until triaged', () => {
        const t = task(s.id);
        expect(isTaskPendingOn(t, '2026-10-10', '2026-10-10')).toBe(true);
        expect(isTaskPendingOn({ ...t, lastTriagedDay: '2026-10-10' }, '2026-10-10', '2026-10-10')).toBe(false);
    });
    it('is pending on its intended day, even after older triages', () => {
        const t = task(s.id, 'x', { intendedDate: '2026-10-11', lastTriagedDay: '2026-10-10' });
        expect(isTaskPendingOn(t, '2026-10-10', '2026-10-11')).toBe(true);
        expect(isTaskPendingOn(t, '2026-10-10', '2026-10-10')).toBe(false);
    });
    it('is never pending once finished, archived or abandoned', () => {
        for (const status of ['done', 'archived', 'abandoned']) {
            expect(isTaskPendingOn(task(s.id, 'x', { status }), '2026-10-10', '2026-10-10')).toBe(false);
        }
    });
    it('is not pending on a day it does not show up in', () => {
        expect(isTaskPendingOn(task(s.id), '2026-10-10', '2026-10-12')).toBe(false);
    });
});
describe('canEditFreely', () => {
    const today = '2026-10-11';
    it('allows deleting and changing kind of untriaged blocks written today', () => {
        const s = section({ day: today });
        expect(canEditFreely(note(s.id), s, today)).toBe(true);
        expect(canEditFreely(task(s.id), s, today)).toBe(true);
    });
    it('protects blocks from other days and triaged blocks', () => {
        const old = section({ day: '2026-10-10' });
        expect(canEditFreely(task(old.id), old, today)).toBe(false);
        const s = section({ day: today });
        expect(canEditFreely(task(s.id, 'x', { intendedDate: '2026-10-12' }), s, today)).toBe(false);
        expect(canEditFreely(task(s.id, 'x', { lastTriagedDay: today }), s, today)).toBe(false);
        expect(canEditFreely(task(s.id, 'x', { status: 'done' }), s, today)).toBe(false);
        const wikiSection = { ...s, notesDestination: 'wiki' };
        expect(canEditFreely(note(s.id), wikiSection, today)).toBe(false);
    });
});
describe('lastTriagedDayAfterReopen', () => {
    it('makes the task pending today without reopening older days', () => {
        expect(lastTriagedDayAfterReopen(null, '2026-10-11')).toBeNull();
        expect(lastTriagedDayAfterReopen('2026-10-09', '2026-10-11')).toBe('2026-10-09');
        expect(lastTriagedDayAfterReopen('2026-10-11', '2026-10-11')).toBe('2026-10-10');
    });
});
