import { daysBetween, toDayKey, type DayKey } from './day';
import type { Reflection } from './entities';
import type { DomainEvent } from './events';

/**
 * The two reviews (spec/rituais.md): the Revisão de Foco, about projects, and the Revisão de
 * Rumo, about objectives. Neither is tied to the calendar: each covers the time since the last
 * one of its kind, and becomes available by a cadence counted in checkouts or by signals that
 * something is off. Only the checkout has a fixed time, the day.
 */

export type ReviewKind = 'focus' | 'direction';

export interface ReviewCadence {
  /** Checkouts until the Revisão de Foco is available. */
  focusCheckouts: number;
  /** Revisões de Foco until the Revisão de Rumo is available. */
  directionFocusReviews: number;
}

export const DEFAULT_REVIEW_CADENCE: ReviewCadence = { focusCheckouts: 5, directionFocusReviews: 4 };

/** Items waiting for the Revisão de Foco that make it available on their own. */
export const AWAITING_ITEMS_SIGNAL = 10;
/** Finished tasks needed in the period before their share without objective means anything. */
export const DIRECTION_MIN_FINISHED_TASKS = 10;
/** An active objective with projects is stalled after this many days without activity in them. */
export const OBJECTIVE_STALLED_AFTER_DAYS = 30;

/** Why a review became available, shown in its notice. */
export type ReviewReason =
  | { kind: 'cadence'; count: number }
  | { kind: 'awaitingItems'; count: number }
  | { kind: 'stalledFocusProject'; projectId: string; days: number }
  | { kind: 'focusListEmptied' }
  | { kind: 'tasksWithoutObjective'; withoutObjective: number; finished: number }
  | { kind: 'stalledObjective'; objectiveId: string; days: number };

/**
 * The kind of review a stored reflection counts as. Weekly and monthly reflections, from before
 * the reviews, count as the last Revisão de Foco and Revisão de Rumo.
 */
export function reviewKindOf(reflection: Pick<Reflection, 'kind'>): ReviewKind {
  return reflection.kind === 'focus' || reflection.kind === 'week' ? 'focus' : 'direction';
}

/** When the latest closed review of a kind was closed; null if there was none. */
export function lastClosedAt(reflections: readonly Reflection[], kind: ReviewKind): string | null {
  let latest: string | null = null;
  for (const reflection of reflections) {
    if (reflection.closedAt && reviewKindOf(reflection) === kind && (latest === null || reflection.closedAt > latest)) {
      latest = reflection.closedAt;
    }
  }
  return latest;
}

/** Reviews of a kind closed after `since` (all of them when `since` is null). */
export function closedReviewsSince(reflections: readonly Reflection[], kind: ReviewKind, since: string | null): number {
  return reflections.filter(
    (reflection) => reflection.closedAt && reviewKindOf(reflection) === kind && (since === null || reflection.closedAt > since),
  ).length;
}

/**
 * Checkouts since `since`: days closed after that moment, each day once, however many times its
 * checkout was done. Days closed by "Fechar dias pendentes" count too.
 */
export function checkoutsSince(events: readonly DomainEvent[], since: string | null): number {
  const days = new Set<string>();
  for (const event of events) {
    if (event.type === 'day.checkoutCompleted' && (since === null || event.at > since)) days.add(event.entityId);
  }
  return days.size;
}

/** Whether an event happened in a review's period: after `since` (always, when null). */
export function isInPeriod(event: Pick<DomainEvent, 'at'>, since: string | null, until?: string): boolean {
  return (since === null || event.at > since) && (until === undefined || event.at <= until);
}

export interface FocusSignals {
  checkouts: number;
  cadence: number;
  /** Tasks and note sections left for the Revisão de Foco. */
  awaitingItems: number;
  /** Projects in focus that are stalled, with their days without activity. */
  stalledFocusProjects: readonly { projectId: string; days: number }[];
  /** The last project in focus was finished after the last review, leaving the list empty. */
  focusListEmptied: boolean;
}

/** Why the Revisão de Foco is available; empty when it is not. */
export function focusReasons(signals: FocusSignals): ReviewReason[] {
  const reasons: ReviewReason[] = [];
  if (signals.checkouts >= signals.cadence) reasons.push({ kind: 'cadence', count: signals.checkouts });
  if (signals.awaitingItems >= AWAITING_ITEMS_SIGNAL) reasons.push({ kind: 'awaitingItems', count: signals.awaitingItems });
  for (const project of signals.stalledFocusProjects) reasons.push({ kind: 'stalledFocusProject', ...project });
  if (signals.focusListEmptied) reasons.push({ kind: 'focusListEmptied' });
  return reasons;
}

export interface DirectionSignals {
  focusReviews: number;
  cadence: number;
  /** The signals below only apply after the first Revisão de Rumo, when objectives exist. */
  hadDirectionReview: boolean;
  /** Tasks finished in the period, and how many of them are not in a project with an objective. */
  finishedTasks: number;
  finishedWithoutObjective: number;
  /** Active objectives with projects and no activity in them, with their days without activity. */
  stalledObjectives: readonly { objectiveId: string; days: number }[];
}

/** Why the Revisão de Rumo is available; empty when it is not. */
export function directionReasons(signals: DirectionSignals): ReviewReason[] {
  const reasons: ReviewReason[] = [];
  if (signals.focusReviews >= signals.cadence) reasons.push({ kind: 'cadence', count: signals.focusReviews });
  if (!signals.hadDirectionReview) return reasons;
  if (signals.finishedTasks >= DIRECTION_MIN_FINISHED_TASKS && signals.finishedWithoutObjective * 2 > signals.finishedTasks) {
    reasons.push({ kind: 'tasksWithoutObjective', withoutObjective: signals.finishedWithoutObjective, finished: signals.finishedTasks });
  }
  for (const objective of signals.stalledObjectives) reasons.push({ kind: 'stalledObjective', ...objective });
  return reasons;
}

/**
 * Days without activity when an objective is stalled; null otherwise. `lastActivity` is the
 * latest activity day among its projects; with none, the objective counts as idle since it was
 * created. Only active objectives with at least one project can be stalled.
 */
export function objectiveStalledDays(
  objective: { status: 'active' | 'finished'; createdAt: string },
  hasProjects: boolean,
  lastActivity: DayKey | null,
  today: DayKey,
): number | null {
  if (objective.status !== 'active' || !hasProjects) return null;
  const since = lastActivity ?? toDayKey(new Date(objective.createdAt));
  const idle = daysBetween(since, today);
  return idle >= OBJECTIVE_STALLED_AFTER_DAYS ? idle : null;
}
