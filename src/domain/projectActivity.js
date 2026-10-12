import { addDays, daysBetween, toDayKey } from './day';
import { weekStart } from './week';
/**
 * Section 2: a project's activity, computed from the event history, not from the current state
 * (ADR-034). It feeds the activity map of the project list, the stalled state and the tasks
 * finished lately. There is no streak count, on purpose.
 */
/** An active project with no activity for this many days is stalled ("Parado há N dias"). */
export const STALLED_AFTER_DAYS = 14;
/** "Finalizadas nas últimas 2 semanas": today and the 13 days before it. */
export const RECENT_FINISH_DAYS = 14;
/** Columns of the map on a priority project's card and on the other projects' rows. */
export const CARD_MAP_WEEKS = 16;
export const ROW_MAP_WEEKS = 8;
const EMPTY = { tasksCreated: 0, tasksFinished: 0, notes: 0, sections: 0 };
export function activityTotal(activity) {
    return activity.tasksCreated + activity.tasksFinished + activity.notes + activity.sections;
}
function byTime(a, b) {
    return a.at < b.at ? -1 : a.at > b.at ? 1 : 0;
}
/**
 * Days of the finishes that still stand. A reopening cancels the latest finish of that task,
 * so a task finished, reopened and finished again counts once, on the day of the last finish.
 */
export function standingFinishDays(events, taskIds) {
    const finishes = new Map();
    for (const event of [...events].sort(byTime)) {
        if (!taskIds.has(event.entityId))
            continue;
        const days = finishes.get(event.entityId) ?? [];
        if (event.type === 'task.finished')
            days.push(event.day);
        else if (event.type === 'task.reopened')
            days.pop();
        else
            continue;
        finishes.set(event.entityId, days);
    }
    return [...finishes.values()].flat();
}
/**
 * Activity per day: tasks created, tasks finished (still standing), notes written and sections
 * opened. A task or note counts on the day of its `block.created` event, a section on the day
 * of its `section.created` event; days with nothing are absent.
 */
export function activityByDay({ taskIds, noteIds, sectionIds, events }) {
    const days = new Map();
    const add = (day, field) => {
        const current = days.get(day) ?? { ...EMPTY };
        current[field]++;
        days.set(day, current);
    };
    for (const event of events) {
        if (event.type === 'block.created' && taskIds.has(event.entityId))
            add(event.day, 'tasksCreated');
        else if (event.type === 'block.created' && noteIds.has(event.entityId))
            add(event.day, 'notes');
        else if (event.type === 'section.created' && sectionIds.has(event.entityId))
            add(event.day, 'sections');
    }
    for (const day of standingFinishDays(events, taskIds))
        add(day, 'tasksFinished');
    return days;
}
/** The latest day with any activity, at most `today`. */
export function lastActivityDay(activity, today) {
    let latest = null;
    for (const [day, counts] of activity) {
        if (day <= today && activityTotal(counts) > 0 && (latest === null || day > latest))
            latest = day;
    }
    return latest;
}
/**
 * Days without activity when an active project is stalled; null otherwise. With no activity at
 * all, the project counts as idle since it was created. A finished project is never stalled.
 */
export function stalledDays(project, activity, today) {
    if (project.status !== 'active')
        return null;
    const since = lastActivityDay(activity, today) ?? toDayKey(new Date(project.createdAt));
    const idle = daysBetween(since, today);
    return idle >= STALLED_AFTER_DAYS ? idle : null;
}
/** Tasks finished in the last 2 weeks, today included. */
export function recentlyFinished(activity, today) {
    const start = addDays(today, -(RECENT_FINISH_DAYS - 1));
    let count = 0;
    for (const [day, counts] of activity)
        if (day >= start && day <= today)
            count += counts.tasksFinished;
    return count;
}
/** Fixed steps, so the same color means the same amount on every project: 1, 2–3, 4–5, 6 or more. */
export function activityLevel(total) {
    if (total <= 0)
        return 0;
    if (total === 1)
        return 1;
    if (total <= 3)
        return 2;
    if (total <= 5)
        return 3;
    return 4;
}
/**
 * The map's grid, GitHub style: one column per week (Monday to Sunday), oldest first, the last
 * column being the current week. Each column has 7 cells, one per day.
 */
export function activityGrid(activity, today, weeks) {
    const firstMonday = addDays(weekStart(today), -7 * (weeks - 1));
    return Array.from({ length: weeks }, (_, column) => Array.from({ length: 7 }, (_, row) => {
        const day = addDays(firstMonday, column * 7 + row);
        const counts = activity.get(day) ?? EMPTY;
        const future = day > today;
        return { day, activity: counts, level: future ? 0 : activityLevel(activityTotal(counts)), future };
    }));
}
