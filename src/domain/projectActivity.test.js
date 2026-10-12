import { describe, expect, it } from 'vitest';
import { activityByDay, activityGrid, activityLevel, lastActivityDay, recentlyFinished, stalledDays, standingFinishDays, } from './projectActivity';
const TODAY = '2026-10-12'; // a Monday
const ACTIVE = { status: 'active', createdAt: '2026-08-01T09:00:00' };
let counter = 0;
function event(type, entityId, day, time = '10:00') {
    counter++;
    return { id: `e-${counter}`, type, entityType: type.startsWith('section') ? 'section' : 'block', entityId, at: `${day}T${time}:00`, day, data: {} };
}
const created = (id, day, time) => event('block.created', id, day, time);
const finished = (id, day, time) => event('task.finished', id, day, time);
const reopened = (id, day, time) => event('task.reopened', id, day, time);
const opened = (id, day) => event('section.created', id, day);
function activity(events, ids = {}) {
    const input = {
        taskIds: new Set(ids.tasks ?? ['t1', 't2', 't3']),
        noteIds: new Set(ids.notes ?? ['n1', 'n2']),
        sectionIds: new Set(ids.sections ?? ['s1']),
        events,
    };
    return activityByDay(input);
}
describe('activityByDay: buckets per day', () => {
    it('adds up tasks created, tasks finished, notes and sections of the project', () => {
        const result = activity([
            opened('s1', '2026-10-07'),
            created('n1', '2026-10-07'),
            created('t1', '2026-10-07'),
            finished('t1', '2026-10-07', '17:00'),
            finished('t2', '2026-10-07', '18:00'),
            created('t2', '2026-10-01'),
        ]);
        expect(result.get('2026-10-07')).toEqual({ tasksCreated: 1, tasksFinished: 2, notes: 1, sections: 1 });
        expect(result.get('2026-10-01')).toEqual({ tasksCreated: 1, tasksFinished: 0, notes: 0, sections: 0 });
        expect(result.size).toBe(2);
    });
    it('ignores entities that are not in the project and events that are not activity', () => {
        const result = activity([
            created('other', TODAY),
            finished('other', TODAY),
            opened('s-other', TODAY),
            event('task.postponed', 't1', TODAY),
            event('section.titleChanged', 's1', TODAY),
        ]);
        expect(result.size).toBe(0);
    });
});
describe('activityByDay: reopened tasks', () => {
    it('no longer counts a finish that was reopened', () => {
        const result = activity([finished('t1', '2026-10-10'), reopened('t1', '2026-10-11')]);
        expect(result.get('2026-10-10')).toBeUndefined();
        expect(result.get('2026-10-11')).toBeUndefined();
    });
    it('counts a task finished again once, on the day of the last finish', () => {
        const result = activity([finished('t1', '2026-09-20'), reopened('t1', '2026-10-10', '09:00'), finished('t1', '2026-10-10', '17:00')]);
        expect(result.get('2026-09-20')).toBeUndefined();
        expect(result.get('2026-10-10')?.tasksFinished).toBe(1);
    });
    it('orders by time, not by the order the events arrive in', () => {
        const events = [finished('a', '2026-10-10', '17:00'), reopened('a', '2026-10-10', '09:00'), finished('a', '2026-10-09')];
        expect(standingFinishDays(events, new Set(['a']))).toEqual(['2026-10-10']);
    });
});
describe('recentlyFinished: the last 2 weeks', () => {
    it('counts finishes from 13 days ago up to today', () => {
        const result = activity([finished('t1', '2026-09-28'), finished('t2', '2026-09-29'), finished('t3', TODAY)]);
        // 2026-09-29 is 13 days before today: inside. 2026-09-28 is 14 days before: outside.
        expect(recentlyFinished(result, TODAY)).toBe(2);
    });
    it('counts only finishes, not other activity', () => {
        expect(recentlyFinished(activity([created('t1', TODAY), created('n1', TODAY)]), TODAY)).toBe(0);
    });
});
describe('stalledDays: "Parado há N dias"', () => {
    it('is stalled after exactly 14 days without activity', () => {
        expect(stalledDays(ACTIVE, activity([finished('t1', '2026-09-28')]), TODAY)).toBe(14);
        expect(stalledDays(ACTIVE, activity([finished('t1', '2026-09-29')]), TODAY)).toBeNull();
    });
    it('counts every kind of activity, not only finishes', () => {
        expect(stalledDays(ACTIVE, activity([created('n1', '2026-10-01')]), TODAY)).toBeNull();
        expect(stalledDays(ACTIVE, activity([opened('s1', '2026-10-01')]), TODAY)).toBeNull();
        expect(stalledDays(ACTIVE, activity([created('t1', '2026-09-20')]), TODAY)).toBe(22);
    });
    it('counts a project with no activity at all from the day it was created', () => {
        expect(stalledDays(ACTIVE, activity([]), TODAY)).toBe(72);
    });
    it('never calls a finished project stalled', () => {
        expect(stalledDays({ ...ACTIVE, status: 'finished' }, activity([]), TODAY)).toBeNull();
    });
    it('does not count a reopened finish as activity', () => {
        const result = activity([created('t1', '2026-08-20'), finished('t1', '2026-10-10'), reopened('t1', '2026-10-11')]);
        expect(lastActivityDay(result, TODAY)).toBe('2026-08-20');
        expect(stalledDays(ACTIVE, result, TODAY)).toBe(53);
    });
});
describe('activityLevel', () => {
    it('has four steps of intensity plus empty', () => {
        expect([0, 1, 2, 3, 4, 5, 6, 20].map(activityLevel)).toEqual([0, 1, 2, 2, 3, 3, 4, 4]);
    });
});
describe('activityGrid: one column per week, one row per day', () => {
    it('ends with the current week and starts on Mondays', () => {
        const grid = activityGrid(new Map(), TODAY, 16);
        expect(grid).toHaveLength(16);
        expect(grid.every((column) => column.length === 7)).toBe(true);
        expect(grid[15][0].day).toBe(TODAY);
        expect(grid[0][0].day).toBe('2026-06-29');
        expect(grid[0][6].day).toBe('2026-07-05');
    });
    it('marks the days after today as future, without level', () => {
        const grid = activityGrid(new Map([['2026-10-13', { tasksCreated: 9, tasksFinished: 0, notes: 0, sections: 0 }]]), TODAY, 8);
        const current = grid[7];
        expect(current[0]).toMatchObject({ day: TODAY, future: false, level: 0 });
        expect(current[1]).toMatchObject({ day: '2026-10-13', future: true, level: 0 });
    });
    it('gives each day its activity and level', () => {
        const result = activity([created('n1', '2026-10-07'), finished('t1', '2026-10-07'), finished('t2', '2026-10-07')]);
        const cell = activityGrid(result, TODAY, 8)[6][2];
        expect(cell).toMatchObject({ day: '2026-10-07', level: 2, activity: { notes: 1, tasksFinished: 2 } });
    });
});
