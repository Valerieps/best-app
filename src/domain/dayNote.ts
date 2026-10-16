import type { DayKey } from './day';
import type { Block, Section } from './entities';
import { sortCarried } from './order';
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
  /**
   * When today was closed, if it was: the note starts over from that moment (spec/checkout.md,
   * "Depois do fechamento"). Past days keep everything, since their notes are found by paging.
   */
  closedAt?: string | null;
}

/**
 * After closing a day early, its note looks like a fresh start: what existed at the closing is
 * gone (notes, finished tasks, tasks without a date or with another date), except the tasks
 * that stayed with the day's date. Lines written after the closing show as usual.
 */
export function isShownAfterClosing(block: Block, day: DayKey, closedAt: string): boolean {
  if (block.createdAt > closedAt) return true;
  if (block.kind !== 'task' || block.intendedDate !== day) return false;
  return block.status === 'active' || (block.status === 'done' && block.closedAt !== null && block.closedAt > closedAt);
}

function byCreatedAt(a: { createdAt: string }, b: { createdAt: string }): number {
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}

export function buildDayNote(input: DayNoteInput): DayNoteSection[] {
  const { closedAt } = input;
  const shown = (block: Block) => isVisibleTask(block) && (!closedAt || isShownAfterClosing(block, input.day, closedAt));
  const sections = [...input.sections].sort(byCreatedAt);
  const ownSectionIds = new Set(sections.map((section) => section.id));
  const carried = sortCarried(
    input.intended.filter((task) => !ownSectionIds.has(task.sectionId) && shown(task)),
    input.day,
  );

  const note: DayNoteSection[] = sections
    .map((section) => ({
      section,
      carried: [] as Block[],
      blocks: input.blocks.filter((block) => block.sectionId === section.id && shown(block)).sort(comparePositions),
    }))
    // A section emptied by the closing goes away with it; one opened afterwards stays, even empty.
    .filter((entry) => !closedAt || entry.blocks.length > 0 || entry.section.createdAt > closedAt);

  // The day always opens with a general section; it becomes real when something is written.
  let host = note.find((entry) => entry.section?.kind === 'general');
  if (!host) {
    host = { section: null, carried: [], blocks: [] };
    note.unshift(host);
  }
  host.carried = carried;
  return note;
}
