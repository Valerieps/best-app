import { toDayKey } from '../domain/day';
import type { PriorityList } from '../domain/entities';
import { FOCUS_LIST_ID, recordedFocusProjects, withAddedProject } from '../domain/focusProjects';
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

type Change = { added: string } | { removed: string; reason: 'review' | 'finished' };

/** Saves the whole list. The event carries it too, which is the history the raio-x reads. */
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

/** Outside the review a project only takes a free slot. Returns whether it was added. */
export async function addFocusProject(ctx: AppContext, projectId: string): Promise<boolean> {
  return ctx.store.transaction(async (tx) => {
    if ((await tx.projects.get(projectId))?.status !== 'active') return false;
    const next = withAddedProject(await idsInFocus(tx), projectId);
    if (!next) return false;
    await save(ctx, tx, next, { added: projectId });
    return true;
  });
}

/**
 * In the Revisão de Foco the list can change freely: `on` takes a free slot, off frees one.
 * Swapping is taking one out and putting another in.
 */
export async function setFocusProjectInReview(ctx: AppContext, projectId: string, on: boolean): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const ids = await idsInFocus(tx);
    if (on) {
      if ((await tx.projects.get(projectId))?.status !== 'active') return;
      const next = withAddedProject(ids, projectId);
      if (next) await save(ctx, tx, next, { added: projectId });
    } else if (ids.includes(projectId)) {
      await save(ctx, tx, ids.filter((id) => id !== projectId), { removed: projectId, reason: 'review' });
    }
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
