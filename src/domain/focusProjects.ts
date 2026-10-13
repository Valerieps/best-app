import type { DayKey } from './day';
import type { PriorityList, Project } from './entities';
import type { DomainEvent } from './events';
import { weekKey, type WeekKey } from './week';

/**
 * Section 2: "Projetos em foco" (spec/prioridades.md). Up to 3 projects, chosen in the Revisão de
 * Foco and valid until the next one. Outside it a project can only take a free slot; swapping or
 * removing happens in the review. There is a single list, stored with id `focusProjects`.
 */

export const FOCUS_PROJECT_LIMIT = 3;

export const FOCUS_LIST_ID = 'focusProjects';

/** Ids in a list as recorded, without repeats and at most 3: what was chosen, whatever happened later. */
export function recordedFocusProjects(list: Pick<PriorityList, 'itemIds'> | undefined): string[] {
  return [...new Set(list?.itemIds ?? [])].slice(0, FOCUS_PROJECT_LIMIT);
}

/** The projects in focus as shown: only active ones, in the order chosen. */
export function focusProjectIds(list: Pick<PriorityList, 'itemIds'> | undefined, projects: readonly Project[]): string[] {
  const active = new Set(projects.filter((project) => project.status === 'active').map((project) => project.id));
  return recordedFocusProjects(list).filter((id) => active.has(id));
}

export function hasFreeSlot(ids: readonly string[]): boolean {
  return ids.length < FOCUS_PROJECT_LIMIT;
}

/**
 * Outside the review a project only takes a free slot. Returns the new list, or null when
 * nothing changes (the list is full or already has the project).
 */
export function withAddedProject(ids: readonly string[], projectId: string): string[] | null {
  if (ids.includes(projectId) || !hasFreeSlot(ids)) return null;
  return [...ids, projectId];
}

/** Events that changed the list in focus, oldest first. */
function focusListEvents(events: readonly DomainEvent[]): DomainEvent[] {
  return events
    .filter((event) => event.entityId === FOCUS_LIST_ID && (event.type === 'priority.added' || event.type === 'priority.removed'))
    .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
}

function itemIdsOf(event: DomainEvent): string[] {
  const ids = event.data.itemIds;
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
}

/**
 * The projects in focus at the end of a day, as recorded then, for the raio-x. Every change of
 * the list is an event that carries the whole list, so the history comes from the events. Days
 * before the first change use the week lists from before the reviews (`legacyLists`).
 */
export function focusProjectsOnDay(day: DayKey, events: readonly DomainEvent[], legacyLists: readonly PriorityList[]): string[] {
  const changes = focusListEvents(events).filter((event) => event.day <= day);
  if (changes.length > 0) return recordedFocusProjects({ itemIds: itemIdsOf(changes[changes.length - 1]) });
  return recordedFocusProjects(legacyListInEffect(legacyLists, weekKey(day)));
}

/**
 * Whether the last project in focus was finished after `since`, leaving the list empty: a signal
 * for the Revisão de Foco. Removing a project in the review does not count.
 */
export function focusListEmptied(events: readonly DomainEvent[], since: string | null): boolean {
  const changes = focusListEvents(events);
  const last = changes[changes.length - 1];
  if (!last || (since !== null && last.at <= since)) return false;
  return last.type === 'priority.removed' && last.data.reason === 'finished' && itemIdsOf(last).length === 0;
}

// Before the reviews (versions 6 and earlier), the priority projects belonged to a week.

const LEGACY_WEEK_PREFIX = 'weekProjects:';

/** Id of a week's list from before the reviews, like `weekProjects:2026-W42`. */
export function legacyWeekListId(week: WeekKey): string {
  return `${LEGACY_WEEK_PREFIX}${week}`;
}

/** Bounds for a range read of every week list from before the reviews, both ends included. */
export const LEGACY_WEEK_LISTS_RANGE: [from: string, to: string] = [LEGACY_WEEK_PREFIX, `${LEGACY_WEEK_PREFIX}￿`];

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
 * list becomes the list of the week of the month's first day. Only the first 3 projects of a
 * month are kept. Other rows pass through untouched; anything malformed is left for the backup
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
      itemIds: [...new Set(stringIds(row.itemIds))].slice(0, FOCUS_PROJECT_LIMIT),
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
 * week lists stay, untouched, as the history of the raio-x. A list in focus already present is
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
