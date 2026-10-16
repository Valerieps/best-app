import { describe, expect, it } from 'vitest';
import type { DomainEvent, EventType } from './events';
import { periodMetrics, weeklyMetrics } from './metrics';
import { weekOf } from './week';

let id = 0;
function event(type: EventType, entityId: string, day: string, data: Record<string, unknown> = {}): DomainEvent {
  return { id: `e${++id}`, type, entityType: 'block', entityId, at: `${day}T12:00:00Z`, day, data } as DomainEvent;
}

const week = weekOf('2026-10-11'); // 5 to 11 October

describe('weeklyMetrics', () => {
  it('counts postponed tasks once each, finished tasks, and intention accuracy', () => {
    const metrics = weeklyMetrics(
      [
        event('task.postponed', 'a', '2026-10-06'),
        event('task.postponed', 'a', '2026-10-07'),
        event('task.postponed', 'b', '2026-10-08'),
        event('task.postponed', 'c', '2026-10-01'), // previous week
        event('task.finished', 'a', '2026-10-08', { intendedDate: '2026-10-08' }), // on time, after 2 postponements
        event('task.finished', 'd', '2026-10-09', { intendedDate: '2026-10-08' }), // late
        event('task.finished', 'e', '2026-10-09', { intendedDate: null }), // never had a date
      ],
      week,
    );
    expect(metrics).toEqual({
      postponedTasks: 2,
      finishedTasks: 3,
      finishedWithIntention: 2,
      finishedOnIntendedDay: 1,
      intentionAccuracy: 0.5,
    });
  });

  it('leaves the follow-up date of a waiting task out of the accuracy (spec/pessoas.md)', () => {
    const metrics = weeklyMetrics(
      [
        event('task.finished', 'a', '2026-10-08', { intendedDate: '2026-10-08' }),
        event('task.finished', 'w', '2026-10-09', { intendedDate: '2026-10-08', waiting: true }),
      ],
      week,
    );
    expect(metrics).toMatchObject({ finishedTasks: 2, finishedWithIntention: 1, intentionAccuracy: 1 });
  });

  it('has no accuracy when no finished task had a date', () => {
    expect(weeklyMetrics([], week).intentionAccuracy).toBeNull();
  });
});

describe('periodMetrics', () => {
  it('counts only the events after the last review, by the moment they happened', () => {
    const events = [
      event('task.postponed', 'a', '2026-10-01'),
      event('task.postponed', 'b', '2026-10-09'),
      event('task.finished', 'b', '2026-10-10', { intendedDate: '2026-10-10' }),
    ];
    expect(periodMetrics(events, '2026-10-05T00:00:00Z')).toMatchObject({ postponedTasks: 1, finishedTasks: 1, intentionAccuracy: 1 });
    expect(periodMetrics(events, null).postponedTasks).toBe(2);
    expect(periodMetrics(events, null, '2026-10-09T23:00:00Z').finishedTasks).toBe(0);
  });
});
