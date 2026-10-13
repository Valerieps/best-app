import { toDayKey } from '../domain/day';
import type { Reflection } from '../domain/entities';
import type { DirectionMetrics } from '../domain/directionMetrics';
import type { WeeklyMetrics } from '../domain/metrics';
import type { ReviewCadence, ReviewKind } from '../domain/reviews';
import type { NotesDecision, TaskDecision } from '../domain/triage';
import { applyNotesDecision, applyTaskDecision, applyTaskProject } from './checkout';
import { record } from './events';
import type { AppContext, StoreTransaction } from './ports';
import { updateSettings } from './settings';

/**
 * The Revisão de Foco and the Revisão de Rumo (spec/rituais.md). While a review is in progress
 * its record has a fixed id (`focus:open`, `direction:open`); closing it keeps a copy under a new
 * id and starts the next period. A closed review does not reopen.
 */

export const OPEN_REVIEW_ID: Record<ReviewKind, string> = { focus: 'focus:open', direction: 'direction:open' };

function newReview(ctx: AppContext, kind: ReviewKind): Reflection {
  return {
    id: OPEN_REVIEW_ID[kind],
    kind,
    period: '',
    start: '',
    end: '',
    bestMoments: '',
    improvements: '',
    closedAt: null,
    updatedAt: ctx.clock.now().toISOString(),
  };
}

async function openReview(ctx: AppContext, tx: StoreTransaction, kind: ReviewKind): Promise<Reflection> {
  return (await tx.reflections.get(OPEN_REVIEW_ID[kind])) ?? newReview(ctx, kind);
}

export interface DeferredDecisions {
  tasks: ReadonlyMap<string, Exclude<TaskDecision, { kind: 'reflection' }>>;
  notes: ReadonlyMap<string, Exclude<NotesDecision, 'weeklyReflection'>>;
  taskProjects?: ReadonlyMap<string, string | null>;
}

/** Revisão de Foco, step 1: triage of what was left for it, with the same routine as the checkout. */
export async function resolveDeferred(ctx: AppContext, decisions: DeferredDecisions): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const day = toDayKey(ctx.clock.now());
    for (const [taskId, projectId] of decisions.taskProjects ?? []) await applyTaskProject(ctx, tx, taskId, projectId, day);
    for (const [taskId, decision] of decisions.tasks) await applyTaskDecision(ctx, tx, taskId, decision, day);
    for (const [sectionId, decision] of decisions.notes) {
      const section = await tx.sections.get(sectionId);
      if (section?.notesDestination === 'weeklyReflection') await applyNotesDecision(ctx, tx, section, decision, day);
    }
  });
}

/** Revisão de Foco, step 6: "melhores momentos" and "o que pode melhorar". Text only, so no event (ADR-004). */
export async function saveFocusTexts(ctx: AppContext, texts: { bestMoments: string; improvements: string }): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const review = await openReview(ctx, tx, 'focus');
    if (review.bestMoments === texts.bestMoments && review.improvements === texts.improvements) return;
    await tx.reflections.put({ ...review, ...texts, updatedAt: ctx.clock.now().toISOString() });
  });
}

/**
 * "Fechar revisão". `since` is when the previous review of the kind was closed (null for the
 * first), so the closed record says which days it covered. The metrics shown are kept in the
 * event as a snapshot, so the past report stays as it was seen.
 */
export async function closeReview(
  ctx: AppContext,
  kind: ReviewKind,
  since: string | null,
  metrics: WeeklyMetrics | DirectionMetrics,
): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const review = await openReview(ctx, tx, kind);
    const now = ctx.clock.now();
    const at = now.toISOString();
    const today = toDayKey(now);
    const closed: Reflection = {
      ...review,
      id: `${kind}:${ctx.ids.next()}`,
      start: since ? toDayKey(new Date(since)) : '',
      end: today,
      closedAt: at,
      updatedAt: at,
    };
    await tx.reflections.put(closed);
    await tx.reflections.delete(OPEN_REVIEW_ID[kind]);
    await record(ctx, tx, 'reflection.closed', 'reflection', closed.id, today, { kind, since, metrics });
  });
}

/** How many checkouts and Revisões de Foco make each review available. */
export function setReviewCadence(ctx: AppContext, cadence: Partial<ReviewCadence>): Promise<void> {
  return updateSettings(ctx, (current) => ({ reviewCadence: { ...current.reviewCadence, ...cadence } }));
}
