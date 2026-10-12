import { detectKind } from '../domain/blockKind';
import { toDayKey } from '../domain/day';
import { canEditFreely, lastTriagedDayAfterReopen } from '../domain/tasks';
import { record } from './events';
import { addProject } from './projects';
/** Use cases of the day note: sections, blocks and checking tasks off. */
function today(ctx) {
    return toDayKey(ctx.clock.now());
}
function nowIso(ctx) {
    return ctx.clock.now().toISOString();
}
async function getOrThrow(promise, what) {
    const value = await promise;
    if (value === undefined)
        throw new Error(`${what} not found`);
    return value;
}
async function addSection(ctx, tx, kind, id) {
    const at = nowIso(ctx);
    const section = {
        id: id ?? ctx.ids.next(),
        kind,
        day: today(ctx),
        createdAt: at,
        updatedAt: at,
        title: null,
        projectId: null,
        notesDestination: 'pending',
        whiteboardDecision: 'pending',
    };
    await tx.sections.put(section);
    await record(ctx, tx, 'section.created', 'section', section.id, section.day, { kind });
    return section;
}
export function createSection(ctx, kind) {
    return ctx.store.transaction((tx) => addSection(ctx, tx, kind));
}
export async function setSectionTitle(ctx, sectionId, title) {
    const next = title.trim() || null;
    await ctx.store.transaction(async (tx) => {
        const section = await getOrThrow(tx.sections.get(sectionId), 'Section');
        if (section.title === next)
            return;
        await tx.sections.put({ ...section, title: next, updatedAt: nowIso(ctx) });
        await record(ctx, tx, 'section.titleChanged', 'section', section.id, section.day, { from: section.title, to: next });
    });
}
/** Links a section to a project; its tasks are linked too. Exported for the checkout. */
export async function linkSection(ctx, tx, section, projectId, day) {
    const at = nowIso(ctx);
    const linked = { ...section, projectId, updatedAt: at };
    await tx.sections.put(linked);
    await record(ctx, tx, 'section.linkedToProject', 'section', section.id, day, { projectId });
    for (const block of await tx.blocksInSection(section.id)) {
        if (block.kind !== 'task' || block.projectId === projectId)
            continue;
        await tx.blocks.put({ ...block, projectId, updatedAt: at });
        await record(ctx, tx, 'block.linkedToProject', 'block', block.id, day, { projectId });
    }
    return linked;
}
export async function linkSectionToProject(ctx, sectionId, projectId) {
    await ctx.store.transaction(async (tx) => {
        const section = await getOrThrow(tx.sections.get(sectionId), 'Section');
        await getOrThrow(tx.projects.get(projectId), 'Project');
        await linkSection(ctx, tx, section, projectId, today(ctx));
    });
}
/** Turns a whiteboard section into a new project named `name`. */
export async function convertSectionToProject(ctx, sectionId, name) {
    await ctx.store.transaction(async (tx) => {
        const section = await getOrThrow(tx.sections.get(sectionId), 'Section');
        const project = await addProject(ctx, tx, name);
        let titled = section;
        if (!section.title) {
            titled = { ...section, title: project.name };
            await record(ctx, tx, 'section.titleChanged', 'section', section.id, section.day, { from: null, to: project.name });
        }
        await linkSection(ctx, tx, titled, project.id, today(ctx));
    });
}
/**
 * Adding a note to a section whose notes were already triaged makes them pending again:
 * items added after the checkout need a destination too.
 */
