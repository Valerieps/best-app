import { toDayKey, type DayKey } from './day';
import type { Block, Project, Section } from './entities';
import { CARRIED_PART, orderDayParts, sortCarried } from './order';
import { comparePositions } from './position';
import { isTaskPendingOn, isTaskShownOn, nextPlanningDay, POSTPONE_ATTENTION_THRESHOLD } from './tasks';

/**
 * "Fechar o dia" (spec/checkout.md). For one day, decides what is automatic and what needs a
 * decision. Notes are kept where they were written and whiteboards stay unlinked; tasks keep the
 * dates given during the day, so only the open tasks without a future date (and the waiting ones)
 * ask for a decision. The app never moves a task or takes it out of circulation on its own.
 */

export type TaskDecision =
  | { kind: 'finish' }
  | { kind: 'schedule'; date: DayKey }
  /**
   * "Sem data": the task goes back to the task list, for some day. `untouched` is a task left
   * as it was when moving on from the triage, which is no postponement.
   */
  | { kind: 'undate'; untouched?: boolean }
  | { kind: 'abandon' }
  /** Section 2: "decidir na reflexão semanal". */
  | { kind: 'reflection' }
  /** Section 6: the task becomes a habit. */
  | { kind: 'habit' }
  /** A waiting task stays as it is, without a new follow-up date (spec/pessoas.md). */
  | { kind: 'keep' };

/** `weeklyReflection` (section 2) leaves the notes for the weekly reflection. */
export type NotesDecision = 'wiki' | 'discarded' | 'weeklyReflection';

export type WhiteboardDecision =
  | { kind: 'leaveUnlinked' }
  | { kind: 'link'; projectId: string }
  | { kind: 'convert'; name: string };

export interface TaskRow {
  type: 'task';
  task: Block;
  /** Section the task shows up under in the checkout; null for tasks carried from other days. */
  section: Section | null;
  suggestion: TaskDecision;
  /** Postponed too often, or with a deadline before "dia seguinte": highlighted, never moved. */
  attention: boolean;
}

export interface NotesRow {
  type: 'notes';
  section: Section;
  noteCount: number;
  suggestion: NotesDecision;
  attention: false;
}

/** Notes rows exist only in the Revisão de Foco, for notes deferred to it before the closing shrank. */
export type TriageRow = TaskRow | NotesRow;

/**
 * What the app settles on its own. Notes and whiteboards no longer pass through the closing (the
 * project page and the "Seções soltas" assistant take care of them); tasks finished or given a
 * future date during the day already have their destination.
 */
export type AutomaticItem =
  | { type: 'notesToWiki'; section: Section; project: Project | null; noteCount: number }
  | { type: 'whiteboardUnlinked'; section: Section }
  | { type: 'finishedDuringDay'; task: Block; section: Section | null }
  | { type: 'scheduledDuringDay'; task: Block; section: Section | null };

export interface OpenTask {
  task: Block;
  /** Null for tasks carried from other days. */
  section: Section | null;
}

export interface DayTriage {
  day: DayKey;
  /** Where "Dia seguinte" sends tasks. */
  nextDay: DayKey;
  /** Tasks that need a decision: open, without a future date, in the day note's order. */
  rows: TaskRow[];
  automatic: AutomaticItem[];
  /** Every task still open, in the day note's order. */
  open: OpenTask[];
}

export interface DayTriageInput {
  day: DayKey;
  today: DayKey;
  sections: Section[];
  /** Blocks written in the day's sections. */
  blocks: Block[];
  /** Tasks from other days whose intended date is the day. */
  carried: Block[];
  projects: Project[];
  /** Section 3: weekdays the user works; "dia seguinte" skips the others. */
  activeDays?: readonly number[];
  /** Order of the day note's parts, when it was changed; the checkout follows it. */
  sectionOrder?: readonly string[];
}

function byCreatedAt(a: { createdAt: string }, b: { createdAt: string }): number {
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}

function finishedOn(task: Block, day: DayKey): boolean {
  return task.status === 'done' && task.closedAt !== null && toDayKey(new Date(task.closedAt)) === day;
}

export function sectionNeedsNotesTriage(section: Section, blocks: readonly Block[]): boolean {
  return section.notesDestination === 'pending' && blocks.some((block) => block.kind === 'note');
}

export function sectionNeedsWhiteboardDecision(section: Section, blocks: readonly Block[]): boolean {
  return section.projectId === null && section.whiteboardDecision === 'pending' && blocks.length > 0;
}

