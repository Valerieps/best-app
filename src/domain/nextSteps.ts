import type { Block, PriorityList } from './entities';

/**
 * "Próximos passos" (spec/prioridades.md): up to 3 tasks of a project marked as the next things
 * to do in it. Each project has its own list in `priorities`, with id `next:<projectId>` (ADR-065).
 */

export const NEXT_STEP_LIMIT = 3;

const PREFIX = 'next:';

export function nextStepsListId(projectId: string): string {
  return `${PREFIX}${projectId}`;
}

/** Only an active task of a project can be a next step. */
export function canBeNextStep(task: Block | undefined): task is Block & { projectId: string } {
  return task !== undefined && task.kind === 'task' && task.status === 'active' && task.projectId !== null;
}

/** Ids as recorded, without repeats and at most 3: what was chosen, whatever happened later. */
export function recordedNextSteps(list: Pick<PriorityList, 'itemIds'> | undefined): string[] {
  return [...new Set(list?.itemIds ?? [])].slice(0, NEXT_STEP_LIMIT);
}

/**
 * The next steps as shown: only tasks still open and still in the project, in the order chosen.
 * Whatever left the project or closed by a path that did not release it (a merge, a deleted line)
 * simply does not show.
 */
export function nextStepIds(list: Pick<PriorityList, 'itemIds'> | undefined, tasks: readonly Block[], projectId: string): string[] {
  const valid = new Set(tasks.filter((task) => canBeNextStep(task) && task.projectId === projectId).map((task) => task.id));
  return recordedNextSteps(list).filter((id) => valid.has(id));
}

/**
 * Marking never blocks: when the 3 are taken, the new one takes the place of the third. Returns
 * the new list, or null when the task is already in it.
 */
export function withNextStep(ids: readonly string[], taskId: string): string[] | null {
  if (ids.includes(taskId)) return null;
  const kept = ids.length >= NEXT_STEP_LIMIT ? ids.slice(0, NEXT_STEP_LIMIT - 1) : ids;
  return [...kept, taskId];
}

/** Unmarking frees the place. Returns the new list, or null when the task is not in it. */
export function withoutNextStep(ids: readonly string[], taskId: string): string[] | null {
  return ids.includes(taskId) ? ids.filter((id) => id !== taskId) : null;
}
