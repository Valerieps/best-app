import { describe, expect, it } from 'vitest';
import type { PriorityList, Project } from './entities';
import type { DomainEvent } from './events';
import {
  focusProjectIds,
  focusProjectsOnDay,
  legacyListInEffect,
  legacyWeekListId,
  migrateMonthPriorityLists,
  migrateToFocusList,
  recordedFocusProjects,
  withAddedProject,
  withRemovedProject,
  withSwappedProject,
} from './focusProjects';
import { weekOf } from './week';

function weekList(week: string, itemIds: string[]): PriorityList {
  return { id: legacyWeekListId(week), scope: 'weekProjects', period: week, itemIds, updatedAt: '' };
}

function project(id: string, status: Project['status'] = 'active'): Project {
  return { id, name: id, status, createdAt: '', updatedAt: '', finishedAt: null };
}

let eventId = 0;
function change(type: 'priority.added' | 'priority.removed', at: string, itemIds: string[], reason?: 'removed' | 'finished'): DomainEvent {
  return {
    id: `e${++eventId}`,
    type,
    entityType: 'priorities',
    entityId: 'focusProjects',
    at,
    day: at.slice(0, 10),
    data: reason ? { projectId: 'p', itemIds, reason } : { projectId: 'p', itemIds },
  } as DomainEvent;
}

