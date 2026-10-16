import { toDayKey, type DayKey } from '../domain/day';
import type { Section } from '../domain/entities';
import type { DayTriage, NotesDecision, TaskDecision, WhiteboardDecision } from '../domain/triage';
import { record } from './events';
import { addHabitIn } from './habits';
import { moveIntendedDate } from './intendedDate';
import { addResourceIn } from './objectives';
import { finishTaskIn, linkSection, reopenTaskIn } from './notebook';
import type { AppContext, StoreTransaction } from './ports';
import { addProject } from './projects';

/** Checkout use cases: batch triage, planning the next day, and closing pending days. */

export interface TriageDecisions {
  tasks: ReadonlyMap<string, TaskDecision>;
  notes: ReadonlyMap<string, NotesDecision>;
  whiteboards: ReadonlyMap<string, WhiteboardDecision>;
  /** Section 2: optional project for a task ("vincular a um projeto"); null unlinks. */
  taskProjects?: ReadonlyMap<string, string | null>;
  /** Section 4: notes of a section linked as a resource of an objective or project. */
  noteResources?: ReadonlyMap<string, { ownerType: 'objective' | 'project'; ownerId: string }>;
}

/**
 * What the closing writes when nothing is changed: the suggestion of every task still waiting
 * for a decision ("sem data", or as it is for a waiting task), and every automatic decision
 * (notes kept, whiteboards left unlinked).
 */
export function defaultClosingDecisions(triage: DayTriage) {
  const tasks = new Map<string, TaskDecision>();
  const notes = new Map<string, NotesDecision>();
  const whiteboards = new Map<string, WhiteboardDecision>();
  for (const row of triage.rows) tasks.set(row.task.id, row.suggestion);
  for (const item of triage.automatic) {
    if (item.type === 'notesToWiki') notes.set(item.section.id, 'wiki');
    if (item.type === 'whiteboardUnlinked') whiteboards.set(item.section.id, { kind: 'leaveUnlinked' });
  }
  return { tasks, notes, whiteboards };
}

function nowIso(ctx: AppContext): string {
  return ctx.clock.now().toISOString();
}

function laterOf(a: DayKey | null, b: DayKey): DayKey {
  return a !== null && a > b ? a : b;
}

/** Applies one task decision inside a transaction. Shared by the checkout and the weekly reflection. */
export async function applyTaskDecision(
  ctx: AppContext,
  tx: StoreTransaction,
  taskId: string,
  decision: TaskDecision,
  day: DayKey,
): Promise<void> {
  let task = await tx.blocks.get(taskId);
  if (!task || task.kind !== 'task') return;

  if (decision.kind === 'finish') {
    if (task.status === 'active') task = await finishTaskIn(ctx, tx, task, day);
  } else {
    // Undoing "finished during the day" and choosing something else reopens the task first.
    if (task.status === 'done') task = await reopenTaskIn(ctx, tx, task);
    if (task.status !== 'active') return;
    if (decision.kind === 'keep') {
      // Settled for the day, as it is: only `lastTriagedDay` changes, below.
    } else if (decision.kind === 'schedule' || decision.kind === 'undate') {
      const to = decision.kind === 'schedule' ? decision.date : null;
      // A task left untouched in the triage goes to the task list without counting as postponed.
      const quiet = decision.kind === 'undate' && decision.untouched === true;
      task = await moveIntendedDate(ctx, tx, task, to, day, 'checkout', { postpone: !quiet });
    } else if (decision.kind === 'reflection') {
      task = { ...task, awaitingReflection: true, updatedAt: nowIso(ctx) };
      await record(ctx, tx, 'task.deferredToReflection', 'block', task.id, day);
    } else if (decision.kind === 'habit') {
      const habit = await addHabitIn(ctx, tx, { name: task.text || 'Hábito', criterion: '', weekdays: [], objectiveId: null });
      task = { ...task, status: 'converted', closedAt: nowIso(ctx), updatedAt: nowIso(ctx) };
      await record(ctx, tx, 'task.convertedToHabit', 'block', task.id, day, { habitId: habit.id });
    } else {
      task = { ...task, status: 'abandoned', closedAt: nowIso(ctx), updatedAt: nowIso(ctx) };
      await record(ctx, tx, 'task.abandoned', 'block', task.id, day);
    }
  }
  // Any decision other than leaving it for the reflection settles a deferred task.
  const awaitingReflection = decision.kind === 'reflection' ? true : undefined;
  await tx.blocks.put({ ...task, awaitingReflection, lastTriagedDay: laterOf(task.lastTriagedDay, day) });
}

