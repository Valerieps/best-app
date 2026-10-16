import { addDays, laterDay, type DayKey } from './day';
import { nextActiveDay } from './dayFlow';
import type { Block, Section } from './entities';

/** Tasks postponed this many times get highlighted at checkout. */
export const POSTPONE_ATTENTION_THRESHOLD = 3;

/**
 * A postponement is any move of the intended date to later, including removing it.
 * Setting the first intended date (from null) is not a postponement.
 */
export function isPostponement(from: DayKey | null, to: DayKey | null): boolean {
  if (from === null) return false;
  return to === null || to > from;
}

/**
 * "Dia seguinte" when checking out `day`: the next active day after it (section 3), but never
 * before today.
 */
export function nextPlanningDay(day: DayKey, today: DayKey, activeDays?: readonly number[]): DayKey {
  return laterDay(nextActiveDay(day, activeDays), today);
}

/** A task shows up in the day it was written and in the day it is intended for. */
export function isTaskShownOn(task: Block, originDay: DayKey | null, day: DayKey): boolean {
  return originDay === day || task.intendedDate === day;
}

/** Whether `day`'s checkout still has to decide this task. */
export function isTaskPendingOn(task: Block, originDay: DayKey | null, day: DayKey): boolean {
  return (
    task.kind === 'task' &&
    task.status === 'active' &&
    isTaskShownOn(task, originDay, day) &&
    (task.lastTriagedDay === null || task.lastTriagedDay < day) &&
    (task.intendedDate === null || task.intendedDate <= day)
  );
}

/**
 * Blocks written today and not triaged yet can be deleted or change kind, like plain text.
 * Anything with history (carried tasks, triaged notes) can only leave through triage.
 */
export function canEditFreely(block: Block, section: Section | undefined, today: DayKey): boolean {
  if (!section || section.day !== today) return false;
  if (block.kind === 'note') return section.notesDestination === 'pending';
  return block.status === 'active' && block.intendedDate === null && block.lastTriagedDay === null;
}

/**
 * When a finished task is reopened it must become pending again today, without reopening
 * older days that already decided it.
 */
export function lastTriagedDayAfterReopen(lastTriagedDay: DayKey | null, today: DayKey): DayKey | null {
  if (lastTriagedDay === null || lastTriagedDay < today) return lastTriagedDay;
  return addDays(today, -1);
}

export function isVisibleTask(block: Block): boolean {
  return block.kind !== 'task' || block.status === 'active' || block.status === 'done';
}

/**
 * Archiving was removed (ADR-049): an archived task becomes an active task without a date, the
 * "algum dia" of the task list. Not a postponement, and no event: the history keeps the archive.
 * Rows of other kinds or statuses come back unchanged.
 */
export function undateArchivedTask<T extends { kind?: unknown; status?: unknown }>(row: T): T {
  if (row.kind !== 'task' || row.status !== 'archived') return row;
  return { ...row, status: 'active', intendedDate: null, closedAt: null };
}
