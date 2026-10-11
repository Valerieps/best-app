import { toDayKey, type DayKey } from './day';
import type { Block, Project, Section } from './entities';
import { comparePositions } from './position';
import { isTaskPendingOn, isTaskShownOn, nextPlanningDay, POSTPONE_ATTENTION_THRESHOLD } from './tasks';
import { findCitedName } from './text';

/**
 * Batch checkout (AUTO-TRIAGEM.md). For one day, decides what is automatic, what is
 * suggested and what needs attention. The app only decides what is obvious and reversible,
 * and never takes things out of circulation on its own.
 */

export type TaskDecision =
  | { kind: 'finish' }
  | { kind: 'schedule'; date: DayKey }
  | { kind: 'archive' }
  | { kind: 'abandon' }
  /** Section 2: "decidir na reflexão semanal". */
  | { kind: 'reflection' }
  /** Section 6: the task becomes a habit. */
  | { kind: 'habit' };

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
  attention: boolean;
}

export interface NotesRow {
  type: 'notes';
  section: Section;
  noteCount: number;
  suggestion: NotesDecision;
  attention: false;
}

export interface WhiteboardRow {
  type: 'whiteboard';
  section: Section;
  suggestion: WhiteboardDecision;
  /** Existing project whose name appears in the section. */
  citedProject: Project | null;
  attention: boolean;
}

export type TriageRow = TaskRow | NotesRow | WhiteboardRow;

/** Decisions the app applies on its own; each can be undone back into a regular row. */
export type AutomaticItem =
  | { type: 'notesToWiki'; section: Section; project: Project | null; noteCount: number }
  | { type: 'finishedDuringDay'; task: Block; section: Section | null }
  | { type: 'scheduledDuringDay'; task: Block; section: Section | null };

export interface DayTriage {
  day: DayKey;
  /** Where "Dia seguinte" sends tasks. */
  nextDay: DayKey;
  rows: TriageRow[];
  automatic: AutomaticItem[];
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
  const activeProjects = input.projects.filter((project) => project.status === 'active');
  const rows: TriageRow[] = [];
  const automatic: AutomaticItem[] = [];

  // "Dia seguinte" is the suggestion. A task postponed many times asks for attention and,
  // since section 2, is suggested for the weekly reflection; a deadline before "dia seguinte"
  // also asks for attention.
  const taskRow = (task: Block, section: Section | null): TaskRow => {
    const postponedOften = task.postponeCount >= POSTPONE_ATTENTION_THRESHOLD;
    return {
      type: 'task',
      task,
      section,
      suggestion: postponedOften ? { kind: 'reflection' } : { kind: 'schedule', date: nextDay },
      attention: postponedOften || (task.deadline != null && task.deadline < nextDay),
    };
  };

  // 1b: a task given a future date during the day already has its destination.
  const scheduledDuringDay = (task: Block, originDay: DayKey | null) =>
    task.kind === 'task' &&
    task.status === 'active' &&
    originDay === day &&
    task.intendedDate !== null &&
    task.intendedDate > day &&
    (task.lastTriagedDay === null || task.lastTriagedDay < day);

  // Tasks carried from other days show up first, as at the top of the day note.
  for (const task of [...input.carried].sort(byCreatedAt)) {
    if (isTaskPendingOn(task, null, day)) rows.push(taskRow(task, null));
    else if (isTaskShownOn(task, null, day) && finishedOn(task, day)) {
      automatic.push({ type: 'finishedDuringDay', task, section: null });
    }
  }

  for (const section of [...input.sections].sort(byCreatedAt)) {
    const blocks = input.blocks.filter((block) => block.sectionId === section.id).sort(comparePositions);
    const notes = blocks.filter((block) => block.kind === 'note');

    if (sectionNeedsWhiteboardDecision(section, blocks)) {
      const sectionText = [section.title ?? '', ...blocks.map((block) => block.text)].join('\n');
      const cited = findCitedName(sectionText, activeProjects);
      rows.push({
        type: 'whiteboard',
        section,
        suggestion: cited ? { kind: 'link', projectId: cited.id } : { kind: 'leaveUnlinked' },
        citedProject: cited,
        attention: cited !== null,
      });
    }

    if (sectionNeedsNotesTriage(section, blocks)) {
      if (section.projectId !== null) {
        automatic.push({
          type: 'notesToWiki',
          section,
          project: projectsById.get(section.projectId) ?? null,
          noteCount: notes.length,
        });
      } else {
        rows.push({ type: 'notes', section, noteCount: notes.length, suggestion: 'wiki', attention: false });
      }
    }

    for (const task of blocks) {
      if (task.kind !== 'task') continue;
      if (isTaskPendingOn(task, section.day, day)) rows.push(taskRow(task, section));
      else if (finishedOn(task, day)) automatic.push({ type: 'finishedDuringDay', task, section });
      else if (scheduledDuringDay(task, section.day)) automatic.push({ type: 'scheduledDuringDay', task, section });
    }
  }

  return { day, nextDay, rows, automatic };
}

/** A day is pending while anything in it still needs a decision. */
export function isTriagePending(triage: DayTriage): boolean {
  return triage.rows.length > 0 || triage.automatic.some((item) => item.type === 'notesToWiki');
}

/** Turns an automatic decision back into a regular row the user can change. */
export function automaticToRow(item: AutomaticItem): TriageRow {
  if (item.type === 'notesToWiki') {
    return { type: 'notes', section: item.section, noteCount: item.noteCount, suggestion: 'wiki', attention: false };
  }
  const suggestion: TaskDecision =
    item.type === 'scheduledDuringDay' && item.task.intendedDate
      ? { kind: 'schedule', date: item.task.intendedDate }
      : { kind: 'finish' };
  return { type: 'task', task: item.task, section: item.section, suggestion, attention: false };
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
