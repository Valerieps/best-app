import { toDayKey } from '../domain/day';
import { listInEffect, priorityProjectsFrom, priorityProjectsListId, priorityProjectsRange, recordedPriorityProjects, withAddedProject, } from '../domain/priorityProjects';
import { weekOf } from '../domain/week';
import { record } from './events';
/** Section 2: "Projetos prioritários da semana" (ADR-035). */
function currentWeek(ctx) {
    return weekOf(toDayKey(ctx.clock.now())).key;
}
/** The ids in effect for `week`, carried over from an earlier week if needed, active projects only. */
async function idsInEffect(tx, week) {
    const lists = await tx.priorityListsBetween(...priorityProjectsRange(week));
    const ids = [];
    for (const id of recordedPriorityProjects(listInEffect(lists, week))) {
        if ((await tx.projects.get(id))?.status === 'active')
            ids.push(id);
    }
    return ids;
}
async function save(ctx, tx, week, itemIds, change) {
    const id = priorityProjectsListId(week);
    const list = { id, scope: 'weekProjects', period: week, itemIds, updatedAt: ctx.clock.now().toISOString() };
    await tx.priorities.put(list);
    const projectId = change.added ?? change.removed;
    await record(ctx, tx, change.added ? 'priority.added' : 'priority.removed', 'priorities', id, toDayKey(ctx.clock.now()), {
        projectId,
        week,
        itemIds,
    });
}
/** Lists that a reflection already defined for the weeks after `week`. */
async function laterLists(tx, week) {
    const own = priorityProjectsListId(week);
    return (await tx.priorityListsBetween(...priorityProjectsFrom(week))).filter((list) => list.id !== own);
}
/**
 * Outside the reflection a project only takes a free slot of the current week. If a reflection
 * already defined the next week, the project goes there too while it has a free slot, because
 * the list carries over (SPEC.md, "Projetos prioritários da semana"). Returns whether it was added.
 */
export async function addPriorityProject(ctx, projectId) {
    return ctx.store.transaction(async (tx) => {
        if ((await tx.projects.get(projectId))?.status !== 'active')
            return false;
        const week = currentWeek(ctx);
        const next = withAddedProject(await idsInEffect(tx, week), projectId);
        if (!next)
            return false;
        await save(ctx, tx, week, next, { added: projectId });
        for (const later of await laterLists(tx, week)) {
            const ids = await idsInEffect(tx, later.period);
            const added = withAddedProject(ids, projectId);
            if (added)
                await save(ctx, tx, later.period, added, { added: projectId });
        }
        return true;
    });
}
/**
 * Step 6 of the weekly reflection, where the list of `week` can change freely: `on` takes a free
 * slot, off frees one. Swapping is taking one out and putting another in.
 */
export async function setPriorityProjectInReflection(ctx, week, projectId, on) {
    await ctx.store.transaction(async (tx) => {
        const ids = await idsInEffect(tx, week);
        if (on) {
            if ((await tx.projects.get(projectId))?.status !== 'active')
                return;
            const next = withAddedProject(ids, projectId);
            if (next)
                await save(ctx, tx, week, next, { added: projectId });
        }
        else if (ids.includes(projectId)) {
            await save(ctx, tx, week, ids.filter((id) => id !== projectId), { removed: projectId });
        }
    });
}
/**
 * "Finalizar um projeto prioritário tira o projeto da lista e libera a vaga": from the current
 * week on, including a next week already defined. Reopening does not bring it back.
 */
export async function releasePriorityProject(ctx, tx, projectId) {
    const week = currentWeek(ctx);
    const weeks = [week, ...(await laterLists(tx, week)).map((list) => list.period)];
    for (const target of weeks) {
        const lists = await tx.priorityListsBetween(...priorityProjectsRange(target));
        const ids = recordedPriorityProjects(listInEffect(lists, target));
        if (ids.includes(projectId))
            await save(ctx, tx, target, ids.filter((id) => id !== projectId), { removed: projectId });
    }
}
