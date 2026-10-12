import { toDayKey } from '../domain/day';
import type { PriorityList } from '../domain/entities';
import {
  listInEffect,
  priorityProjectsFrom,
  priorityProjectsListId,
  priorityProjectsRange,
  recordedPriorityProjects,
  withAddedProject,
} from '../domain/priorityProjects';
import { weekOf, type WeekKey } from '../domain/week';
import { record } from './events';
import type { AppContext, StoreTransaction } from './ports';

/** Section 2: "Projetos prioritários da semana" (ADR-035). */

function currentWeek(ctx: AppContext): WeekKey {
  return weekOf(toDayKey(ctx.clock.now())).key;
}

/** The ids in effect for `week`, carried over from an earlier week if needed, active projects only. */
async function idsInEffect(tx: StoreTransaction, week: WeekKey): Promise<string[]> {
  const lists = await tx.priorityListsBetween(...priorityProjectsRange(week));
  const ids: string[] = [];
  for (const id of recordedPriorityProjects(listInEffect(lists, week))) {
    if ((await tx.projects.get(id))?.status === 'active') ids.push(id);
  }
  return ids;
}

async function save(ctx: AppContext, tx: StoreTransaction, week: WeekKey, itemIds: string[], change: { added?: string; removed?: string }) {
  const id = priorityProjectsListId(week);
  const list: PriorityList = { id, scope: 'weekProjects', period: week, itemIds, updatedAt: ctx.clock.now().toISOString() };
  await tx.priorities.put(list);
  const projectId = change.added ?? change.removed;
  await record(ctx, tx, change.added ? 'priority.added' : 'priority.removed', 'priorities', id, toDayKey(ctx.clock.now()), {
    projectId,
    week,
    itemIds,
  });
}

/** Lists that a reflection already defined for the weeks after `week`. */
async function laterLists(tx: StoreTransaction, week: WeekKey): Promise<PriorityList[]> {
  const own = priorityProjectsListId(week);
  return (await tx.priorityListsBetween(...priorityProjectsFrom(week))).filter((list) => list.id !== own);
}

/**
 * Outside the reflection a project only takes a free slot of the current week. If a reflection
 * already defined the next week, the project goes there too while it has a free slot, because
 * the list carries over (SPEC.md, "Projetos prioritários da semana"). Returns whether it was added.
 */
export async function addPriorityProject(ctx: AppContext, projectId: string): Promise<boolean> {
  return ctx.store.transaction(async (tx) => {
    if ((await tx.projects.get(projectId))?.status !== 'active') return false;
    const week = currentWeek(ctx);
    const next = withAddedProject(await idsInEffect(tx, week), projectId);
    if (!next) return false;
    await save(ctx, tx, week, next, { added: projectId });
    for (const later of await laterLists(tx, week)) {
      const ids = await idsInEffect(tx, later.period);
      const added = withAddedProject(ids, projectId);
      if (added) await save(ctx, tx, later.period, added, { added: projectId });
    }
    return true;
  });
}

/**
 * Step 6 of the weekly reflection, where the list of `week` can change freely: `on` takes a free
 * slot, off frees one. Swapping is taking one out and putting another in.
 */
export async function setPriorityProjectInReflection(ctx: AppContext, week: WeekKey, projectId: string, on: boolean): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const ids = await idsInEffect(tx, week);
    if (on) {
      if ((await tx.projects.get(projectId))?.status !== 'active') return;
      const next = withAddedProject(ids, projectId);
      if (next) await save(ctx, tx, week, next, { added: projectId });
    } else if (ids.includes(projectId)) {
      await save(ctx, tx, week, ids.filter((id) => id !== projectId), { removed: projectId });
    }
  });
}

/**
 * "Finalizar um projeto prioritário tira o projeto da lista e libera a vaga": from the current
 * week on, including a next week already defined. Reopening does not bring it back.
 */
export async function releasePriorityProject(ctx: AppContext, tx: StoreTransaction, projectId: string): Promise<void> {
  const week = currentWeek(ctx);
  const weeks = [week, ...(await laterLists(tx, week)).map((list) => list.period)];
  for (const target of weeks) {
    const lists = await tx.priorityListsBetween(...priorityProjectsRange(target));
    const ids = recordedPriorityProjects(listInEffect(lists, target));
    if (ids.includes(projectId)) await save(ctx, tx, target, ids.filter((id) => id !== projectId), { removed: projectId });
  }
}
