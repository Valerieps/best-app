import { toDayKey } from '../domain/day';
import type { PriorityList } from '../domain/entities';
import { FOCUS_LIST_ID, recordedFocusProjects, withAddedProject, withRemovedProject } from '../domain/focusProjects';
import { record } from './events';
import type { AppContext, StoreTransaction } from './ports';

/** Section 2: "Projetos em foco" (spec/prioridades.md). */

/** The ids in focus, active projects only. */
async function idsInFocus(tx: StoreTransaction): Promise<string[]> {
  const ids: string[] = [];
  for (const id of recordedFocusProjects(await tx.priorities.get(FOCUS_LIST_ID))) {
    if ((await tx.projects.get(id))?.status === 'active') ids.push(id);
  }
  return ids;
}

type Change =
  | { added: string }
  | { removed: string; reason: 'removed' | 'finished' | 'backlog' };

/** Saves the whole list. The event carries it too, which is the history of the list. */
async function save(ctx: AppContext, tx: StoreTransaction, itemIds: string[], change: Change) {
  const list: PriorityList = { id: FOCUS_LIST_ID, scope: 'focusProjects', period: '', itemIds, updatedAt: ctx.clock.now().toISOString() };
  await tx.priorities.put(list);
  const day = toDayKey(ctx.clock.now());
  if ('added' in change) {
    await record(ctx, tx, 'priority.added', 'priorities', FOCUS_LIST_ID, day, { projectId: change.added, itemIds });
  } else {
    await record(ctx, tx, 'priority.removed', 'priorities', FOCUS_LIST_ID, day, { projectId: change.removed, reason: change.reason, itemIds });
  }
}

/** "Colocar em foco": an active project joins the list. Returns whether it was added. */
export async function addFocusProject(ctx: AppContext, projectId: string): Promise<boolean> {
  return ctx.store.transaction((tx) => addFocusProjectIn(ctx, tx, projectId));
}

/** "Colocar em foco" inside a transaction. */
export async function addFocusProjectIn(ctx: AppContext, tx: StoreTransaction, projectId: string): Promise<boolean> {
  if ((await tx.projects.get(projectId))?.status !== 'active') return false;
  const next = withAddedProject(await idsInFocus(tx), projectId);
  if (!next) return false;
  await save(ctx, tx, next, { added: projectId });
  return true;
}

/** "Tirar do foco": takes the project out of the list. Returns whether it was in the list. */
export async function removeFocusProject(ctx: AppContext, projectId: string): Promise<boolean> {
  return ctx.store.transaction((tx) => removeFocusProjectIn(ctx, tx, projectId));
}

/** "Tirar do foco" inside a transaction. */
export async function removeFocusProjectIn(ctx: AppContext, tx: StoreTransaction, projectId: string): Promise<boolean> {
  const next = withRemovedProject(await idsInFocus(tx), projectId);
  if (!next) return false;
  await save(ctx, tx, next, { removed: projectId, reason: 'removed' });
  return true;
}

/**
 * "Finalizar um projeto em foco tira o projeto da lista". Reopening does not
 * bring it back.
 */
export async function releaseFocusProject(
  ctx: AppContext,
  tx: StoreTransaction,
  projectId: string,
  reason: 'finished' | 'backlog' = 'finished',
): Promise<void> {
  const ids = recordedFocusProjects(await tx.priorities.get(FOCUS_LIST_ID));
  if (ids.includes(projectId)) await save(ctx, tx, ids.filter((id) => id !== projectId), { removed: projectId, reason });
}

/** A deleted project leaves the list without a trace: no event, as its history is erased too. */
export async function forgetFocusProject(ctx: AppContext, tx: StoreTransaction, projectId: string): Promise<void> {
  const list = await tx.priorities.get(FOCUS_LIST_ID);
  if (!list?.itemIds.includes(projectId)) return;
  await tx.priorities.put({ ...list, itemIds: list.itemIds.filter((id) => id !== projectId), updatedAt: ctx.clock.now().toISOString() });
}
