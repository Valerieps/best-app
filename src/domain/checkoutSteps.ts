import { addDays, type DayKey } from './day';
import type { TaskDecision } from './triage';

/**
 * "Fechar o dia" in steps (spec/checkout.md, "Fechamento em etapas"). Each step handles one kind
 * of decision, and a step with nothing to decide is skipped. "late" is the board of the late
 * tasks, "triage" the board of the tasks of the day.
 */
export type CheckoutStep = 'late' | 'triage' | 'reminders';

export const CHECKOUT_STEP_ORDER: readonly CheckoutStep[] = ['late', 'triage', 'reminders'];

/** How many items each step that can be empty has to decide. */
export interface StepCounts {
  /** Tasks dated before today that are not in the triage of the day. */
  late: number;
  reminders: number;
}

export function stepCounts(late: number, reminders: number): StepCounts {
  return { late, reminders };
}

/** The board of the day always shows: it closes the day even when it is empty. */
export function stepHasItems(step: CheckoutStep, counts: StepCounts): boolean {
  switch (step) {
    case 'late':
      return counts.late > 0;
    case 'reminders':
      return counts.reminders > 0;
    default:
      return true;
  }
}

export function checkoutSteps(counts: StepCounts): CheckoutStep[] {
  return CHECKOUT_STEP_ORDER.filter((step) => stepHasItems(step, counts));
}

/** The next step of the plan that still has something to decide; null after the last one. */
export function nextStep(plan: readonly CheckoutStep[], current: CheckoutStep, counts: StepCounts): CheckoutStep | null {
  const index = plan.indexOf(current);
  return plan.slice(index + 1).find((step) => stepHasItems(step, counts)) ?? null;
}

/** The previous step of the plan that still has something to decide; null before the first one. */
export function previousStep(plan: readonly CheckoutStep[], current: CheckoutStep, counts: StepCounts): CheckoutStep | null {
  const index = plan.indexOf(current);
  return [...plan.slice(0, Math.max(index, 0))].reverse().find((step) => stepHasItems(step, counts)) ?? null;
}

/** A card of a checkout board: its task, its date, and the suggestion when it is in the triage. */
export interface BoardCard {
  id: string;
  date: DayKey | null;
  /** Set for a task of the triage of the day, which always gets a decision. */
  suggestion?: TaskDecision;
}

/** What I did on a board, saved only when I move on. */
export interface BoardMarks {
  /** A new date; null is "remover data de intenção". */
  dates: ReadonlyMap<string, DayKey | null>;
  abandoned: ReadonlySet<string>;
  /** Only tasks of the triage have the box to finish them. */
  finished: ReadonlySet<string>;
}

/**
 * What moving on from a board saves: a decision for each task of the triage (its suggestion
 * when untouched) and for each abandoned task, and a date change for the other moved tasks.
 */
export function boardOutcome(
  cards: readonly BoardCard[],
  marks: BoardMarks,
): { decisions: Map<string, TaskDecision>; changes: { taskId: string; date: DayKey | null }[] } {
  const decisions = new Map<string, TaskDecision>();
  const changes: { taskId: string; date: DayKey | null }[] = [];
  for (const card of cards) {
    const moved = marks.dates.has(card.id);
    const date = marks.dates.get(card.id) ?? null;
    if (marks.abandoned.has(card.id)) decisions.set(card.id, { kind: 'abandon' });
    else if (card.suggestion) {
      if (marks.finished.has(card.id)) decisions.set(card.id, { kind: 'finish' });
      else if (moved) decisions.set(card.id, date === null ? { kind: 'undate' } : { kind: 'schedule', date });
      else decisions.set(card.id, card.suggestion);
    } else if (moved && date !== card.date) changes.push({ taskId: card.id, date });
  }
  return { decisions, changes };
}

/** A group of the triage: the tasks of one project, or the ones without a project (`projectId` null). */
export interface ProjectGroup<T> {
  projectId: string | null;
  items: T[];
}

/**
 * The triage shows the tasks grouped by project, the groups in the order their first task
 * appears in the day note, and the tasks without a project last.
 */
export function groupByProject<T>(items: readonly T[], projectOf: (item: T) => string | null): ProjectGroup<T>[] {
  const groups = new Map<string | null, T[]>();
  for (const item of items) {
    const key = projectOf(item);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  const result = [...groups].map(([projectId, list]) => ({ projectId, items: list }));
  return [...result.filter((group) => group.projectId !== null), ...result.filter((group) => group.projectId === null)];
}

/** The planning is a board of three columns (spec/checkout.md, "Planejamento do dia seguinte"). */
export const PLANNING_COLUMNS = 3;

/** A column of the planning board: the late tasks, all together, or the tasks of one day. */
export type PlanningColumn = { kind: 'late' } | { kind: 'day'; day: DayKey };

/**
 * The columns of the planning board. The late tasks (dated before today) come first, all in one
 * column, when there are any. Then today, when a task is dated for it and it is not the target
 * already, and the target day with the days after it, until there are three columns (or `count`).
 */
export function planningColumns(
  dates: readonly (DayKey | null)[],
  today: DayKey,
  target: DayKey,
  count: number = PLANNING_COLUMNS,
): PlanningColumn[] {
  const columns: PlanningColumn[] = [];
  if (dates.some((date) => date !== null && date < today)) columns.push({ kind: 'late' });
  if (today < target && dates.includes(today)) columns.push({ kind: 'day', day: today });
  for (let day = target; columns.length < count; day = addDays(day, 1)) columns.push({ kind: 'day', day });
  return columns;
}

/**
 * The column of a task with this date, as an index in `columns`; -1 when it is not on the board:
 * without a date (the "algum dia", in the task list) or dated after the last column.
 */
export function planningColumnOf(date: DayKey | null, columns: readonly PlanningColumn[], today: DayKey): number {
  if (date === null) return -1;
  if (date < today) return columns.findIndex((column) => column.kind === 'late');
  return columns.findIndex((column) => column.kind === 'day' && column.day === date);
}

/** The items between two others, both included, in list order: Shift + click selects a range. */
export function rangeBetween<T>(list: readonly T[], a: T, b: T): T[] {
  const i = list.indexOf(a);
  const j = list.indexOf(b);
  if (i === -1 || j === -1) return [];
  return list.slice(Math.min(i, j), Math.max(i, j) + 1);
}