/** Links (or unlinks, with null) a task to a project during a triage. */
export async function applyTaskProject(
  ctx: AppContext,
  tx: StoreTransaction,
  taskId: string,
  projectId: string | null,
  day: DayKey,
): Promise<void> {
  const task = await tx.blocks.get(taskId);
  if (!task || task.kind !== 'task' || task.projectId === projectId) return;
  await tx.blocks.put({ ...task, projectId, updatedAt: nowIso(ctx) });
  await record(ctx, tx, 'block.linkedToProject', 'block', task.id, day, { projectId });
}

const NOTES_EVENTS = {
  wiki: 'section.notesMovedToWiki',
  discarded: 'section.notesDiscarded',
  weeklyReflection: 'section.notesDeferredToReflection',
} as const;

/** Section 4: links the notes of a section as a resource of an objective or project. */
export async function linkSectionNotesAsResource(
  ctx: AppContext,
  sectionId: string,
  owner: { ownerType: 'objective' | 'project'; ownerId: string },
): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const section = await tx.sections.get(sectionId);
    if (section) await addResourceIn(ctx, tx, owner, { sectionId, title: section.title ?? `Notas de ${section.day}` });
  });
}

/** Sets the destination of a section's notes. Shared by the checkout and the weekly reflection. */
export async function applyNotesDecision(
  ctx: AppContext,
  tx: StoreTransaction,
  section: Section,
  decision: NotesDecision,
  day: DayKey,
): Promise<Section> {
  const updated: Section = { ...section, notesDestination: decision, updatedAt: nowIso(ctx) };
  await tx.sections.put(updated);
  await record(ctx, tx, NOTES_EVENTS[decision], 'section', section.id, day, { projectId: section.projectId });
  return updated;
}

async function applyWhiteboardDecision(
  ctx: AppContext,
  tx: StoreTransaction,
  section: Section,
  decision: WhiteboardDecision,
  day: DayKey,
): Promise<void> {
  if (decision.kind === 'leaveUnlinked') {
    await tx.sections.put({ ...section, whiteboardDecision: 'leftUnlinked', updatedAt: nowIso(ctx) });
    await record(ctx, tx, 'section.leftUnlinked', 'section', section.id, day);
    return;
  }
  const projectId =
    decision.kind === 'link' ? decision.projectId : (await addProject(ctx, tx, decision.name)).id;
  await linkSection(ctx, tx, section, projectId, day);
}

/** Applies every triage decision of a day in a single transaction. */
export async function applyTriage(ctx: AppContext, day: DayKey, decisions: TriageDecisions): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    // Links first, so tasks and notes of a section linked now go with its project.
    for (const [sectionId, decision] of decisions.whiteboards) {
      const section = await tx.sections.get(sectionId);
      if (section) await applyWhiteboardDecision(ctx, tx, section, decision, day);
    }
    for (const [sectionId, decision] of decisions.notes) {
      const section = await tx.sections.get(sectionId);
      if (section) await applyNotesDecision(ctx, tx, section, decision, day);
    }
    for (const [sectionId, owner] of decisions.noteResources ?? []) {
      const section = await tx.sections.get(sectionId);
      if (section) await addResourceIn(ctx, tx, owner, { sectionId, title: section.title ?? `Notas de ${section.day}` });
    }
    for (const [taskId, projectId] of decisions.taskProjects ?? []) {
      await applyTaskProject(ctx, tx, taskId, projectId, day);
    }
    for (const [taskId, decision] of decisions.tasks) {
      await applyTaskDecision(ctx, tx, taskId, decision, day);
    }
  });
}

export interface PlanningChange {
  taskId: string;
  /** The new intended date; null leaves the task without a date, in the active list. */
  date: DayKey | null;
}

/**
 * Planning the next day: sets the intended date of active tasks, putting them in the target
 * day's note, on another day, or back in the active list without a date. Nothing is finished.
 */
export async function applyPlanning(ctx: AppContext, day: DayKey, changes: readonly PlanningChange[]): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    for (const change of changes) {
      const task = await tx.blocks.get(change.taskId);
      if (!task || task.kind !== 'task' || task.status !== 'active') continue;
      if (task.intendedDate !== change.date) {
        await tx.blocks.put(await moveIntendedDate(ctx, tx, task, change.date, day, 'planning'));
      }
    }
  });
}

