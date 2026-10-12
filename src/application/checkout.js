import { toDayKey } from '../domain/day';
import { record } from './events';
import { addHabitIn } from './habits';
import { moveIntendedDate } from './intendedDate';
import { addResourceIn } from './objectives';
import { finishTaskIn, linkSection, reopenTaskIn } from './notebook';
import { addProject } from './projects';
function nowIso(ctx) {
    return ctx.clock.now().toISOString();
}
function laterOf(a, b) {
    return a !== null && a > b ? a : b;
}
/** Applies one task decision inside a transaction. Shared by the checkout and the weekly reflection. */
export async function applyTaskDecision(ctx, tx, taskId, decision, day) {
    let task = await tx.blocks.get(taskId);
    if (!task || task.kind !== 'task')
        return;
    if (decision.kind === 'finish') {
        if (task.status === 'active')
            task = await finishTaskIn(ctx, tx, task, day);
    }
    else {
        // Undoing "finished during the day" and choosing something else reopens the task first.
        if (task.status === 'done')
            task = await reopenTaskIn(ctx, tx, task);
        if (task.status !== 'active')
            return;
        if (decision.kind === 'schedule') {
            task = await moveIntendedDate(ctx, tx, task, decision.date, day, 'checkout');
        }
        else if (decision.kind === 'reflection') {
            task = { ...task, awaitingReflection: true, updatedAt: nowIso(ctx) };
            await record(ctx, tx, 'task.deferredToReflection', 'block', task.id, day);
        }
        else if (decision.kind === 'habit') {
            const habit = await addHabitIn(ctx, tx, { name: task.text || 'Hábito', criterion: '', weekdays: [], objectiveId: null });
            task = { ...task, status: 'converted', closedAt: nowIso(ctx), updatedAt: nowIso(ctx) };
            await record(ctx, tx, 'task.convertedToHabit', 'block', task.id, day, { habitId: habit.id });
        }
        else {
            const status = decision.kind === 'archive' ? 'archived' : 'abandoned';
            task = { ...task, status, closedAt: nowIso(ctx), updatedAt: nowIso(ctx) };
            await record(ctx, tx, decision.kind === 'archive' ? 'task.archived' : 'task.abandoned', 'block', task.id, day);
        }
    }
    // Any decision other than leaving it for the reflection settles a deferred task.
    const awaitingReflection = decision.kind === 'reflection' ? true : undefined;
    await tx.blocks.put({ ...task, awaitingReflection, lastTriagedDay: laterOf(task.lastTriagedDay, day) });
}
/** Links (or unlinks, with null) a task to a project during a triage. */
export async function applyTaskProject(ctx, tx, taskId, projectId, day) {
    const task = await tx.blocks.get(taskId);
    if (!task || task.kind !== 'task' || task.projectId === projectId)
        return;
    await tx.blocks.put({ ...task, projectId, updatedAt: nowIso(ctx) });
    await record(ctx, tx, 'block.linkedToProject', 'block', task.id, day, { projectId });
}
const NOTES_EVENTS = {
    wiki: 'section.notesMovedToWiki',
    discarded: 'section.notesDiscarded',
    weeklyReflection: 'section.notesDeferredToReflection',
};
/** Sets the destination of a section's notes. Shared by the checkout and the weekly reflection. */
export async function applyNotesDecision(ctx, tx, section, decision, day) {
    const updated = { ...section, notesDestination: decision, updatedAt: nowIso(ctx) };
    await tx.sections.put(updated);
    await record(ctx, tx, NOTES_EVENTS[decision], 'section', section.id, day, { projectId: section.projectId });
    return updated;
}
async function applyWhiteboardDecision(ctx, tx, section, decision, day) {
    if (decision.kind === 'leaveUnlinked') {
        await tx.sections.put({ ...section, whiteboardDecision: 'leftUnlinked', updatedAt: nowIso(ctx) });
        await record(ctx, tx, 'section.leftUnlinked', 'section', section.id, day);
        return;
    }
    const projectId = decision.kind === 'link' ? decision.projectId : (await addProject(ctx, tx, decision.name)).id;
    await linkSection(ctx, tx, section, projectId, day);
}
/** Applies every triage decision of a day in a single transaction. */
export async function applyTriage(ctx, day, decisions) {
    await ctx.store.transaction(async (tx) => {
        // Links first, so tasks and notes of a section linked now go with its project.
        for (const [sectionId, decision] of decisions.whiteboards) {
            const section = await tx.sections.get(sectionId);
            if (section)
                await applyWhiteboardDecision(ctx, tx, section, decision, day);
        }
        for (const [sectionId, decision] of decisions.notes) {
            const section = await tx.sections.get(sectionId);
            if (section)
                await applyNotesDecision(ctx, tx, section, decision, day);
        }
        for (const [sectionId, owner] of decisions.noteResources ?? []) {
            const section = await tx.sections.get(sectionId);
            if (section)
                await addResourceIn(ctx, tx, owner, { sectionId, title: section.title ?? `Notas de ${section.day}` });
        }
        for (const [taskId, projectId] of decisions.taskProjects ?? []) {
            await applyTaskProject(ctx, tx, taskId, projectId, day);
        }
        for (const [taskId, decision] of decisions.tasks) {
            await applyTaskDecision(ctx, tx, taskId, decision, day);
        }
    });
}
/** Planning the next day: chooses, among active tasks, those that go into the target day's note. */
export async function applyPlanning(ctx, day, target, changes) {
    await ctx.store.transaction(async (tx) => {
        for (const change of changes) {
            const task = await tx.blocks.get(change.taskId);
            if (!task || task.kind !== 'task' || task.status !== 'active')
                continue;
            if (change.include && task.intendedDate !== target) {
                await tx.blocks.put(await moveIntendedDate(ctx, tx, task, target, day, 'planning'));
            }
            if (!change.include && task.intendedDate === target) {
                await tx.blocks.put(await moveIntendedDate(ctx, tx, task, null, day, 'planning'));
            }
        }
    });
}
async function markCheckoutDone(ctx, tx, day, mode) {
    const at = nowIso(ctx);
    await tx.days.put({ day, lastCheckoutAt: at, updatedAt: at });
    await record(ctx, tx, 'day.checkoutCompleted', 'day', day, day, { mode });
}
/** "Finalizar meu dia". */
export async function completeCheckout(ctx, day) {
    await ctx.store.transaction((tx) => markCheckoutDone(ctx, tx, day, 'checkout'));
}
export function summarizeClosePendingDays(triages) {
    const tasks = new Set();
    const notes = new Set();
    const whiteboards = new Set();
    for (const triage of triages) {
        for (const row of triage.rows) {
            if (row.type === 'task')
                tasks.add(row.task.id);
            if (row.type === 'notes')
                notes.add(row.section.id);
            if (row.type === 'whiteboard')
                whiteboards.add(row.section.id);
        }
        for (const item of triage.automatic)
            if (item.type === 'notesToWiki')
                notes.add(item.section.id);
    }
    return {
        days: triages.map((triage) => triage.day),
        tasks: tasks.size,
        notesToWiki: notes.size,
        whiteboards: whiteboards.size,
    };
}
/**
 * "Fechar dias pendentes" (AUTO-TRIAGEM.md): notes go to the wiki, whiteboards stay unlinked,
 * and tasks not done go back to the active list without a date, counting as postponed.
 * Nothing is deleted, archived or abandoned.
 */
