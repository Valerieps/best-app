import type { TaskDecision } from './triage';

/**
 * "Fechar o dia" in steps (spec/checkout.md, "Fechamento em etapas"). Each step handles one kind
 * of decision, and a step with nothing to decide is skipped. "triage" is the board of the tasks
 * of the day and the "Fila de execução"; there is no board of late tasks any more, since tasks
 * have no intended date (ADR-072).
 */
export type CheckoutStep = 'triage' | 'reminders';

export const CHECKOUT_STEP_ORDER: readonly CheckoutStep[] = ['triage', 'reminders'];

/** How many items each step that can be empty has to decide. */
export interface StepCounts {
  reminders: number;
}

export function stepCounts(reminders: number): StepCounts {
  return { reminders };
}

/** The board of the day always shows: it closes the day even when it is empty. */
export function stepHasItems(step: CheckoutStep, counts: StepCounts): boolean {
  return step === 'reminders' ? counts.reminders > 0 : true;
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

/** A card of the board: a task of the triage of the day, with what it gets when left untouched. */
export interface BoardCard {
  id: string;
  suggestion: TaskDecision;
}

/** What I did on the board, saved only when I move on. */
export interface BoardMarks {
  /** Dragged into the "Fila de execução". */
  queued: ReadonlySet<string>;
  abandoned: ReadonlySet<string>;
  finished: ReadonlySet<string>;
}

/**
 * What moving on from the board saves: a decision for each card. Abandoning wins over finishing,
 * which wins over the queue; a card left alone keeps its suggestion and simply stays linked to its
 * project or person (spec/checkout.md, "Quadro do fechamento").
 */
export function boardOutcome(cards: readonly BoardCard[], marks: BoardMarks): Map<string, TaskDecision> {
  const decisions = new Map<string, TaskDecision>();
  for (const card of cards) {
    if (marks.abandoned.has(card.id)) decisions.set(card.id, { kind: 'abandon' });
    else if (marks.finished.has(card.id)) decisions.set(card.id, { kind: 'finish' });
    else if (marks.queued.has(card.id)) decisions.set(card.id, { kind: 'queue' });
    else decisions.set(card.id, card.suggestion);
  }
  return decisions;
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

/** The items between two others, both included, in list order: Shift + click selects a range. */
export function rangeBetween<T>(list: readonly T[], a: T, b: T): T[] {
  const i = list.indexOf(a);
  const j = list.indexOf(b);
  if (i === -1 || j === -1) return [];
  return list.slice(Math.min(i, j), Math.max(i, j) + 1);
}