async function markCheckoutDone(ctx: AppContext, tx: StoreTransaction, day: DayKey, mode: 'checkout' | 'closePendingDays'): Promise<void> {
  const at = nowIso(ctx);
  // The note can still be written in after a checkout of today; it keeps its order.
  const sectionOrder = (await tx.days.get(day))?.sectionOrder;
  await tx.days.put({ day, lastCheckoutAt: at, updatedAt: at, ...(sectionOrder ? { sectionOrder } : {}) });
  await record(ctx, tx, 'day.checkoutCompleted', 'day', day, day, { mode });
}

/** "Finalizar meu dia". */
export async function completeCheckout(ctx: AppContext, day: DayKey): Promise<void> {
  await ctx.store.transaction((tx) => markCheckoutDone(ctx, tx, day, 'checkout'));
}

export interface ClosePendingDaysSummary {
  days: DayKey[];
  /** Tasks that go back to the active list without a date. */
  tasks: number;
  /** Sections whose notes are kept as they are. */
  notesToWiki: number;
  /** Whiteboard sections left unlinked. */
  whiteboards: number;
}

/** Every task of a triage that is still open. */
export function openTasksOf(triage: DayTriage): string[] {
  return triage.open.map((item) => item.task.id);
}

export function summarizeClosePendingDays(triages: readonly DayTriage[]): ClosePendingDaysSummary {
  const tasks = new Set<string>();
  const notes = new Set<string>();
  const whiteboards = new Set<string>();
  for (const triage of triages) {
    for (const id of openTasksOf(triage)) tasks.add(id);
    for (const item of triage.automatic) {
      if (item.type === 'notesToWiki') notes.add(item.section.id);
      if (item.type === 'whiteboardUnlinked') whiteboards.add(item.section.id);
    }
  }
  return {
    days: triages.map((triage) => triage.day),
    tasks: tasks.size,
    notesToWiki: notes.size,
    whiteboards: whiteboards.size,
  };
}

/**
 * "Fechar dias pendentes" (spec/checkout.md): notes are kept, whiteboards stay unlinked,
 * and tasks not done go back to the active list without a date, counting as postponed.
 * Nothing is deleted or abandoned.
 */
export async function closePendingDays(ctx: AppContext, triages: readonly DayTriage[]): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const today = toDayKey(ctx.clock.now());
    for (const triage of triages) {
      const day = triage.day;
      for (const item of triage.automatic) {
        if (item.type !== 'whiteboardUnlinked') continue;
        const section = await tx.sections.get(item.section.id);
        if (section?.whiteboardDecision === 'pending' && section.projectId === null) {
          await applyWhiteboardDecision(ctx, tx, section, { kind: 'leaveUnlinked' }, day);
        }
      }
      for (const item of triage.automatic) {
        if (item.type !== 'notesToWiki') continue;
        const section = await tx.sections.get(item.section.id);
        if (section?.notesDestination === 'pending') await applyNotesDecision(ctx, tx, section, 'wiki', day);
      }
      for (const taskId of openTasksOf(triage)) {
        const task = await tx.blocks.get(taskId);
        if (!task || task.status !== 'active' || (task.lastTriagedDay !== null && task.lastTriagedDay >= day)) continue;
        // A waiting task is no postponement: it stays as it is, out of that day (spec/pessoas.md).
        if (task.waiting) {
          await tx.blocks.put({ ...task, lastTriagedDay: laterOf(task.lastTriagedDay, day), updatedAt: nowIso(ctx) });
          continue;
        }
        const from = task.intendedDate;
        await record(ctx, tx, 'task.postponed', 'block', task.id, day, { from, to: null, reason: 'closePendingDays' });
        if (from !== null) {
          await record(ctx, tx, 'task.intendedDateChanged', 'block', task.id, day, {
            from,
            to: null,
            reason: 'closePendingDays',
          });
        }
        await tx.blocks.put({
          ...task,
          intendedDate: null,
          postponeCount: task.postponeCount + 1,
          lastTriagedDay: laterOf(task.lastTriagedDay, day),
          updatedAt: nowIso(ctx),
        });
      }
      if (day < today) await markCheckoutDone(ctx, tx, day, 'closePendingDays');
    }
  });
}
