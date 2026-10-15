import { toDayKey, type DayKey } from './day';
import type { Block, Project } from './entities';

/** What the active tasks list can be grouped or sorted by. */
export type TaskListKey = 'project' | 'intendedDate' | 'createdDate' | 'postponeCount';
export type TaskGroupBy = TaskListKey | 'none';

export const TASK_LIST_KEYS: readonly TaskListKey[] = ['project', 'intendedDate', 'createdDate', 'postponeCount'];

export interface TaskListEntry {
  task: Block;
  project: Project | null;
}

export interface TaskGroup<T extends TaskListEntry> {
  /** Project id, day or number of postponements; null for "sem projeto" / "sem data". Unused when not grouped. */
  key: string | null;
  items: T[];
}

/** The local day a task was created on. */
export function creationDay(task: Block): DayKey {
  return toDayKey(new Date(task.createdAt));
}

/** The value a task is grouped by; null when it has none. */
function groupKey(entry: TaskListEntry, by: TaskListKey): string | null {
  if (by === 'project') return entry.project?.id ?? null;
  if (by === 'intendedDate') return entry.task.intendedDate;
  if (by === 'postponeCount') return String(entry.task.postponeCount);
  return creationDay(entry.task);
}

function compareText(a: string, b: string): number {
  return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
}

function compareCreation(a: TaskListEntry, b: TaskListEntry): number {
  return a.task.createdAt < b.task.createdAt ? -1 : a.task.createdAt > b.task.createdAt ? 1 : 0;
}

/** Missing values (no project, no date) go last. */
function compareMissingLast<V>(a: V | null, b: V | null, compare: (a: V, b: V) => number): number {
  if (a === null || b === null) return a === b ? 0 : a === null ? 1 : -1;
  return compare(a, b);
}

function compareBy(by: TaskListKey, a: TaskListEntry, b: TaskListEntry): number {
  if (by === 'project') {
    return compareMissingLast(a.project?.name ?? null, b.project?.name ?? null, compareText);
  }
  if (by === 'intendedDate') {
    return compareMissingLast(a.task.intendedDate, b.task.intendedDate, compareText);
  }
  if (by === 'postponeCount') return b.task.postponeCount - a.task.postponeCount;
  return compareCreation(a, b);
}

/** Sorts by the chosen key, then by intended date, then by creation, so the order is total. */
export function sortTasks<T extends TaskListEntry>(items: readonly T[], by: TaskListKey): T[] {
  return [...items].sort(
    (a, b) =>
      compareBy(by, a, b) ||
      compareBy('intendedDate', a, b) ||
      compareCreation(a, b) ||
      compareText(a.task.id, b.task.id),
  );
}

/**
 * Groups the active tasks and sorts each group. Groups follow the order of their key: projects
 * by name, days from the earliest, the most postponed first; the group without a project or a
 * date comes last.
 * Not grouped, the list is a single group with a null key.
 */
export function groupTasks<T extends TaskListEntry>(
  items: readonly T[],
  groupBy: TaskGroupBy,
  sortBy: TaskListKey,
): TaskGroup<T>[] {
  const sorted = sortTasks(items, sortBy);
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
