import { addDays, type DayKey } from './day';
import type { Block } from './entities';
import { POSTPONE_ATTENTION_THRESHOLD } from './tasks';
import type { DayTriage, TaskRow } from './triage';

/**
 * The checkout in steps (spec/checkout.md, "Checkout em etapas"). Each step handles one kind of
 * decision, and a step with nothing to decide is skipped.
 */
export type CheckoutStep = 'whiteboards' | 'doneCheck' | 'attention' | 'reminders' | 'confirm' | 'planning';

export const CHECKOUT_STEP_ORDER: readonly CheckoutStep[] = [
  'whiteboards',
  'doneCheck',
  'attention',
  'reminders',
  'confirm',
  'planning',
];

/** How many items each step that can be empty has to decide. */
export interface StepCounts {
  whiteboards: number;
  tasks: number;
  attention: number;
  reminders: number;
}

export function attentionRows(triage: DayTriage): TaskRow[] {
  return triage.rows.filter((row): row is TaskRow => row.type === 'task' && row.attention);
}

export function stepCounts(triage: DayTriage, reminders: number): StepCounts {
  return {
    whiteboards: triage.rows.filter((row) => row.type === 'whiteboard').length,
    tasks: triage.rows.filter((row) => row.type === 'task').length,
    attention: attentionRows(triage).length,
    reminders,
  };
}

/** The confirmation and the planning always show: they close the day even when it is empty. */
export function stepHasItems(step: CheckoutStep, counts: StepCounts): boolean {
  switch (step) {
    case 'whiteboards':
      return counts.whiteboards > 0;
    case 'doneCheck':
      return counts.tasks > 0;
    case 'attention':
      return counts.attention > 0;
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

export type AttentionReason = 'postponed' | 'deadline';

/** Why a task asks for attention: postponed too often, or a deadline before "dia seguinte". */
export function attentionReason(task: Block): AttentionReason {
  return task.postponeCount >= POSTPONE_ATTENTION_THRESHOLD ? 'postponed' : 'deadline';
}

/** The planning shows the tasks scheduled for the days right after the target (spec/checkout.md). */
export const PLANNING_HORIZON_DAYS = 3;

export type PlanningGroup = 'target' | 'soon' | 'other';

/**
 * Where a task goes in the planning: in the target day's note, scheduled for the next few days,
 * or among the other active tasks (no date, or a date already past). Tasks scheduled further
 * ahead stay out (null).
 */
export function planningGroup(intendedDate: DayKey | null, target: DayKey): PlanningGroup | null {
  if (intendedDate === target) return 'target';
  if (intendedDate !== null && intendedDate > target) {
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
