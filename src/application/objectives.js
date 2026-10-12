import { toDayKey } from '../domain/day';
import { record } from './events';
/** Section 4: objectives, resources and the monthly reflection. */
function today(ctx) {
    return toDayKey(ctx.clock.now());
}
function nowIso(ctx) {
    return ctx.clock.now().toISOString();
}
async function addObjective(ctx, tx, goal, motivation) {
    const at = nowIso(ctx);
    const objective = {
        id: ctx.ids.next(),
        goal: goal.trim(),
        motivation: motivation.trim(),
        status: 'active',
        achieved: null,
        createdAt: at,
        updatedAt: at,
        finishedAt: null,
    };
    await tx.objectives.put(objective);
    await record(ctx, tx, 'objective.created', 'objective', objective.id, today(ctx), { goal: objective.goal });
    return objective;
}
export function createObjective(ctx, goal, motivation = '') {
    if (!goal.trim())
        throw new Error('The goal must not be empty');
    return ctx.store.transaction((tx) => addObjective(ctx, tx, goal, motivation));
}
async function linkProject(ctx, tx, projectId, objectiveId) {
    const project = await tx.projects.get(projectId);
    if (!project || (project.objectiveId ?? null) === objectiveId)
        return;
    await tx.projects.put({ ...project, objectiveId, updatedAt: nowIso(ctx) });
    await record(ctx, tx, 'project.linkedToObjective', 'project', project.id, today(ctx), { objectiveId });
}
/** A project belongs to at most one objective; null unlinks it. */
export async function linkProjectToObjective(ctx, projectId, objectiveId) {
    await ctx.store.transaction((tx) => linkProject(ctx, tx, projectId, objectiveId));
}
/** "O app sugere objetivos a partir dos projetos que já existem": the project's name starts the goal. */
export async function createObjectiveFromProject(ctx, projectId) {
    return ctx.store.transaction(async (tx) => {
        const project = await tx.projects.get(projectId);
        if (!project)
            return null;
        const objective = await addObjective(ctx, tx, project.name, '');
        await linkProject(ctx, tx, project.id, objective.id);
        return objective;
    });
}
export async function updateObjective(ctx, id, fields) {
    const goal = fields.goal.trim();
    const motivation = fields.motivation.trim();
    if (!goal)
        return;
    await ctx.store.transaction(async (tx) => {
        const objective = await tx.objectives.get(id);
        if (!objective || (objective.goal === goal && objective.motivation === motivation))
            return;
        await tx.objectives.put({ ...objective, goal, motivation, updatedAt: nowIso(ctx) });
        await record(ctx, tx, 'objective.updated', 'objective', id, today(ctx), { goal, motivation });
    });
}
/** Objectives are only finished by hand; the user says whether the goal was reached. */
export async function finishObjective(ctx, id, achieved) {
    await ctx.store.transaction(async (tx) => {
        const objective = await tx.objectives.get(id);
        if (!objective || objective.status === 'finished')
            return;
        const at = nowIso(ctx);
        await tx.objectives.put({ ...objective, status: 'finished', achieved, finishedAt: at, updatedAt: at });
        await record(ctx, tx, 'objective.finished', 'objective', id, today(ctx), { achieved });
    });
}
export async function reopenObjective(ctx, id) {
    await ctx.store.transaction(async (tx) => {
        const objective = await tx.objectives.get(id);
        if (!objective || objective.status === 'active')
            return;
        await tx.objectives.put({ ...objective, status: 'active', achieved: null, finishedAt: null, updatedAt: nowIso(ctx) });
        await record(ctx, tx, 'objective.reopened', 'objective', id, today(ctx));
    });
}
/** Adds a resource inside a transaction: the notes of a section, or a link. */
export async function addResourceIn(ctx, tx, owner, content) {
    const resource = {
        id: ctx.ids.next(),
        ownerType: owner.ownerType,
        ownerId: owner.ownerId,
        sectionId: content.sectionId ?? null,
        url: content.url?.trim() || null,
        title: content.title.trim(),
        createdAt: nowIso(ctx),
    };
    await tx.resources.put(resource);
    await record(ctx, tx, 'resource.added', 'resource', resource.id, today(ctx), {
        ownerType: resource.ownerType,
        ownerId: resource.ownerId,
        sectionId: resource.sectionId,
    });
    return resource;
}
export function addLinkResource(ctx, owner, url, title) {
    return ctx.store.transaction((tx) => addResourceIn(ctx, tx, owner, { url, title: title || url }));
}
/** A link's title starts as its domain and can be changed later. Empty titles are ignored. */
export async function renameResource(ctx, resourceId, title) {
    const trimmed = title.trim();
    if (!trimmed)
        return;
    await ctx.store.transaction(async (tx) => {
        const resource = await tx.resources.get(resourceId);
        if (!resource || resource.title === trimmed)
            return;
        await tx.resources.put({ ...resource, title: trimmed });
        await record(ctx, tx, 'resource.renamed', 'resource', resourceId, today(ctx), { from: resource.title, to: trimmed });
    });
}
export async function removeResource(ctx, resourceId) {
    await ctx.store.transaction(async (tx) => {
        const resource = await tx.resources.get(resourceId);
        if (!resource)
            return;
        await tx.resources.delete(resourceId);
        await record(ctx, tx, 'resource.removed', 'resource', resourceId, today(ctx), { ownerId: resource.ownerId });
    });
}
/** Closes the monthly reflection, keeping the metrics shown as a snapshot. */
export async function closeMonth(ctx, month, metrics) {
    await ctx.store.transaction(async (tx) => {
        const id = `month:${month.key}`;
        const at = nowIso(ctx);
        const current = (await tx.reflections.get(id)) ?? {
            id,
            kind: 'month',
            period: month.key,
            start: month.start,
            end: month.end,
            bestMoments: '',
            improvements: '',
            closedAt: null,
            updatedAt: at,
        };
        await tx.reflections.put({ ...current, closedAt: at, updatedAt: at });
        await record(ctx, tx, 'reflection.closed', 'reflection', id, today(ctx), { month: month.key, metrics });
    });
}
