import { toDayKey } from './day';
import { POSTPONE_ATTENTION_THRESHOLD } from './tasks';
/** Section 2: rules behind the project page. */
/** The icons a project can have. The drawings live in the UI; the project stores only the id. */
export const PROJECT_ICONS = [
    'pot',
    'home',
    'briefcase',
    'book',
    'heart',
    'plane',
    'code',
    'balloon',
    'leaf',
    'music',
    'dumbbell',
    'camera',
];
export function isProjectIcon(value) {
    return typeof value === 'string' && PROJECT_ICONS.includes(value);
}
/** Letter shown for a project without an icon. */
export function projectInitial(name) {
    return name.trim().charAt(0).toLocaleUpperCase('pt-BR') || '?';
}
/** Sections that belong to a day note; the section that holds a project page's tasks does not. */
export function isDaySection(section) {
    return section.projectPage !== true;
}
/**
 * "Travada": an active task postponed 3 times or more, or whose intended date already passed.
 * Uses the same threshold that makes a task ask for attention at checkout.
 */
export function isStuckTask(task, today) {
    if (task.kind !== 'task' || task.status !== 'active')
        return false;
    return task.postponeCount >= POSTPONE_ATTENTION_THRESHOLD || (task.intendedDate !== null && task.intendedDate < today);
}
function byDateThenCreation(a, b) {
    // Tasks without a date go last.
    const dateA = a.intendedDate ?? '9999-12-31';
    const dateB = b.intendedDate ?? '9999-12-31';
    if (dateA !== dateB)
        return dateA < dateB ? -1 : 1;
    return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}
export function stuckReason(task, today) {
    if (!isStuckTask(task, today))
        return null;
    const postponed = task.postponeCount >= POSTPONE_ATTENTION_THRESHOLD ? task.postponeCount : null;
    return {
        postponed,
        since: postponed === null ? null : (task.firstIntendedDate ?? toDayKey(new Date(task.createdAt))),
        overdueOn: task.intendedDate !== null && task.intendedDate < today ? task.intendedDate : null,
    };
}
/**
 * The project's active tasks in the page's levels of emphasis, each group by date then creation.
 * A stuck task shows only among the stuck ones.
 */
export function groupProjectTasks(active, today) {
    const sorted = [...active].sort(byDateThenCreation);
    const stuck = sorted.filter((task) => isStuckTask(task, today));
    const rest = sorted.filter((task) => !stuck.includes(task));
    return {
        stuck,
        upcoming: rest.filter((task) => task.intendedDate !== null),
        undated: rest.filter((task) => task.intendedDate === null),
    };
}
/** "Próximos dias" as a small agenda: one entry per intended date, in order. */
export function agendaDays(upcoming) {
    const days = [];
    for (const task of upcoming) {
        const day = task.intendedDate;
        if (day === null)
            continue;
        const entry = days.find((candidate) => candidate.day === day);
        if (entry)
            entry.tasks.push(task);
        else
            days.push({ day, tasks: [task] });
    }
    return days.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
}
