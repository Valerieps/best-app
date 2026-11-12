import { toDayKey, type DayKey } from '../domain/day';
import type { Block, PriorityList } from '../domain/entities';
import { QUEUE_LIST_ID, canQueue, recordedQueue, reorderedQueue, withQueued, withoutQueued } from '../domain/executionQueue';
import { record } from './events';
import type { AppContext, StoreTransaction } from './ports';

/** "Fila de execução" (spec/prioridades.md, ADR-068): the tasks I chose to do next, in my order. */

async function saveQueue(ctx: AppContext, tx: StoreTransaction, itemIds: string[]): Promise<void> {
  const list: PriorityList = { id: QUEUE_LIST_ID, scope: 'queue', period: '', itemIds, updatedAt: ctx.clock.now().toISOString() };
  await tx.priorities.put(list);
}

/** Adds an open task of mine to the end of the queue. A waiting or closed task is left out. */
export async function addToQueue(ctx: AppContext, taskId: string): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const task = await tx.blocks.get(taskId);
    if (!canQueue(task)) return;
    const itemIds = withQueued(recordedQueue(await tx.priorities.get(QUEUE_LIST_ID)), taskId);
    if (!itemIds) return;
    await saveQueue(ctx, tx, itemIds);
    await record(ctx, tx, 'priority.added', 'priorities', QUEUE_LIST_ID, toDayKey(ctx.clock.now()), { taskId, itemIds });
  });
}

/** "Remover da fila": the task stays as it was, only out of the queue. */
export async function removeFromQueue(ctx: AppContext, taskId: string): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const itemIds = withoutQueued(recordedQueue(await tx.priorities.get(QUEUE_LIST_ID)), taskId);
    if (!itemIds) return;
    await saveQueue(ctx, tx, itemIds);
    await record(ctx, tx, 'priority.removed', 'priorities', QUEUE_LIST_ID, toDayKey(ctx.clock.now()), { taskId, reason: 'removed', itemIds });
  });
}

/**
 * Puts the queue in the order shown after `movedId` was dragged. No event: the order is not
 * history (ADR-040); the next addition or removal carries the whole list.
 */
export async function reorderQueue(ctx: AppContext, shownIds: readonly string[], movedId: string): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const itemIds = reorderedQueue(recordedQueue(await tx.priorities.get(QUEUE_LIST_ID)), shownIds, movedId);
    if (itemIds) await saveQueue(ctx, tx, itemIds);
  });
}

/**
 * Takes a task out of the queue because it was finished or abandoned. Reopening the task does
 * not bring it back.
 */
export async function releaseFromQueue(
  ctx: AppContext,
  tx: StoreTransaction,
  task: Pick<Block, 'id'>,
  reason: 'finished' | 'abandoned',
  day?: DayKey,
): Promise<void> {
  const itemIds = withoutQueued(recordedQueue(await tx.priorities.get(QUEUE_LIST_ID)), task.id);
  if (!itemIds) return;
  await saveQueue(ctx, tx, itemIds);
  await record(ctx, tx, 'priority.removed', 'priorities', QUEUE_LIST_ID, day ?? toDayKey(ctx.clock.now()), { taskId: task.id, reason, itemIds });
}
