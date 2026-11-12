import { describe, expect, it } from 'vitest';
import type { Block, Project } from './entities';
import { creationDay, filterByProject, groupTasks, inFocusProjects, sortTasks, type TaskListEntry } from './taskList';

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
  it('by creation goes from the oldest', () => {
    expect(ids(sortTasks(all, 'createdDate'))).toEqual(['d', 'a', 'b', 'c']);
  });

  it('by project sorts by name ignoring case, tasks without a project last', () => {
    expect(ids(sortTasks(all, 'project'))).toEqual(['b', 'd', 'a', 'c']);
  });

  it('by postponements puts the most postponed first, ties by creation', () => {
    expect(ids(sortTasks(all, 'postponeCount'))).toEqual(['d', 'a', 'b', 'c']);
  });

  it('by text goes from A to Z ignoring case, and back when descending', () => {
    const lower = entry('B', '2026-10-02T09:00:00', null);
    expect(ids(sortTasks([...all, lower], 'text'))).toEqual(['a', 'b', 'B', 'c', 'd']);
    expect(ids(sortTasks(all, 'text', 'desc'))).toEqual(['d', 'c', 'b', 'a']);
  });

  it('by deadline puts the nearest first and tasks without one last, in both directions', () => {
    const withDeadline = (item: TaskListEntry, deadline: string): TaskListEntry => ({ ...item, task: { ...item.task, deadline } });
    const list = [withDeadline(a, '2026-11-02'), b, withDeadline(c, '2026-10-30'), d];
    expect(ids(sortTasks(list, 'deadline'))).toEqual(['c', 'a', 'd', 'b']);
    expect(ids(sortTasks(list, 'deadline', 'desc'))).toEqual(['a', 'c', 'd', 'b']);
  });

  it('descending reverses the key', () => {
    expect(ids(sortTasks(all, 'postponeCount', 'desc'))).toEqual(['c', 'a', 'b', 'd']);
    expect(ids(sortTasks(all, 'createdDate', 'desc'))).toEqual(['c', 'b', 'a', 'd']);
  });

  it('does not change the list it was given', () => {
    sortTasks(all, 'createdDate');
    expect(ids(all)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('grouping the active tasks', () => {
  it('without grouping keeps a single group', () => {
    const groups = groupTasks(all, 'none', 'createdDate');
    expect(groups).toHaveLength(1);
    expect(groups[0]!.key).toBeNull();
    expect(ids(groups[0]!.items)).toEqual(['d', 'a', 'b', 'c']);
  });

  it('an empty list has no groups', () => {
    expect(groupTasks([], 'none', 'createdDate')).toEqual([]);
    expect(groupTasks([], 'project', 'createdDate')).toEqual([]);
  });

  it('by project orders the groups by name, "sem projeto" last', () => {
    const groups = groupTasks(all, 'project', 'createdDate');
    expect(groups.map((group) => group.key)).toEqual(['p2', 'p1', null]);
    expect(ids(groups[1]!.items)).toEqual(['d', 'a']);
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
    const groups = groupTasks(all, 'createdDate', 'createdDate');
    expect(ids(groups[1]!.items)).toEqual(['a', 'b']);
  });
});

describe('projects in focus', () => {
  it('keeps only tasks of the projects in focus', () => {
    expect(ids(inFocusProjects(all, ['p1']))).toEqual(['a', 'd']);
    expect(inFocusProjects(all, [])).toEqual([]);
  });
});

describe('filtering by project', () => {
  it('keeps all, those in focus, those without a project, or one project', () => {
    expect(ids(filterByProject(all, 'all', []))).toEqual(['a', 'b', 'c', 'd']);
    expect(ids(filterByProject(all, 'focus', ['p2']))).toEqual(['b']);
    expect(ids(filterByProject(all, 'none', []))).toEqual(['c']);
    expect(ids(filterByProject(all, 'project:p1', []))).toEqual(['a', 'd']);
  });
});

describe('creation day', () => {
  it('is the local day of the creation moment', () => {
    expect(creationDay(c.task)).toBe('2026-10-03');
  });
});