export function buildDayTriage(input: DayTriageInput): DayTriage {
  const { day, today } = input;
  const nextDay = nextPlanningDay(day, today, input.activeDays);
  const projectsById = new Map(input.projects.map((project) => [project.id, project]));
  const rows: TaskRow[] = [];
  const automatic: AutomaticItem[] = [];

  // An open task keeps its date: only the ones without a future date ask for a decision, which
  // is "sem data" when left untouched. Something a person owes me stays as it is (spec/pessoas.md).
  const open: OpenTask[] = [];
  const addPending = (task: Block, section: Section | null) => {
    open.push({ task, section });
    const postponedOften = task.postponeCount >= POSTPONE_ATTENTION_THRESHOLD;
    const pastDeadline = task.deadline != null && task.deadline < nextDay;
    rows.push({
      type: 'task',
      task,
      section,
      suggestion: task.waiting ? { kind: 'keep' } : { kind: 'undate', untouched: true },
      attention: !task.waiting && (postponedOften || pastDeadline),
    });
  };

  // 1b: a task given a future date during the day already has its destination.
  const scheduledDuringDay = (task: Block, originDay: DayKey | null) =>
    task.kind === 'task' &&
    task.status === 'active' &&
    originDay === day &&
    task.intendedDate !== null &&
    task.intendedDate > day &&
    (task.lastTriagedDay === null || task.lastTriagedDay < day);

  // Tasks carried from other days come where they are in the day note: first, unless moved.
  const addCarried = () => {
    for (const task of sortCarried(input.carried, day)) {
      if (isTaskPendingOn(task, null, day)) addPending(task, null);
      else if (isTaskShownOn(task, null, day) && finishedOn(task, day)) {
        automatic.push({ type: 'finishedDuringDay', task, section: null });
      }
    }
  };

  const sections = [...input.sections].sort(byCreatedAt);
  const sectionsById = new Map(sections.map((section) => [section.id, section]));
  const parts = orderDayParts([CARRIED_PART, ...sections.map((section) => section.id)], input.sectionOrder);
  for (const part of parts) {
    if (part === CARRIED_PART) {
      addCarried();
      continue;
    }
    const section = sectionsById.get(part)!;
    const blocks = input.blocks.filter((block) => block.sectionId === section.id).sort(comparePositions);
    const notes = blocks.filter((block) => block.kind === 'note');

    if (sectionNeedsWhiteboardDecision(section, blocks)) automatic.push({ type: 'whiteboardUnlinked', section });

    if (sectionNeedsNotesTriage(section, blocks)) {
      automatic.push({
        type: 'notesToWiki',
        section,
        project: section.projectId ? (projectsById.get(section.projectId) ?? null) : null,
        noteCount: notes.length,
      });
    }

    for (const task of blocks) {
      if (task.kind !== 'task') continue;
      if (isTaskPendingOn(task, section.day, day)) addPending(task, section);
      else if (finishedOn(task, day)) automatic.push({ type: 'finishedDuringDay', task, section });
      else if (scheduledDuringDay(task, section.day)) automatic.push({ type: 'scheduledDuringDay', task, section });
    }
  }

  return { day, nextDay, rows, automatic, open };
}

/** Automatic decisions that still have to be written when the day is closed. */
export function isAppliedOnClose(item: AutomaticItem): boolean {
  return item.type === 'notesToWiki' || item.type === 'whiteboardUnlinked';
}

/** A day is pending while anything in it still needs a decision, or an automatic one written. */
export function isTriagePending(triage: DayTriage): boolean {
  return triage.rows.length > 0 || triage.automatic.some(isAppliedOnClose);
}

export interface PendingDaysInput {
  today: DayKey;
  /** Sections that may still need a decision, with their blocks. */
  sections: Section[];
  blocks: Block[];
  /** All active tasks, with the day of the section each one was written in. */
  activeTasks: Block[];
  originDays: ReadonlyMap<string, DayKey>;
}

/** Days before today whose checkout still has something to decide, oldest first. */
export function findPendingDays(input: PendingDaysInput): DayKey[] {
  const days = new Set<DayKey>();
  for (const section of input.sections) {
    if (section.day >= input.today) continue;
    const blocks = input.blocks.filter((block) => block.sectionId === section.id);
    if (sectionNeedsNotesTriage(section, blocks) || sectionNeedsWhiteboardDecision(section, blocks)) {
      days.add(section.day);
    }
  }
  for (const task of input.activeTasks) {
    const originDay = input.originDays.get(task.sectionId) ?? null;
    for (const day of [originDay, task.intendedDate]) {
      if (day && day < input.today && isTaskPendingOn(task, originDay, day)) days.add(day);
    }
  }
  return [...days].sort();
}
