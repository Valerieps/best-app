import { toDayKey, type DayKey } from '../domain/day';
import type { Block, PriorityList } from '../domain/entities';
import { canBeNextStep, nextStepsListId, recordedNextSteps, withNextStep, withoutNextStep } from '../domain/nextSteps';
import { record } from './events';
import type { AppContext, StoreTransaction } from './ports';

/** "Próximos passos" (spec/prioridades.md, ADR-065): up to 3 tasks per project. */

type RemovalReason = 'removed' | 'finished' | 'abandoned' | 'moved';

async function saveList(ctx: AppContext, tx: StoreTransaction, projectId: string, itemIds: string[]): Promise<void> {
  const list: PriorityList = { id: nextStepsListId(projectId), scope: 'nextSteps', period: '', itemIds, updatedAt: ctx.clock.now().toISOString() };
  await tx.priorities.put(list);
}

/**
 * Marks or unmarks "Próximo" on an open task of a project. Marking a fourth takes the place of
 * the third. A task without a project, or no longer open, cannot be marked. Never touches the
 * task's date.
 */
export async function setNextStep(ctx: AppContext, taskId: string, on: boolean): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const task = await tx.blocks.get(taskId);
    if (!task) return;
    const listId = task.projectId ? nextStepsListId(task.projectId) : null;
    if (!listId || !task.projectId) return;
    const day = toDayKey(ctx.clock.now());
    const recorded = recordedNextSteps(await tx.priorities.get(listId));
    if (!on) {
      const itemIds = withoutNextStep(recorded, taskId);
      if (!itemIds) return;
      await saveList(ctx, tx, task.projectId, itemIds);
      await record(ctx, tx, 'priority.removed', 'priorities', listId, day, { taskId, projectId: task.projectId, reason: 'removed', itemIds });
      return;
    }
    if (!canBeNextStep(task)) return;
    // Places held by tasks that are no longer valid are dropped on the way, so they never cost a slot.
    const open: string[] = [];
    for (const id of recorded) {
      const other = await tx.blocks.get(id);
      if (canBeNextStep(other) && other.projectId === task.projectId) open.push(id);
    }
    const itemIds = withNextStep(open, taskId);
    if (!itemIds) return;
    const replaced = open.length >= 3 ? { replaced: open[2] } : {};
    await saveList(ctx, tx, task.projectId, itemIds);
    await record(ctx, tx, 'priority.added', 'priorities', listId, day, { taskId, projectId: task.projectId, itemIds, ...replaced });
  });
}

/**
 * Takes a task out of its project's next steps because it was finished or abandoned, or because
 * it leaves the project. Call it with the task as it was before the change. The app does not
 * ask for another step. Reopening a task does not bring it back.
 */
export async function releaseNextStep(ctx: AppContext, tx: StoreTransaction, task: Pick<Block, 'id' | 'projectId'>, reason: Exclude<RemovalReason, 'removed'>, day?: DayKey): Promise<void> {
  if (!task.projectId) return;
  const listId = nextStepsListId(task.projectId);
  const itemIds = withoutNextStep(recordedNextSteps(await tx.priorities.get(listId)), task.id);
  if (!itemIds) return;
  await saveList(ctx, tx, task.projectId, itemIds);
  await record(ctx, tx, 'priority.removed', 'priorities', listId, day ?? toDayKey(ctx.clock.now()), { taskId: task.id, projectId: task.projectId, reason, itemIds });
}
