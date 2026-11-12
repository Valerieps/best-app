import type { DayKey } from './day';
import type { PriorityList, Project } from './entities';
import { weekKey, type WeekKey } from './week';

/**
 * Section 2: "Projetos em foco" (spec/prioridades.md). Any number of projects, which I add and
 * remove at any time. There is a single list, stored with id `focusProjects`.
 */

export const FOCUS_LIST_ID = 'focusProjects';

/** Ids in a list as recorded, without repeats: what was chosen, whatever happened later. */
export function recordedFocusProjects(list: Pick<PriorityList, 'itemIds'> | undefined): string[] {
  return [...new Set(list?.itemIds ?? [])];
}

/** The projects in focus as shown: only active ones, in the order chosen. */
export function focusProjectIds(list: Pick<PriorityList, 'itemIds'> | undefined, projects: readonly Project[]): string[] {
  const active = new Set(projects.filter((project) => project.status === 'active').map((project) => project.id));
  return recordedFocusProjects(list).filter((id) => active.has(id));
}

/** Adding puts the project at the end. Returns the new list, or null when it already has the project. */
export function withAddedProject(ids: readonly string[], projectId: string): string[] | null {
  if (ids.includes(projectId)) return null;
  return [...ids, projectId];
}

/** Returns the new list, or null when the project is not in it. */
export function withRemovedProject(ids: readonly string[], projectId: string): string[] | null {
  return ids.includes(projectId) ? ids.filter((id) => id !== projectId) : null;
}

// Before the single list (versions 6 and earlier), the priority projects belonged to a week.

const LEGACY_WEEK_PREFIX = 'weekProjects:';

/** Id of a week's list from before the single list, like `weekProjects:2026-W42`. */
export function legacyWeekListId(week: WeekKey): string {
  return `${LEGACY_WEEK_PREFIX}${week}`;
}

/**
 * A week without a list of its own used the latest earlier one (ADR-035). ISO week keys sort as
 * plain strings.
 */
export function legacyListInEffect(lists: readonly PriorityList[], week: WeekKey): PriorityList | undefined {
  const own = legacyWeekListId(week);
  return lists
    .filter((list) => list.id.startsWith(LEGACY_WEEK_PREFIX) && list.id <= own)
    .reduce<PriorityList | undefined>((latest, list) => (latest === undefined || list.id > latest.id ? list : latest), undefined);
}

/** A stored row as read from an old database or backup. */
interface StoredList {
  id?: unknown;
  scope?: unknown;
  period?: unknown;
  itemIds?: unknown;
  updatedAt?: unknown;
}

function stringIds(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

/**
 * Version 6 (ADR-035): month lists of projects (`month:AAAA-MM`) become week lists. A month's
 * list becomes the list of the week of the month's first day. The first 3 projects of a month are kept (the limit of the time). Other rows pass through untouched; anything malformed is left for the backup
 * validation to reject.
 */
export function migrateMonthPriorityLists<T>(rows: readonly T[]): T[] {
  const others = rows.filter((row) => !isMonthList(row));
  const taken = new Set(others.map((row) => (row as StoredList).id));
  const migrated: unknown[] = [];
  for (const row of rows) {
    if (!isMonthList(row)) continue;
    const month = row.id.slice('month:'.length);
    const week = weekKey(`${month}-01`);
    const id = legacyWeekListId(week);
    if (taken.has(id)) continue;
    taken.add(id);
    migrated.push({
      id,
      scope: 'weekProjects',
      period: week,
      itemIds: [...new Set(stringIds(row.itemIds))].slice(0, 3),
      updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : '',
    });
  }
  return [...others, ...(migrated as T[])];
}

function isMonthList(row: unknown): row is StoredList & { id: string } {
  if (typeof row !== 'object' || row === null) return false;
  const id = (row as StoredList).id;
  return typeof id === 'string' && /^month:\d{4}-\d{2}$/.test(id);
}

/**
 * Version 7: the week lists give way to the single list in focus, which starts as the list in
 * effect on `today`'s week (a list a reflection already set for the next week is dropped). The
 * week lists stay, untouched, as history. A list in focus already present is
 * kept as it is.
 */
export function migrateToFocusList<T>(rows: readonly T[], today: DayKey): T[] {
  if (rows.some((row) => (row as StoredList).id === FOCUS_LIST_ID)) return [...rows];
  const weekLists = rows.filter(
    (row): row is T & StoredList & { id: string } => typeof (row as StoredList).id === 'string' && ((row as StoredList).id as string).startsWith(LEGACY_WEEK_PREFIX),
  );
  const inEffect = legacyListInEffect(
    weekLists.map((row) => ({ id: row.id, scope: 'weekProjects', period: '', itemIds: stringIds(row.itemIds), updatedAt: '' })),
    weekKey(today),
  );
  if (!inEffect) return [...rows];
  const source = weekLists.find((row) => row.id === inEffect.id);
  const focus = {
    id: FOCUS_LIST_ID,
    scope: 'focusProjects',
    period: '',
    itemIds: recordedFocusProjects(inEffect),
    updatedAt: typeof source?.updatedAt === 'string' ? source.updatedAt : '',
  };
  return [...rows, focus as T];
}
