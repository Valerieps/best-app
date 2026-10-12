import { addDays } from './day';
import type { PriorityList, Project } from './entities';
import { weekKey, weekOf, type WeekKey, type WeekRange } from './week';

/**
 * Section 2: "Projetos prioritários da semana". Up to 3 projects per week, defined in the weekly
 * reflection. Outside it a project can only take a free slot; swapping or removing happens in
 * the reflection. The list carries over to the following weeks until a reflection changes it.
 */

export const PRIORITY_PROJECT_LIMIT = 3;

const PREFIX = 'weekProjects:';

/** Id of a week's list in the `priorities` table, like `weekProjects:2026-W42`. */
export function priorityProjectsListId(week: WeekKey): string {
  return `${PREFIX}${week}`;
}

/** Bounds for a range read of every week list up to `week`, both ends included. */
export function priorityProjectsRange(week: WeekKey): [from: string, to: string] {
  return [PREFIX, priorityProjectsListId(week)];
}

/** Bounds for a range read of every week list from `week` on, both ends included. */
export function priorityProjectsFrom(week: WeekKey): [from: string, to: string] {
  return [priorityProjectsListId(week), `${PREFIX}￿`];
}

function isWeekList(list: PriorityList): boolean {
  return list.id.startsWith(PREFIX);
}

/**
 * "Ao fechar a semana, os projetos prioritários continuam na semana seguinte": a week without a
 * list of its own uses the latest earlier one. ISO week keys sort as plain strings.
 */
export function listInEffect(lists: readonly PriorityList[], week: WeekKey): PriorityList | undefined {
  const own = priorityProjectsListId(week);
  return lists
    .filter((list) => isWeekList(list) && list.id <= own)
    .reduce<PriorityList | undefined>((latest, list) => (latest === undefined || list.id > latest.id ? list : latest), undefined);
}

/** Ids in a list as recorded, without repeats and at most 3: what was chosen, whatever happened later. */
export function recordedPriorityProjects(list: PriorityList | undefined): string[] {
  return [...new Set(list?.itemIds ?? [])].slice(0, PRIORITY_PROJECT_LIMIT);
}

/** The week's priority projects as shown: only active ones, in the order chosen. */
export function priorityProjectIds(list: PriorityList | undefined, projects: readonly Project[]): string[] {
  const active = new Set(projects.filter((project) => project.status === 'active').map((project) => project.id));
  return recordedPriorityProjects(list).filter((id) => active.has(id));
}

export function hasFreeSlot(ids: readonly string[]): boolean {
  return ids.length < PRIORITY_PROJECT_LIMIT;
}

/**
 * Outside the reflection a project only takes a free slot. Returns the new list, or null when
 * nothing changes (the list is full or already has the project).
 */
export function withAddedProject(ids: readonly string[], projectId: string): string[] | null {
  if (ids.includes(projectId) || !hasFreeSlot(ids)) return null;
  return [...ids, projectId];
}

/** The list chosen in the reflection, which can swap and remove: no repeats, at most 3. */
export function normalizePriorityProjects(ids: readonly string[]): string[] {
  return [...new Set(ids)].slice(0, PRIORITY_PROJECT_LIMIT);
}

/** The week whose list a reflection defines: the one after the week it evaluates (step 6). */
export function nextWeek(week: WeekRange): WeekRange {
  return weekOf(addDays(week.end, 1));
}

/** A stored row as read from an old database or backup, before version 6. */
interface StoredList {
  id?: unknown;
  scope?: unknown;
  period?: unknown;
  itemIds?: unknown;
  updatedAt?: unknown;
}

/**
 * Version 6 (ADR-035): month lists of projects (`month:AAAA-MM`) become week lists. A month's
 * list becomes the list of the week of the month's first day, so through the carry-over the
 * current month's list is the current week's list until a reflection changes it. Only the
 * first 3 projects of a month are kept. Other rows pass through untouched; anything malformed
 * is left for the backup validation to reject.
 */
export function migrateMonthPriorityLists<T>(rows: readonly T[]): T[] {
  const others = rows.filter((row) => !isMonthList(row));
  const taken = new Set(others.map((row) => (row as StoredList).id));
  const migrated: unknown[] = [];
  for (const row of rows) {
    if (!isMonthList(row)) continue;
    const month = row.id.slice('month:'.length);
    const week = weekKey(`${month}-01`);
    const id = priorityProjectsListId(week);
    if (taken.has(id)) continue;
    taken.add(id);
    const itemIds = Array.isArray(row.itemIds) ? row.itemIds.filter((item): item is string => typeof item === 'string') : [];
    migrated.push({
      id,
      scope: 'weekProjects',
      period: week,
      itemIds: [...new Set(itemIds)].slice(0, PRIORITY_PROJECT_LIMIT),
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
