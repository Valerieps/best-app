import { describe, expect, it } from 'vitest';
import { weeklyMetrics } from './metrics';
import { weekOf } from './week';
let id = 0;
function event(type, entityId, day, data = {}) {
    return { id: `e${++id}`, type, entityType: 'block', entityId, at: `${day}T12:00:00Z`, day, data };
}
const week = weekOf('2026-10-11'); // 5 to 11 October
describe('weeklyMetrics', () => {
    it('counts postponed tasks once each, finished tasks, and intention accuracy', () => {
        const metrics = weeklyMetrics([
            event('task.postponed', 'a', '2026-10-06'),
            event('task.postponed', 'a', '2026-10-07'),
            event('task.postponed', 'b', '2026-10-08'),
            event('task.postponed', 'c', '2026-10-01'), // previous week
            event('task.finished', 'a', '2026-10-08', { intendedDate: '2026-10-08' }), // on time, after 2 postponements
            event('task.finished', 'd', '2026-10-09', { intendedDate: '2026-10-08' }), // late
            event('task.finished', 'e', '2026-10-09', { intendedDate: null }), // never had a date
        ], week);
        expect(metrics).toEqual({
            postponedTasks: 2,
            finishedTasks: 3,
            finishedWithIntention: 2,
            finishedOnIntendedDay: 1,
            intentionAccuracy: 0.5,
        });
    });
    it('has no accuracy when no finished task had a date', () => {
        expect(weeklyMetrics([], week).intentionAccuracy).toBeNull();
    });
});