async function reopenNotesIfTriaged(ctx, tx, section) {
    if (section.notesDestination === 'pending')
        return;
    await tx.sections.put({ ...section, notesDestination: 'pending', updatedAt: nowIso(ctx) });
    await record(ctx, tx, 'section.notesReopened', 'section', section.id, today(ctx), { from: section.notesDestination });
}
function newBlock(ctx, section, kind, text, position, id) {
    const at = nowIso(ctx);
    return {
        id: id ?? ctx.ids.next(),
        kind,
        text,
        sectionId: section.id,
        position,
        projectId: kind === 'task' ? section.projectId : null,
        createdAt: at,
        updatedAt: at,
        status: kind === 'task' ? 'active' : null,
        intendedDate: null,
        firstIntendedDate: null,
        postponeCount: 0,
        closedAt: null,
        lastTriagedDay: null,
    };
}
async function addBlock(ctx, tx, section, kind, text, position, id) {
    const block = newBlock(ctx, section, kind, text, position, id);
    await tx.blocks.put(block);
    await record(ctx, tx, 'block.created', 'block', block.id, today(ctx), { kind, sectionId: section.id });
    if (kind === 'note')
        await reopenNotesIfTriaged(ctx, tx, section);
    return block;
}
async function targetSection(ctx, tx, target) {
    return target.sectionId
        ? getOrThrow(tx.sections.get(target.sectionId), 'Section')
        : addSection(ctx, tx, 'general', target.newSectionId);
}
/** Creates a block from typed text; "[] " at the start makes it a task. */
export async function createBlock(ctx, target, typed) {
    const { kind, text } = detectKind(typed);
    return ctx.store.transaction(async (tx) => {
        const section = await targetSection(ctx, tx, target);
        return addBlock(ctx, tx, section, kind, text, target.position, target.blockId);
    });
}
/** Saves typed text. Plain text edits do not go into the event history (ADR-004). */
export async function updateBlockText(ctx, blockId, text) {
    await ctx.store.transaction(async (tx) => {
        const block = await tx.blocks.get(blockId);
        if (!block || block.text === text)
            return;
        await tx.blocks.put({ ...block, text, updatedAt: nowIso(ctx) });
    });
}
/** Kind of the line Enter creates: a task line starts another task, like a checklist. */
export function splitKind(currentKind, textAfterCaret) {
    const detected = detectKind(textAfterCaret).kind;
    return detected === 'note' && currentKind === 'task' ? 'task' : detected;
}
/** Enter: the text before the caret stays, the rest goes to a new block. */
export async function splitBlock(ctx, blockId, fullText, caret, target) {
    return ctx.store.transaction(async (tx) => {
        const block = await getOrThrow(tx.blocks.get(blockId), 'Block');
        const before = fullText.slice(0, caret);
        const after = fullText.slice(caret);
        if (block.text !== before)
            await tx.blocks.put({ ...block, text: before, updatedAt: nowIso(ctx) });
        const section = await targetSection(ctx, tx, target);
        const kind = splitKind(block.kind, after);
        return addBlock(ctx, tx, section, kind, detectKind(after).text, target.position, target.blockId);
    });
}
async function requireFreeBlock(ctx, tx, blockId) {
    const block = await getOrThrow(tx.blocks.get(blockId), 'Block');
    const section = await tx.sections.get(block.sectionId);
    if (!canEditFreely(block, section, today(ctx))) {
        throw new Error('Only untriaged blocks written today can be deleted or change kind');
    }
    return { block, section: section };
}
/** Changes a block between task and note. Only for untriaged blocks written today. */
export async function changeBlockKind(ctx, blockId, kind, text) {
    await ctx.store.transaction(async (tx) => {
        const { block, section } = await requireFreeBlock(ctx, tx, blockId);
        if (block.kind === kind) {
            if (block.text !== text)
                await tx.blocks.put({ ...block, text, updatedAt: nowIso(ctx) });
            return;
        }
        const changed = {
            ...block,
            kind,
            text,
            status: kind === 'task' ? 'active' : null,
            projectId: kind === 'task' ? section.projectId : null,
            updatedAt: nowIso(ctx),
        };
        await tx.blocks.put(changed);
        await record(ctx, tx, 'block.kindChanged', 'block', block.id, today(ctx), { from: block.kind, to: kind });
        if (kind === 'note')
            await reopenNotesIfTriaged(ctx, tx, section);
    });
}
/** Deletes a line, as in a text editor. Only for untriaged blocks written today. */
export async function deleteBlock(ctx, blockId) {
    await ctx.store.transaction(async (tx) => {
        const { block } = await requireFreeBlock(ctx, tx, blockId);
        await tx.blocks.delete(block.id);
        await record(ctx, tx, 'block.deleted', 'block', block.id, today(ctx), { kind: block.kind, text: block.text });
    });
}
/** Backspace at the start of a line: appends its text to the previous block and deletes it. */
export async function mergeIntoPrevious(ctx, blockId, fullText, previousId) {
    await ctx.store.transaction(async (tx) => {
        const { block } = await requireFreeBlock(ctx, tx, blockId);
        const previous = await getOrThrow(tx.blocks.get(previousId), 'Block');
        await tx.blocks.put({ ...previous, text: previous.text + fullText, updatedAt: nowIso(ctx) });
        await tx.blocks.delete(block.id);
        await record(ctx, tx, 'block.deleted', 'block', block.id, today(ctx), { kind: block.kind, mergedInto: previousId });
    });
}
/** Finishes a task: "eu engajei com a tarefa". The event is the execution log. */
export async function finishTaskIn(ctx, tx, task, day) {
    const finished = { ...task, status: 'done', closedAt: nowIso(ctx), updatedAt: nowIso(ctx) };
    await tx.blocks.put(finished);
    await record(ctx, tx, 'task.finished', 'block', task.id, day, {
        intendedDate: task.intendedDate,
        firstIntendedDate: task.firstIntendedDate,
        postponeCount: task.postponeCount,
        projectId: task.projectId,
    });
    return finished;
}
export async function reopenTaskIn(ctx, tx, task) {
    const reopened = {
        ...task,
        status: 'active',
        closedAt: null,
        lastTriagedDay: lastTriagedDayAfterReopen(task.lastTriagedDay, today(ctx)),
        updatedAt: nowIso(ctx),
    };
    await tx.blocks.put(reopened);
    await record(ctx, tx, 'task.reopened', 'block', task.id, today(ctx));
    return reopened;
}
export async function setTaskDone(ctx, taskId, done) {
    await ctx.store.transaction(async (tx) => {
        const task = await getOrThrow(tx.blocks.get(taskId), 'Task');
        if (task.kind !== 'task')
            throw new Error('Only tasks can be finished');
        if (done && task.status === 'active')
            await finishTaskIn(ctx, tx, task, today(ctx));
        if (!done && task.status === 'done')
            await reopenTaskIn(ctx, tx, task);
    });
}
/** Brings an archived task back to the active list, without a date. */
export async function reactivateTask(ctx, taskId) {
    await ctx.store.transaction(async (tx) => {
        const task = await getOrThrow(tx.blocks.get(taskId), 'Task');
        if (task.status !== 'archived')
            return;
        await tx.blocks.put({ ...task, status: 'active', closedAt: null, intendedDate: null, updatedAt: nowIso(ctx) });
        await record(ctx, tx, 'task.reactivated', 'block', task.id, today(ctx), { previousIntendedDate: task.intendedDate });
    });
}
