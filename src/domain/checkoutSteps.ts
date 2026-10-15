import { addDays, type DayKey } from './day';
import type { Block } from './entities';
import { POSTPONE_ATTENTION_THRESHOLD } from './tasks';
import type { DayTriage } from './triage';

/**
 * "Fechar o dia" in steps (spec/checkout.md, "Fechamento em etapas"). Each step handles one kind
 * of decision, and a step with nothing to decide is skipped.
 */
export type CheckoutStep = 'doneCheck' | 'attention' | 'reminders' | 'confirm' | 'planning';

export const CHECKOUT_STEP_ORDER: readonly CheckoutStep[] = ['doneCheck', 'attention', 'reminders', 'confirm', 'planning'];

/** How many items each step that can be empty has to decide. */
export interface StepCounts {
  /** Every task still open: the ones needing a decision and the ones rolling over. */
  tasks: number;
  attention: number;
  reminders: number;
}

export function stepCounts(triage: DayTriage, reminders: number): StepCounts {
  const rolledOver = triage.automatic.filter((item) => item.type === 'rolledOver').length;
  return { tasks: triage.rows.length + rolledOver, attention: triage.rows.length, reminders };
}

/** The confirmation and the planning always show: they close the day even when it is empty. */
export function stepHasItems(step: CheckoutStep, counts: StepCounts): boolean {
  switch (step) {
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

/** Why a task asks for a decision: postponed too often, or a deadline before "dia seguinte". */
export function attentionReason(task: Block): AttentionReason {
  return task.postponeCount >= POSTPONE_ATTENTION_THRESHOLD ? 'postponed' : 'deadline';
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
