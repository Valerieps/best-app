/** The day has at most this many priorities. */
export const DAY_PRIORITY_LIMIT = 3;
export function dayPriorityListId(day) {
    return `day:${day}`;
}
/**
 * The day's priorities: the ones chosen by hand, plus tasks whose deadline is the day. A
 * deadline task takes the place of the last chosen priority instead of making a fourth one.
 * Finished, archived and abandoned tasks leave the list, so it can be empty once all 3 are done.
 */
export function buildDayPriorities(chosenIds, tasks, deadlineTasks) {
    const byId = new Map(tasks.map((task) => [task.id, task]));
    const open = (task) => task !== undefined && task.status === 'active';
    const slots = chosenIds
        .map((id) => byId.get(id))
        .filter(open)
        .slice(0, DAY_PRIORITY_LIMIT)
        .map((task) => ({ task, automatic: false }));
    for (const task of deadlineTasks.filter(open)) {
        if (slots.some((slot) => slot.task.id === task.id))
            continue;
        if (slots.length < DAY_PRIORITY_LIMIT) {
            slots.push({ task, automatic: true });
            continue;
        }
        // Replace the last priority chosen by hand; never another deadline task.
        const index = slots.map((slot) => slot.automatic).lastIndexOf(false);
        if (index !== -1)
            slots[index] = { task, automatic: true };
    }
    return slots;
}
/**
 * Promoting a task never blocks: when the 3 chosen priorities are still open, the new one
 * takes the place of the third. Finished ones are dropped from the stored list.
 */
export function promote(chosenIds, taskId, isOpen) {
    if (chosenIds.includes(taskId))
        return [...chosenIds];
    const stillOpen = chosenIds.filter(isOpen);
    const kept = stillOpen.length >= DAY_PRIORITY_LIMIT ? stillOpen.slice(0, DAY_PRIORITY_LIMIT - 1) : stillOpen;
    return [...kept, taskId];
}
export function demote(chosenIds, taskId) {
    return chosenIds.filter((id) => id !== taskId);
}
