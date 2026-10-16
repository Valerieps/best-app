import { addDays, type DayKey } from './day';
import type { DayTriage } from './triage';

/**
 * "Fechar o dia" in steps (spec/checkout.md, "Fechamento em etapas"). Each step handles one kind
 * of decision, and a step with nothing to decide is skipped.
 */
export type CheckoutStep = 'triage' | 'reminders' | 'planning';

export const CHECKOUT_STEP_ORDER: readonly CheckoutStep[] = ['triage', 'reminders', 'planning'];

/** How many items each step that can be empty has to decide. */
export interface StepCounts {
  /** Open tasks without a future date, and the waiting ones. */
  tasks: number;
  reminders: number;
}

export function stepCounts(triage: DayTriage, reminders: number): StepCounts {
  return { tasks: triage.rows.length, reminders };
}

/** The planning always shows: it closes the day even when it is empty. */
export function stepHasItems(step: CheckoutStep, counts: StepCounts): boolean {
  switch (step) {
    case 'triage':
      return counts.tasks > 0;
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

/** The planning shows the tasks scheduled for the days right after the target (spec/checkout.md). */
export const PLANNING_HORIZON_DAYS = 3;

export type PlanningGroup = 'target' | 'soon' | 'other';

/**
 * Where a task goes in the planning: in the target day's note, scheduled for the next few days,
 * or among the other tasks whose date already passed. Tasks without a date are the "algum dia"
 * and stay out (null), as do tasks scheduled further ahead.
 */
export function planningGroup(intendedDate: DayKey | null, target: DayKey): PlanningGroup | null {
  if (intendedDate === null) return null;
  if (intendedDate === target) return 'target';
  if (intendedDate > target) {
    return intendedDate <= addDays(target, PLANNING_HORIZON_DAYS) ? 'soon' : null;
  }
  return 'other';
}

/** The items between two others, both included, in list order: Shift + click selects a range. */
export function rangeBetween<T>(list: readonly T[], a: T, b: T): T[] {
  const i = list.indexOf(a);
  const j = list.indexOf(b);
  if (i === -1 || j === -1) return [];
  return list.slice(Math.min(i, j), Math.max(i, j) + 1);
}
