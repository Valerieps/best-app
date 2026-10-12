import { toDayKey } from './day';
import { comparePositions } from './position';
import { isTaskPendingOn, isTaskShownOn, nextPlanningDay, POSTPONE_ATTENTION_THRESHOLD } from './tasks';
import { findCitedName } from './text';
function byCreatedAt(a, b) {
    return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}
function finishedOn(task, day) {
    return task.status === 'done' && task.closedAt !== null && toDayKey(new Date(task.closedAt)) === day;
}
export function sectionNeedsNotesTriage(section, blocks) {
    return section.notesDestination === 'pending' && blocks.some((block) => block.kind === 'note');
}
export function sectionNeedsWhiteboardDecision(section, blocks) {
    return section.projectId === null && section.whiteboardDecision === 'pending' && blocks.length > 0;
}
export function buildDayTriage(input) {
    const { day, today } = input;
    const nextDay = nextPlanningDay(day, today, input.activeDays);
    const projectsById = new Map(input.projects.map((project) => [project.id, project]));
    const activeProjects = input.projects.filter((project) => project.status === 'active');
    const rows = [];
    const automatic = [];
    // "Dia seguinte" is the suggestion. A task postponed many times asks for attention and,
    // since section 2, is suggested for the weekly reflection; a deadline before "dia seguinte"
    // also asks for attention.
    const taskRow = (task, section) => {
        const postponedOften = task.postponeCount >= POSTPONE_ATTENTION_THRESHOLD;
        return {
            type: 'task',
            task,
            section,
            suggestion: postponedOften ? { kind: 'reflection' } : { kind: 'schedule', date: nextDay },
            attention: postponedOften || (task.deadline != null && task.deadline < nextDay),
        };
    };
    // 1b: a task given a future date during the day already has its destination.
    const scheduledDuringDay = (task, originDay) => task.kind === 'task' &&
        task.status === 'active' &&
        originDay === day &&
        task.intendedDate !== null &&
        task.intendedDate > day &&
        (task.lastTriagedDay === null || task.lastTriagedDay < day);
    // Tasks carried from other days show up first, as at the top of the day note.
    for (const task of [...input.carried].sort(byCreatedAt)) {
        if (isTaskPendingOn(task, null, day))
            rows.push(taskRow(task, null));
        else if (isTaskShownOn(task, null, day) && finishedOn(task, day)) {
            automatic.push({ type: 'finishedDuringDay', task, section: null });
        }
    }
    for (const section of [...input.sections].sort(byCreatedAt)) {
        const blocks = input.blocks.filter((block) => block.sectionId === section.id).sort(comparePositions);
        const notes = blocks.filter((block) => block.kind === 'note');
        if (sectionNeedsWhiteboardDecision(section, blocks)) {
            const sectionText = [section.title ?? '', ...blocks.map((block) => block.text)].join('\n');
            const cited = findCitedName(sectionText, activeProjects);
            rows.push({
                type: 'whiteboard',
                section,
                suggestion: cited ? { kind: 'link', projectId: cited.id } : { kind: 'leaveUnlinked' },
                citedProject: cited,
                attention: cited !== null,
            });
        }
        if (sectionNeedsNotesTriage(section, blocks)) {
            if (section.projectId !== null) {
                automatic.push({
                    type: 'notesToWiki',
                    section,
                    project: projectsById.get(section.projectId) ?? null,
                    noteCount: notes.length,
                });
            }
            else {
                rows.push({ type: 'notes', section, noteCount: notes.length, suggestion: 'wiki', attention: false });
            }
        }
        for (const task of blocks) {
            if (task.kind !== 'task')
                continue;
            if (isTaskPendingOn(task, section.day, day))
                rows.push(taskRow(task, section));
            else if (finishedOn(task, day))
                automatic.push({ type: 'finishedDuringDay', task, section });
            else if (scheduledDuringDay(task, section.day))
                automatic.push({ type: 'scheduledDuringDay', task, section });
        }
    }
    return { day, nextDay, rows, automatic };
}
/** A day is pending while anything in it still needs a decision. */
export function isTriagePending(triage) {
    return triage.rows.length > 0 || triage.automatic.some((item) => item.type === 'notesToWiki');
}
/** Turns an automatic decision back into a regular row the user can change. */
export function automaticToRow(item) {
    if (item.type === 'notesToWiki') {
        return { type: 'notes', section: item.section, noteCount: item.noteCount, suggestion: 'wiki', attention: false };
    }
    const suggestion = item.type === 'scheduledDuringDay' && item.task.intendedDate
        ? { kind: 'schedule', date: item.task.intendedDate }
        : { kind: 'finish' };
    return { type: 'task', task: item.task, section: item.section, suggestion, attention: false };
}
/** Days before today whose checkout still has something to decide, oldest first. */
export function findPendingDays(input) {
    const days = new Set();
    for (const section of input.sections) {
        if (section.day >= input.today)
            continue;
        const blocks = input.blocks.filter((block) => block.sectionId === section.id);
        if (sectionNeedsNotesTriage(section, blocks) || sectionNeedsWhiteboardDecision(section, blocks)) {
            days.add(section.day);
        }
    }
    for (const task of input.activeTasks) {
        const originDay = input.originDays.get(task.sectionId) ?? null;
        for (const day of [originDay, task.intendedDate]) {
            if (day && day < input.today && isTaskPendingOn(task, originDay, day))
                days.add(day);
        }
    }
    return [...days].sort();
}