describe('projects in focus', () => {
  it('shows only active projects, in the order chosen, at most 3', () => {
    const projects = [project('a'), project('b', 'finished'), project('c'), project('d'), project('e')];
    expect(focusProjectIds({ itemIds: ['c', 'b', 'a', 'd', 'e'] }, projects)).toEqual(['c', 'a']);
    expect(focusProjectIds(undefined, projects)).toEqual([]);
  });

  it('keeps what was recorded, whatever happened to the projects later', () => {
    expect(recordedFocusProjects({ itemIds: ['a', 'a', 'b', 'c', 'd'] })).toEqual(['a', 'b', 'c']);
  });

  it('adds a project only while there is a free slot', () => {
    expect(withAddedProject(['a', 'b'], 'c')).toEqual(['a', 'b', 'c']);
    expect(withAddedProject(['a', 'b', 'c'], 'd')).toBeNull();
    expect(withAddedProject(['a'], 'a')).toBeNull();
  });

  it('removes a project in the list', () => {
    expect(withRemovedProject(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
    expect(withRemovedProject(['a'], 'z')).toBeNull();
  });

  it('swaps a project in the list for one outside it, in the same place', () => {
    expect(withSwappedProject(['a', 'b', 'c'], 'b', 'd')).toEqual(['a', 'd', 'c']);
    expect(withSwappedProject(['a', 'b'], 'z', 'd')).toBeNull();
    expect(withSwappedProject(['a', 'b'], 'a', 'b')).toBeNull();
  });
});

describe('focusProjectsOnDay: the history for the raio-x', () => {
  const legacy = [weekList('2026-W40', ['old'])];
  const events = [change('priority.added', '2026-10-10T10:00:00Z', ['a']), change('priority.added', '2026-10-12T10:00:00Z', ['a', 'b'])];

  it('uses the latest change up to the end of the day', () => {
    expect(focusProjectsOnDay('2026-10-10', events, legacy)).toEqual(['a']);
    expect(focusProjectsOnDay('2026-10-11', events, legacy)).toEqual(['a']);
    expect(focusProjectsOnDay('2026-10-12', events, legacy)).toEqual(['a', 'b']);
  });

  it('falls back to the old week lists before the first change', () => {
    expect(focusProjectsOnDay('2026-10-05', events, legacy)).toEqual(['old']);
    expect(focusProjectsOnDay('2026-09-01', events, legacy)).toEqual([]);
  });
});

describe('legacyListInEffect: the old week lists carried over', () => {
  const lists = [
    weekList('2026-W40', ['a']),
    weekList('2026-W42', ['b']),
    { id: 'day:2026-10-12', scope: 'day' as const, period: '2026-10-12', itemIds: ['t'], updatedAt: '' },
  ];

  it('uses the week list, or the latest earlier one, never a later one', () => {
    expect(legacyListInEffect(lists, '2026-W42')?.itemIds).toEqual(['b']);
    expect(legacyListInEffect(lists, '2026-W41')?.itemIds).toEqual(['a']);
    expect(legacyListInEffect(lists, '2026-W39')).toBeUndefined();
    expect(legacyListInEffect([weekList('2026-W52', ['x'])], '2027-W01')?.itemIds).toEqual(['x']);
  });
});

describe('migrateToFocusList (version 7)', () => {
  it("starts the list in focus as the current week's list, keeping the week lists", () => {
    const rows = [
      { ...weekList('2026-W40', ['a', 'b']), updatedAt: '2026-10-02T10:00:00.000Z' },
      weekList('2026-W43', ['z']), // already set by a reflection for a later week
      { id: 'day:2026-10-11', scope: 'day', period: '2026-10-11', itemIds: ['t'], updatedAt: '' },
    ];
    expect(migrateToFocusList(rows, '2026-10-12')).toEqual([
      ...rows,
      { id: 'focusProjects', scope: 'focusProjects', period: '', itemIds: ['a', 'b'], updatedAt: '2026-10-02T10:00:00.000Z' },
    ]);
  });

  it('adds nothing without week lists, and keeps a list in focus already there', () => {
    expect(migrateToFocusList([{ id: 'day:2026-10-11' }], '2026-10-12')).toEqual([{ id: 'day:2026-10-11' }]);
    const done = [weekList('2026-W40', ['a']), { id: 'focusProjects', scope: 'focusProjects', period: '', itemIds: ['b'], updatedAt: '' }];
    expect(migrateToFocusList(done, '2026-10-12')).toEqual(done);
  });
});

describe('migrateMonthPriorityLists (version 6)', () => {
  it("turns each month's list into the list of the week of its first day", () => {
    const rows = [
      { id: 'month:2026-10', scope: 'month', period: '2026-10', itemIds: ['a', 'b', 'a', 'c', 'd'], updatedAt: '2026-10-02T10:00:00.000Z' },
      { id: 'month:2026-09', scope: 'month', period: '2026-09', itemIds: ['x'], updatedAt: '2026-09-03T10:00:00.000Z' },
      { id: 'day:2026-10-11', scope: 'day', period: '2026-10-11', itemIds: ['t'], updatedAt: '' },
    ];
    expect(migrateMonthPriorityLists(rows)).toEqual([
      rows[2],
      // 2026-10-01 is a Thursday of ISO week 40; only the first 3 distinct projects stay.
      { id: 'weekProjects:2026-W40', scope: 'weekProjects', period: '2026-W40', itemIds: ['a', 'b', 'c'], updatedAt: '2026-10-02T10:00:00.000Z' },
      { id: 'weekProjects:2026-W36', scope: 'weekProjects', period: '2026-W36', itemIds: ['x'], updatedAt: '2026-09-03T10:00:00.000Z' },
    ]);
  });

  it('makes the current month the current week through the carry-over', () => {
    const migrated = migrateMonthPriorityLists<unknown>([{ id: 'month:2026-10', scope: 'month', period: '2026-10', itemIds: ['a'], updatedAt: '' }]) as PriorityList[];
    expect(legacyListInEffect(migrated, weekOf('2026-10-12').key)?.itemIds).toEqual(['a']);
  });

  it('leaves other rows untouched, malformed ones included', () => {
    const rows = [{ id: 'day:2026-10-11' }, { nothing: true }, 'junk'];
    expect(migrateMonthPriorityLists(rows)).toEqual(rows);
  });

  it('is idempotent', () => {
    const once = migrateMonthPriorityLists([{ id: 'month:2026-10', scope: 'month', period: '2026-10', itemIds: ['a'], updatedAt: '' }]);
    expect(migrateMonthPriorityLists(once)).toEqual(once);
  });
});