export async function closePendingDays(ctx, triages) {
    await ctx.store.transaction(async (tx) => {
        const today = toDayKey(ctx.clock.now());
        for (const triage of triages) {
            const day = triage.day;
            for (const row of triage.rows) {
                if (row.type === 'whiteboard') {
                    const section = await tx.sections.get(row.section.id);
                    if (section?.whiteboardDecision === 'pending' && section.projectId === null) {
                        await applyWhiteboardDecision(ctx, tx, section, { kind: 'leaveUnlinked' }, day);
                    }
                }
            }
            const noteSections = [
                ...triage.rows.flatMap((row) => (row.type === 'notes' ? [row.section.id] : [])),
                ...triage.automatic.flatMap((item) => (item.type === 'notesToWiki' ? [item.section.id] : [])),
            ];
            for (const sectionId of noteSections) {
                const section = await tx.sections.get(sectionId);
                if (section?.notesDestination === 'pending')
                    await applyNotesDecision(ctx, tx, section, 'wiki', day);
            }
            for (const row of triage.rows) {
                if (row.type !== 'task')
                    continue;
                const task = await tx.blocks.get(row.task.id);
                if (!task || task.status !== 'active' || (task.lastTriagedDay !== null && task.lastTriagedDay >= day))
                    continue;
                const from = task.intendedDate;
                await record(ctx, tx, 'task.postponed', 'block', task.id, day, { from, to: null, reason: 'closePendingDays' });
                if (from !== null) {
                    await record(ctx, tx, 'task.intendedDateChanged', 'block', task.id, day, {
                        from,
                        to: null,
                        reason: 'closePendingDays',
                    });
                }
                await tx.blocks.put({
                    ...task,
                    intendedDate: null,
                    postponeCount: task.postponeCount + 1,
                    lastTriagedDay: laterOf(task.lastTriagedDay, day),
                    updatedAt: nowIso(ctx),
                });
            }
            if (day < today)
                await markCheckoutDone(ctx, tx, day, 'closePendingDays');
        }
    });
}
