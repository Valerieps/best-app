import { toDayKey } from '../domain/day';
import { record } from './events';
import { linkSection } from './notebook';
import { addProject } from './projects';
/** Use cases of the cleanup assistants (ASSISTENTES.md). Nothing here deletes data. */
function today(ctx) {
    return toDayKey(ctx.clock.now());
}
/** Converts, links or keeps a group of whiteboard sections with the same title. */
export async function resolveWhiteboardGroup(ctx, sectionIds, action) {
    await ctx.store.transaction(async (tx) => {
        const day = today(ctx);
        let projectId = null;
        if (action.kind === 'convert')
            projectId = (await addProject(ctx, tx, action.name)).id;
        if (action.kind === 'link')
            projectId = action.projectId;
        for (const sectionId of sectionIds) {
            const section = await tx.sections.get(sectionId);
            if (!section || section.projectId !== null)
                continue;
            if (projectId) {
                await linkSection(ctx, tx, section, projectId, day);
            }
            else {
                await tx.sections.put({ ...section, whiteboardDecision: 'keptUnlinked', updatedAt: ctx.clock.now().toISOString() });
                await record(ctx, tx, 'section.keptUnlinked', 'section', section.id, day);
            }
        }
    });
}
/** Joins duplicate projects into `keepId`: their sections and tasks move, and they are marked merged. */
export async function mergeProjects(ctx, keepId, mergeIds) {
    await ctx.store.transaction(async (tx) => {
        const day = today(ctx);
        const at = ctx.clock.now().toISOString();
        if (!(await tx.projects.get(keepId)))
            throw new Error('Project to keep not found');
        for (const id of mergeIds) {
            if (id === keepId)
                continue;
            const project = await tx.projects.get(id);
            if (!project || project.status === 'merged')
                continue;
            for (const section of await tx.sectionsOfProject(id)) {
                await tx.sections.put({ ...section, projectId: keepId, updatedAt: at });
                await record(ctx, tx, 'section.linkedToProject', 'section', section.id, day, { projectId: keepId, mergedFrom: id });
            }
            for (const block of await tx.blocksOfProject(id)) {
                await tx.blocks.put({ ...block, projectId: keepId, updatedAt: at });
                await record(ctx, tx, 'block.linkedToProject', 'block', block.id, day, { projectId: keepId, mergedFrom: id });
            }
            await tx.projects.put({ ...project, status: 'merged', mergedInto: keepId, updatedAt: at });
            await record(ctx, tx, 'project.merged', 'project', id, day, { into: keepId });
        }
    });
}
/** "Manter separados": the duplicates assistant stops suggesting these projects together. */
export async function keepProjectsSeparate(ctx, projectIds) {
    await ctx.store.transaction(async (tx) => {
        for (const id of projectIds) {
            const project = await tx.projects.get(id);
            if (!project)
                continue;
            const others = projectIds.filter((other) => other !== id);
            const keepSeparateFrom = [...new Set([...(project.keepSeparateFrom ?? []), ...others])];
            await tx.projects.put({ ...project, keepSeparateFrom, updatedAt: ctx.clock.now().toISOString() });
        }
    });
}
