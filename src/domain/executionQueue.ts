import type { Block, PriorityList } from './entities';

/**
 * "Fila de execução" (spec/prioridades.md): the tasks I chose to do next, in the order I added
 * them, which I can change by hand. One list in `priorities`, id `queue` (ADR-069). It holds
 * until I change it: days passing do not empty it.
 */

export const QUEUE_LIST_ID = 'queue';

/** Only an open task that is mine to do can be in the queue: not a waiting one. */
export function canQueue(task: Block | undefined): task is Block {
  return task !== undefined && task.kind === 'task' && task.status === 'active' && !task.waiting;
}

/** Ids as recorded, without repeats: what was chosen, whatever happened later. */
export function recordedQueue(list: Pick<PriorityList, 'itemIds'> | undefined): string[] {
  return [...new Set(list?.itemIds ?? [])];
}

/**
 * The queue as shown: only tasks that can still be in it, in the order chosen. A task closed by
 * a path that did not release it (a merge, a deleted line) or turned waiting simply does not show.
 */
export function queueIds(list: Pick<PriorityList, 'itemIds'> | undefined, tasks: readonly Block[]): string[] {
  const valid = new Set(tasks.filter(canQueue).map((task) => task.id));
  return recordedQueue(list).filter((id) => valid.has(id));
}

/** Adding puts the task at the end. Returns the new list, or null when it is already there. */
export function withQueued(ids: readonly string[], taskId: string): string[] | null {
  return ids.includes(taskId) ? null : [...ids, taskId];
}

/** Returns the new list, or null when the task is not in it. */
export function withoutQueued(ids: readonly string[], taskId: string): string[] | null {
  return ids.includes(taskId) ? ids.filter((id) => id !== taskId) : null;
}

/**
 * Puts the queue in the order shown after a drag. `shown` is the order on screen, which may lack
 * recorded ids no longer valid; those keep their place relative to the others. Null when nothing
 * changes or `movedId` is not in the queue.
 */
export function reorderedQueue(recorded: readonly string[], shown: readonly string[], movedId: string): string[] | null {
  if (!recorded.includes(movedId) || !shown.includes(movedId)) return null;
  const without = shown.filter((id) => id !== movedId);
  const at = shown.indexOf(movedId);
  // Insert right after the shown item that now precedes it, or before the first shown item.
  const before = at > 0 ? without[at - 1] : null;
  const rest = recorded.filter((id) => id !== movedId);
  let toIndex: number;
  if (before !== null && rest.includes(before)) toIndex = rest.indexOf(before) + 1;
  else {
    const after = without[at] ?? null;
    toIndex = after !== null && rest.includes(after) ? rest.indexOf(after) : rest.length;
  }
  const next = [...rest.slice(0, toIndex), movedId, ...rest.slice(toIndex)];
  return next.join() === recorded.join() ? null : next;
}
