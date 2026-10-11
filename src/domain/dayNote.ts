import type { DayKey } from './day';
import type { Block, Section } from './entities';
import { comparePositions } from './position';
import { isVisibleTask } from './tasks';

/**
 * The day note is not stored: it is the day's sections plus the tasks intended for the day,
 * which show up at the top of the first general section without being copied.
 */

export interface DayNoteSection {
  /** Null for the general section the day opens with, until something is written in it. */
  section: Section | null;
  /** Tasks from other days intended for this day. Only in the first general section. */
  carried: Block[];
  blocks: Block[];
}

export interface DayNoteInput {
  day: DayKey;
  sections: Section[];
  /** Blocks written in the day's sections. */
  blocks: Block[];
  /** Tasks whose intended date is the day, wherever they were written. */
  intended: Block[];
}

function byCreatedAt(a: { createdAt: string }, b: { createdAt: string }): number {
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}

export function buildDayNote(input: DayNoteInput): DayNoteSection[] {
  const sections = [...input.sections].sort(byCreatedAt);
  const ownSectionIds = new Set(sections.map((section) => section.id));
  const carried = input.intended
    .filter((task) => !ownSectionIds.has(task.sectionId) && isVisibleTask(task))
    .sort(byCreatedAt);

  const note: DayNoteSection[] = sections.map((section) => ({
    section,
    carried: [],
    blocks: input.blocks
      .filter((block) => block.sectionId === section.id && isVisibleTask(block))
      .sort(comparePositions),
  }));

  // The day always opens with a general section; it becomes real when something is written.
  let host = note.find((entry) => entry.section?.kind === 'general');
  if (!host) {
    host = { section: null, carried: [], blocks: [] };
    note.unshift(host);
  }
  host.carried = carried;
  return note;
}
