import { describe, expect, it } from 'vitest';
import type { PriorityList, Project } from './entities';
import {
  listInEffect,
  migrateMonthPriorityLists,
  nextWeek,
  normalizePriorityProjects,
  priorityProjectIds,
  priorityProjectsListId,
  recordedPriorityProjects,
  withAddedProject,
} from './priorityProjects';
import { weekOf } from './week';

function list(week: string, itemIds: string[]): PriorityList {
  return { id: priorityProjectsListId(week), scope: 'weekProjects', period: week, itemIds, updatedAt: '' };
}

function project(id: string, status: Project['status'] = 'active'): Project {
  return { id, name: id, status, createdAt: '', updatedAt: '', finishedAt: null };
}

describe('listInEffect: the list carries over to the following weeks', () => {
  const lists = [list('2026-W40', ['a']), list('2026-W42', ['b']), { id: 'day:2026-10-12', scope: 'day' as const, period: '2026-10-12', itemIds: ['t'], updatedAt: '' }];

  it("uses the week's own list", () => {
    expect(listInEffect(lists, '2026-W42')?.itemIds).toEqual(['b']);
  });

  it('falls back to the latest earlier week, never a later one', () => {
    expect(listInEffect(lists, '2026-W41')?.itemIds).toEqual(['a']);
    expect(listInEffect(lists, '2026-W50')?.itemIds).toEqual(['b']);
    expect(listInEffect(lists, '2026-W39')).toBeUndefined();
  });

  it('crosses years', () => {
    expect(listInEffect([list('2026-W52', ['x'])], '2027-W01')?.itemIds).toEqual(['x']);
  });
});

describe('priority projects of a week', () => {
  it('shows only active projects, in the order chosen, at most 3', () => {
    const projects = [project('a'), project('b', 'finished'), project('c'), project('d'), project('e')];
    expect(priorityProjectIds(list('2026-W42', ['c', 'b', 'a', 'd', 'e']), projects)).toEqual(['c', 'a']);
    expect(priorityProjectIds(undefined, projects)).toEqual([]);
  });

  it('keeps what was recorded, whatever happened to the projects later', () => {
    expect(recordedPriorityProjects(list('2026-W42', ['a', 'a', 'b', 'c', 'd']))).toEqual(['a', 'b', 'c']);
  });

  it('adds a project outside the reflection only while there is a free slot', () => {
    expect(withAddedProject(['a', 'b'], 'c')).toEqual(['a', 'b', 'c']);
    expect(withAddedProject(['a', 'b', 'c'], 'd')).toBeNull();
    expect(withAddedProject(['a'], 'a')).toBeNull();
  });

  it('accepts any list in the reflection, without repeats and at most 3', () => {
    expect(normalizePriorityProjects(['b', 'a', 'b', 'c', 'd'])).toEqual(['b', 'a', 'c']);
  });

  it('defines the list of the week after the one the reflection evaluates', () => {
    expect(nextWeek(weekOf('2026-10-08')).key).toBe('2026-W42');
    expect(nextWeek(weekOf('2026-12-31')).key).toBe('2027-W01');
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
    expect(listInEffect(migrated, weekOf('2026-10-12').key)?.itemIds).toEqual(['a']);
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
