import { toDayKey } from '../domain/day';
import type { PriorityList } from '../domain/entities';
import { FOCUS_LIST_ID, recordedFocusProjects, withAddedProject, withRemovedProject, withSwappedProject } from '../domain/focusProjects';
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
  | { added: string; replaced?: string }
  | { removed: string; reason: 'removed' | 'finished' };

/** Saves the whole list. The event carries it too, which is the history the raio-x reads. */
async function save(ctx: AppContext, tx: StoreTransaction, itemIds: string[], change: Change) {
  const list: PriorityList = { id: FOCUS_LIST_ID, scope: 'focusProjects', period: '', itemIds, updatedAt: ctx.clock.now().toISOString() };
  await tx.priorities.put(list);
  const day = toDayKey(ctx.clock.now());
  if ('added' in change) {
    const replaced = change.replaced ? { replaced: change.replaced } : {};
    await record(ctx, tx, 'priority.added', 'priorities', FOCUS_LIST_ID, day, { projectId: change.added, itemIds, ...replaced });
  } else {
    await record(ctx, tx, 'priority.removed', 'priorities', FOCUS_LIST_ID, day, { projectId: change.removed, reason: change.reason, itemIds });
  }
}

/** "Colocar em foco": an active project takes a free slot. Returns whether it was added. */
export async function addFocusProject(ctx: AppContext, projectId: string): Promise<boolean> {
  return ctx.store.transaction(async (tx) => {
    if ((await tx.projects.get(projectId))?.status !== 'active') return false;
    const next = withAddedProject(await idsInFocus(tx), projectId);
    if (!next) return false;
    await save(ctx, tx, next, { added: projectId });
    return true;
  });
}

/** "Tirar do foco": frees the project's slot. Returns whether it was in the list. */
export async function removeFocusProject(ctx: AppContext, projectId: string): Promise<boolean> {
  return ctx.store.transaction(async (tx) => {
    const next = withRemovedProject(await idsInFocus(tx), projectId);
    if (!next) return false;
    await save(ctx, tx, next, { removed: projectId, reason: 'removed' });
    return true;
  });
}

/**
 * "Colocar em foco no lugar de": an active project takes the place of one in focus, in a single
 * change, so a full list can be swapped. Returns whether the list changed.
 */
export async function swapFocusProject(ctx: AppContext, outId: string, inId: string): Promise<boolean> {
  return ctx.store.transaction(async (tx) => {
    if ((await tx.projects.get(inId))?.status !== 'active') return false;
    const next = withSwappedProject(await idsInFocus(tx), outId, inId);
    if (!next) return false;
    await save(ctx, tx, next, { added: inId, replaced: outId });
    return true;
  });
}

/**
 * "Finalizar um projeto em foco tira o projeto da lista e libera a vaga". Reopening does not
 * bring it back.
 */
export async function releaseFocusProject(ctx: AppContext, tx: StoreTransaction, projectId: string): Promise<void> {
  const ids = recordedFocusProjects(await tx.priorities.get(FOCUS_LIST_ID));
  if (ids.includes(projectId)) await save(ctx, tx, ids.filter((id) => id !== projectId), { removed: projectId, reason: 'finished' });
}
