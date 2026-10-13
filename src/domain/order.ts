import type { DayKey } from './day';
import type { Block } from './entities';
import { positionBetween } from './position';

/**
 * Reordering lines (request 2): the lines of a section by their `position`, and the tasks
 * carried from other days by their own order on the day they show up in.
 */

/** A line and its current sort key; null when it has none yet. */
export interface Ordered {
  id: string;
  position: string | null;
}

export interface PositionChange {
  id: string;
  position: string;
}

/** The ids with `id` moved to `toIndex`, an insertion point counted before the move (0 to length). */
export function moveItem(ids: readonly string[], id: string, toIndex: number): string[] {
  const from = ids.indexOf(id);
  if (from === -1) return [...ids];
  const rest = ids.filter((other) => other !== id);
  const target = Math.max(0, Math.min(rest.length, toIndex > from ? toIndex - 1 : toIndex));
  rest.splice(target, 0, id);
  return rest;
}

/** The ids with `id` swapped with its neighbor above or below; unchanged at the edges. */
export function moveByOne(ids: readonly string[], id: string, direction: 'up' | 'down'): string[] {
  const from = ids.indexOf(id);
  if (from === -1) return [...ids];
  return moveItem(ids, id, direction === 'up' ? from - 1 : from + 2);
}

function strictlyIncreasing(items: readonly Ordered[]): boolean {
  return items.every(
    (item, index) => item.position !== null && (index === 0 || items[index - 1].position! < item.position),
  );
}

/**
 * Sort keys that put `items` in the order given, after `movedId` was moved there. Usually only
 * the moved line changes, so one record is written. When the other lines have no key or
 * repeated keys, every line gets a new key.
 */
export function placeInOrder(items: readonly Ordered[], movedId: string): PositionChange[] {
  if (strictlyIncreasing(items)) return [];
  const index = items.findIndex((item) => item.id === movedId);
  if (index !== -1 && strictlyIncreasing(items.filter((item) => item.id !== movedId))) {
    const before = items[index - 1]?.position ?? null;
    const after = items[index + 1]?.position ?? null;
    return [{ id: movedId, position: positionBetween(before, after) }];
  }
  const changes: PositionChange[] = [];
  let previous: string | null = null;
  for (const item of items) {
    const position = positionBetween(previous, null);
    if (position !== item.position) changes.push({ id: item.id, position });
    previous = position;
  }
  return changes;
}

/** The order of a carried task on `day`; an order set for another day no longer counts. */
export function carriedPosition(task: Block, day: DayKey): string | null {
  return task.carriedOrder?.day === day ? task.carriedOrder.position : null;
}

function byCreatedAt(a: { createdAt: string }, b: { createdAt: string }): number {
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}

/**
 * Tasks carried into `day`, in the order chosen for that day. Tasks that arrived after the
 * last reordering have no order yet and come last, by creation.
 */
export function sortCarried(tasks: readonly Block[], day: DayKey): Block[] {
  const ordered = tasks.filter((task) => carriedPosition(task, day) !== null);
  const rest = tasks.filter((task) => carriedPosition(task, day) === null);
  ordered.sort((a, b) => {
    const pa = carriedPosition(a, day)!;
    const pb = carriedPosition(b, day)!;
    return pa < pb ? -1 : pa > pb ? 1 : byCreatedAt(a, b);
  });
  return [...ordered, ...rest.sort(byCreatedAt)];
}

/*
 * Reordering the parts of a day note: its sections, the day priorities and the tasks carried
 * from other days. Each day keeps its own order (`DayRecord.sectionOrder`), as a list of keys:
 * a section id, or one of the keys below for the parts that are not sections.
 */

/** The "Prioridades do dia" block, while it is not pinned. */
export const PRIORITIES_PART = 'priorities';
/** The tasks carried from other days, shown as a section of their own. */
export const CARRIED_PART = 'carried';
/** The day's first general section while it exists only on screen (ADR-013). */
export const FIRST_PART = 'first';

const FRONT_PARTS: ReadonlySet<string> = new Set([PRIORITIES_PART, CARRIED_PART, FIRST_PART]);

/**
 * The parts shown on a day, in the order chosen for it. `defaults` is the order of a day never
 * reordered: priorities, carried tasks, then the sections by creation. A part missing from the
 * saved order is new since the last reordering: a section goes last, the other parts first.
 */
export function orderDayParts(defaults: readonly string[], saved: readonly string[] | null | undefined): string[] {
  if (!saved || saved.length === 0) return [...defaults];
  const shown = new Set(defaults);
  const kept = saved.filter((key, index) => shown.has(key) && saved.indexOf(key) === index);
  const known = new Set(kept);
  const missing = defaults.filter((key) => !known.has(key));
  return [...missing.filter((key) => FRONT_PARTS.has(key)), ...kept, ...missing.filter((key) => !FRONT_PARTS.has(key))];
}

/** The saved order once the day's first section is saved under `sectionId`. */
export function adoptFirstPart(saved: readonly string[], sectionId: string): string[] {
  return saved.map((key) => (key === FIRST_PART ? sectionId : key));
}
