import { toDayKey, type DayKey } from './day';
import type { Block, Project } from './entities';

/** What the active tasks list can be grouped or sorted by. */
export type TaskListKey = 'project' | 'createdDate' | 'postponeCount';
export type TaskGroupBy = TaskListKey | 'none';

export const TASK_LIST_KEYS: readonly TaskListKey[] = ['project', 'createdDate', 'postponeCount'];

/** What the table of tasks can be sorted by: a column. */
export type TaskSortKey = TaskListKey | 'text' | 'deadline';
export const TASK_SORT_KEYS: readonly TaskSortKey[] = ['text', 'deadline', 'project', 'createdDate', 'postponeCount'];

/** 'asc' is each key's natural order (see `sortTasks`); 'desc' reverses it. */
export type SortDirection = 'asc' | 'desc';

/** Which project's tasks the list shows: all, those in focus, those without a project, or one project. */
export type ProjectFilter = 'all' | 'focus' | 'none' | `project:${string}`;

export interface TaskListEntry {
  task: Block;
  project: Project | null;
}

export interface TaskGroup<T extends TaskListEntry> {
  /** Project id, day of creation or number of postponements; null for "sem projeto". Unused when not grouped. */
  key: string | null;
  items: T[];
}

/** Keeps only the tasks of the projects in focus. */
export function inFocusProjects<T extends TaskListEntry>(items: readonly T[], focusIds: readonly string[]): T[] {
  return items.filter((item) => item.task.projectId !== null && focusIds.includes(item.task.projectId));
}

/** Keeps the tasks the project filter lets through. */
export function filterByProject<T extends TaskListEntry>(items: readonly T[], filter: ProjectFilter, focusIds: readonly string[]): T[] {
  if (filter === 'all') return [...items];
  if (filter === 'focus') return inFocusProjects(items, focusIds);
  if (filter === 'none') return items.filter((item) => item.task.projectId === null);
  const id = filter.slice('project:'.length);
  return items.filter((item) => item.task.projectId === id);
}

/** The local day a task was created on. */
export function creationDay(task: Block): DayKey {
  return toDayKey(new Date(task.createdAt));
}

/** The value a task is grouped by; null when it has none. */
function groupKey(entry: TaskListEntry, by: TaskListKey): string | null {
  if (by === 'project') return entry.project?.id ?? null;
  if (by === 'postponeCount') return String(entry.task.postponeCount);
  return creationDay(entry.task);
}

function compareText(a: string, b: string): number {
  return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
}

function compareCreation(a: TaskListEntry, b: TaskListEntry): number {
  return a.task.createdAt < b.task.createdAt ? -1 : a.task.createdAt > b.task.createdAt ? 1 : 0;
}

/** Missing values (no project, no date) go last, whatever the direction. */
function compareMissingLast<V>(a: V | null, b: V | null, compare: (a: V, b: V) => number, sign = 1): number {
  if (a === null || b === null) return a === b ? 0 : a === null ? 1 : -1;
  return sign * compare(a, b);
}

function compareBy(by: TaskSortKey, a: TaskListEntry, b: TaskListEntry, sign = 1): number {
  if (by === 'project') {
    return compareMissingLast(a.project?.name ?? null, b.project?.name ?? null, compareText, sign);
  }
  if (by === 'deadline') {
    return compareMissingLast(a.task.deadline ?? null, b.task.deadline ?? null, compareText, sign);
  }
  if (by === 'text') return sign * compareText(a.task.text, b.task.text);
  if (by === 'postponeCount') return sign * (b.task.postponeCount - a.task.postponeCount);
  return sign * compareCreation(a, b);
}

/**
 * Sorts by the chosen key, then by creation, so the order is total.
 * Ascending is each key's natural order: text A to Z, dates from the nearest (creation from the
 * oldest), projects by name, the most postponed first. Tasks without the value always go last.
 * Tasks have no intended date any more (ADR-072).
 */
export function sortTasks<T extends TaskListEntry>(items: readonly T[], by: TaskSortKey, direction: SortDirection = 'asc'): T[] {
  const sign = direction === 'asc' ? 1 : -1;
  return [...items].sort(
    (a, b) =>
      compareBy(by, a, b, sign) ||
      compareCreation(a, b) ||
      compareText(a.task.id, b.task.id),
  );
}

/**
 * Groups the active tasks and sorts each group. Groups follow the order of their key: projects
 * by name, days from the earliest, the most postponed first; the group without a project comes
 * last.
 * Not grouped, the list is a single group with a null key.
 */
export function groupTasks<T extends TaskListEntry>(
  items: readonly T[],
  groupBy: TaskGroupBy,
  sortBy: TaskSortKey,
  direction: SortDirection = 'asc',
): TaskGroup<T>[] {
  const sorted = sortTasks(items, sortBy, direction);
  if (groupBy === 'none') return sorted.length ? [{ key: null, items: sorted }] : [];
  const groups = new Map<string | null, T[]>();
  for (const item of sorted) {
    const key = groupKey(item, groupBy);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  const first = (group: T[]) => group[0]!;
  return [...groups.entries()]
    .sort(([keyA, a], [keyB, b]) =>
      groupBy === 'project'
        ? compareMissingLast(first(a).project?.name ?? null, first(b).project?.name ?? null, compareText) ||
          compareMissingLast(keyA, keyB, compareText)
        : groupBy === 'postponeCount'
          ? Number(keyB) - Number(keyA)
          : compareMissingLast(keyA, keyB, compareText),
    )
    .map(([key, items]) => ({ key, items }));
}
