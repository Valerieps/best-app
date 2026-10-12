import { toDayKey } from '../domain/day';
import type { Reflection, Settings } from '../domain/entities';
import type { WeeklyMetrics } from '../domain/metrics';
import type { NotesDecision, TaskDecision } from '../domain/triage';
import type { WeekRange } from '../domain/week';
import { applyNotesDecision, applyTaskDecision, applyTaskProject } from './checkout';
import { record } from './events';
import type { AppContext, StoreTransaction } from './ports';
import { updateSettings } from './settings';

/** Weekly reflection use cases (spec/rituais.md). */

export function reflectionId(week: WeekRange): string {
  return `week:${week.key}`;
}

async function getOrCreate(ctx: AppContext, tx: StoreTransaction, week: WeekRange): Promise<Reflection> {
  const id = reflectionId(week);
  return (
    (await tx.reflections.get(id)) ?? {
      id,
      kind: 'week',
      period: week.key,
      start: week.start,
      end: week.end,
      bestMoments: '',
      improvements: '',
      closedAt: null,
      updatedAt: ctx.clock.now().toISOString(),
    }
  );
}

export interface DeferredDecisions {
  tasks: ReadonlyMap<string, Exclude<TaskDecision, { kind: 'reflection' }>>;
  notes: ReadonlyMap<string, Exclude<NotesDecision, 'weeklyReflection'>>;
  taskProjects?: ReadonlyMap<string, string | null>;
}

/** Step 1: triage of what was left for the reflection, with the same routine as the checkout. */
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

/** Step 5: "melhores momentos" and "o que pode melhorar". Text only, so no event (ADR-004). */
export async function saveReflectionTexts(
  ctx: AppContext,
  week: WeekRange,
  texts: { bestMoments: string; improvements: string },
): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const reflection = await getOrCreate(ctx, tx, week);
    if (reflection.bestMoments === texts.bestMoments && reflection.improvements === texts.improvements) return;
    await tx.reflections.put({ ...reflection, ...texts, updatedAt: ctx.clock.now().toISOString() });
  });
}

/** Step 7: "Fechar semana". The metrics shown are kept in the event as a snapshot. */
export async function closeWeek(ctx: AppContext, week: WeekRange, metrics: WeeklyMetrics): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const reflection = await getOrCreate(ctx, tx, week);
    const at = ctx.clock.now().toISOString();
    await tx.reflections.put({ ...reflection, closedAt: at, updatedAt: at });
    await record(ctx, tx, 'reflection.closed', 'reflection', reflection.id, toDayKey(ctx.clock.now()), {
      week: week.key,
      metrics,
    });
  });
}

export async function reopenWeek(ctx: AppContext, week: WeekRange): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const reflection = await tx.reflections.get(reflectionId(week));
    if (!reflection?.closedAt) return;
    await tx.reflections.put({ ...reflection, closedAt: null, updatedAt: ctx.clock.now().toISOString() });
  });
}

/** When the weekly reflection becomes available; null for "só quando eu abrir". */
export function setWeeklyReflectionSchedule(ctx: AppContext, schedule: Settings['weeklyReflection']): Promise<void> {
  return updateSettings(ctx, { weeklyReflection: schedule });
}