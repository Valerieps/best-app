import { describe, expect, it } from 'vitest';
import type { Block, Project } from './entities';
import { creationDay, groupTasks, inFocusProjects, sortTasks, type TaskListEntry } from './taskList';

function project(id: string, name: string): Project {
  return { id, name, status: 'active', createdAt: '', updatedAt: '', finishedAt: null };
}

const casa = project('p1', 'Casa');
const app = project('p2', 'app');

/** createdAt without a zone is read in local time, so the creation day does not depend on it. */
function entry(id: string, createdAt: string, intendedDate: string | null, proj: Project | null = null, postponeCount = 0): TaskListEntry {
  const task = { id, kind: 'task', text: id, createdAt, intendedDate, projectId: proj?.id ?? null, status: 'active', postponeCount } as Block;
  return { task, project: proj };
}

const a = entry('a', '2026-10-01T09:00:00', '2026-10-20', casa, 2);
const b = entry('b', '2026-10-01T15:00:00', null, app, 2);
const c = entry('c', '2026-10-03T08:00:00', '2026-10-16');
const d = entry('d', '2026-09-28T10:00:00', '2026-10-16', casa, 5);
const all = [a, b, c, d];
const ids = (items: TaskListEntry[]) => items.map((item) => item.task.id);

describe('sorting the active tasks', () => {
  it('by intended date puts tasks without a date last, ties by creation', () => {
    expect(ids(sortTasks(all, 'intendedDate'))).toEqual(['d', 'c', 'a', 'b']);
  });

  it('by creation goes from the oldest', () => {
    expect(ids(sortTasks(all, 'createdDate'))).toEqual(['d', 'a', 'b', 'c']);
  });

  it('by project sorts by name ignoring case, tasks without a project last', () => {
    expect(ids(sortTasks(all, 'project'))).toEqual(['b', 'd', 'a', 'c']);
  });

  it('by postponements puts the most postponed first, ties by intended date', () => {
    expect(ids(sortTasks(all, 'postponeCount'))).toEqual(['d', 'a', 'b', 'c']);
  });

  it('does not change the list it was given', () => {
    sortTasks(all, 'createdDate');
    expect(ids(all)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('grouping the active tasks', () => {
  it('without grouping keeps a single group', () => {
    const groups = groupTasks(all, 'none', 'intendedDate');
    expect(groups).toHaveLength(1);
    expect(groups[0]!.key).toBeNull();
    expect(ids(groups[0]!.items)).toEqual(['d', 'c', 'a', 'b']);
  });

  it('an empty list has no groups', () => {
    expect(groupTasks([], 'none', 'intendedDate')).toEqual([]);
    expect(groupTasks([], 'project', 'intendedDate')).toEqual([]);
  });

  it('by project orders the groups by name, "sem projeto" last', () => {
    const groups = groupTasks(all, 'project', 'createdDate');
    expect(groups.map((group) => group.key)).toEqual(['p2', 'p1', null]);
    expect(ids(groups[1]!.items)).toEqual(['d', 'a']);
  });

  it('by intended date orders the days from the earliest, "sem data" last', () => {
    const groups = groupTasks(all, 'intendedDate', 'project');
    expect(groups.map((group) => group.key)).toEqual(['2026-10-16', '2026-10-20', null]);
    // Sorted by project inside the day: Casa before the task without a project.
    expect(ids(groups[0]!.items)).toEqual(['d', 'c']);
  });

  it('by creation date gathers the tasks created on the same day', () => {
    const groups = groupTasks(all, 'createdDate', 'project');
    expect(groups.map((group) => group.key)).toEqual(['2026-09-28', '2026-10-01', '2026-10-03']);
    expect(ids(groups[1]!.items)).toEqual(['b', 'a']);
  });

  it('by postponements orders the groups from the most postponed', () => {
    const groups = groupTasks(all, 'postponeCount', 'createdDate');
    expect(groups.map((group) => group.key)).toEqual(['5', '2', '0']);
    expect(ids(groups[1]!.items)).toEqual(['a', 'b']);
  });

  it('can group and sort by the same key', () => {
    const groups = groupTasks(all, 'intendedDate', 'intendedDate');
    expect(ids(groups[0]!.items)).toEqual(['d', 'c']);
  });
});

describe('projects in focus', () => {
  it('keeps only tasks of the projects in focus', () => {
    expect(ids(inFocusProjects(all, ['p1']))).toEqual(['a', 'd']);
    expect(inFocusProjects(all, [])).toEqual([]);
  });
});

describe('creation day', () => {
  it('is the local day of the creation moment', () => {
    expect(creationDay(c.task)).toBe('2026-10-03');
  });
});
