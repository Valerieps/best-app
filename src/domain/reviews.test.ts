import { describe, expect, it } from 'vitest';
import type { Reflection } from './entities';
import type { DomainEvent, EventType } from './events';
import {
  checkoutsSince,
  closedReviewsSince,
  directionReasons,
  focusReasons,
  lastClosedAt,
  objectiveStalledDays,
  reviewKindOf,
  type DirectionSignals,
  type FocusSignals,
} from './reviews';

let id = 0;
function event(type: EventType, entityId: string, at: string): DomainEvent {
  return { id: `e${++id}`, type, entityType: 'day', entityId, at, day: at.slice(0, 10), data: {} };
}

function reflection(kind: Reflection['kind'], closedAt: string | null): Reflection {
  return { id: `r${++id}`, kind, period: '', start: '2026-10-01', end: '2026-10-01', bestMoments: '', improvements: '', closedAt, updatedAt: '' };
}

describe('review kinds and periods', () => {
  it('counts the old weekly and monthly reflections as Foco and Rumo', () => {
    expect(reviewKindOf({ kind: 'week' })).toBe('focus');
    expect(reviewKindOf({ kind: 'focus' })).toBe('focus');
    expect(reviewKindOf({ kind: 'month' })).toBe('direction');
    expect(reviewKindOf({ kind: 'direction' })).toBe('direction');
  });

  it('finds the latest closed review of a kind, ignoring open ones', () => {
    const reflections = [
      reflection('week', '2026-10-01T10:00:00Z'),
      reflection('focus', '2026-10-08T10:00:00Z'),
      reflection('focus', null),
      reflection('direction', '2026-10-09T10:00:00Z'),
    ];
    expect(lastClosedAt(reflections, 'focus')).toBe('2026-10-08T10:00:00Z');
    expect(lastClosedAt(reflections, 'direction')).toBe('2026-10-09T10:00:00Z');
    expect(lastClosedAt([], 'focus')).toBeNull();
  });

  it('counts the reviews closed after a moment', () => {
    const reflections = [reflection('week', '2026-10-01T10:00:00Z'), reflection('focus', '2026-10-08T10:00:00Z'), reflection('focus', null)];
    expect(closedReviewsSince(reflections, 'focus', null)).toBe(2);
    expect(closedReviewsSince(reflections, 'focus', '2026-10-01T10:00:00Z')).toBe(1);
  });

  it('counts each closed day once, after the last review', () => {
    const events = [
      event('day.checkoutCompleted', '2026-10-05', '2026-10-05T20:00:00Z'),
      event('day.checkoutCompleted', '2026-10-06', '2026-10-06T20:00:00Z'),
      event('day.checkoutCompleted', '2026-10-06', '2026-10-06T22:00:00Z'), // the same day again
      event('day.checkoutCompleted', '2026-10-07', '2026-10-08T09:00:00Z'), // closed late, still counts
      event('day.started', '2026-10-08', '2026-10-08T08:00:00Z'),
    ];
    expect(checkoutsSince(events, null)).toBe(3);
    expect(checkoutsSince(events, '2026-10-05T21:00:00Z')).toBe(2);
  });
});

describe('focusReasons', () => {
  const quiet: FocusSignals = { checkouts: 0, cadence: 5, awaitingItems: 0, stalledFocusProjects: [], focusListEmptied: false };

  it('is empty when nothing calls for the review', () => {
    expect(focusReasons({ ...quiet, checkouts: 4, awaitingItems: 9 })).toEqual([]);
  });

  it('becomes available by the cadence', () => {
    expect(focusReasons({ ...quiet, checkouts: 5 })).toEqual([{ kind: 'cadence', count: 5 }]);
  });

  it('becomes available by each signal, with its reason', () => {
    expect(
      focusReasons({ ...quiet, awaitingItems: 10, stalledFocusProjects: [{ projectId: 'p', days: 15 }], focusListEmptied: true }),
    ).toEqual([{ kind: 'awaitingItems', count: 10 }, { kind: 'stalledFocusProject', projectId: 'p', days: 15 }, { kind: 'focusListEmptied' }]);
  });
});

describe('directionReasons', () => {
  const quiet: DirectionSignals = {
    focusReviews: 0,
    cadence: 4,
    hadDirectionReview: true,
    finishedTasks: 0,
    finishedWithoutObjective: 0,
    stalledObjectives: [],
  };

  it('becomes available by the cadence, even before the first Revisão de Rumo', () => {
    expect(directionReasons({ ...quiet, hadDirectionReview: false, focusReviews: 4 })).toEqual([{ kind: 'cadence', count: 4 }]);
  });

  it('ignores the signals before the first Revisão de Rumo', () => {
    expect(
      directionReasons({ ...quiet, hadDirectionReview: false, finishedTasks: 20, finishedWithoutObjective: 20, stalledObjectives: [{ objectiveId: 'o', days: 40 }] }),
    ).toEqual([]);
  });

  it('needs 10 finished tasks and more than half without objective', () => {
    expect(directionReasons({ ...quiet, finishedTasks: 9, finishedWithoutObjective: 9 })).toEqual([]);
    expect(directionReasons({ ...quiet, finishedTasks: 10, finishedWithoutObjective: 5 })).toEqual([]);
    expect(directionReasons({ ...quiet, finishedTasks: 10, finishedWithoutObjective: 6 })).toEqual([
      { kind: 'tasksWithoutObjective', withoutObjective: 6, finished: 10 },
    ]);
  });

  it('lists each stalled objective', () => {
    expect(directionReasons({ ...quiet, stalledObjectives: [{ objectiveId: 'o', days: 31 }] })).toEqual([
      { kind: 'stalledObjective', objectiveId: 'o', days: 31 },
    ]);
  });
});

describe('objectiveStalledDays', () => {
  const objective = { status: 'active' as const, createdAt: '2026-08-01T12:00:00' };

  it('counts the days since the last activity in its projects', () => {
    expect(objectiveStalledDays(objective, true, '2026-09-10', '2026-10-10')).toBe(30);
    expect(objectiveStalledDays(objective, true, '2026-09-11', '2026-10-10')).toBeNull();
  });

  it('counts from its creation when its projects never had activity', () => {
    expect(objectiveStalledDays(objective, true, null, '2026-10-10')).toBe(70);
  });

  it('never stalls without projects or once finished', () => {
    expect(objectiveStalledDays(objective, false, null, '2026-10-10')).toBeNull();
    expect(objectiveStalledDays({ ...objective, status: 'finished' }, true, null, '2026-10-10')).toBeNull();
  });
});
