import { toDayKey } from '../domain/day';
import { ALL_DAYS } from '../domain/dayFlow';
import { habitLogId } from '../domain/habits';
import { record } from './events';
/** Section 6: habits, logged as yes or no. */
function today(ctx) {
    return toDayKey(ctx.clock.now());
}
export async function addHabitIn(ctx, tx, fields) {
    const at = ctx.clock.now().toISOString();
    const habit = {
        id: ctx.ids.next(),
        name: fields.name.trim(),
        criterion: fields.criterion.trim(),
        weekdays: fields.weekdays.length > 0 ? [...fields.weekdays].sort() : [...ALL_DAYS],
        objectiveId: fields.objectiveId,
        status: 'active',
        createdAt: at,
        updatedAt: at,
    };
    await tx.habits.put(habit);
    await record(ctx, tx, 'habit.created', 'habit', habit.id, today(ctx), { name: habit.name });
    return habit;
}
export function createHabit(ctx, fields) {
    if (!fields.name.trim())
        throw new Error('The habit name must not be empty');
    return ctx.store.transaction((tx) => addHabitIn(ctx, tx, fields));
}
export async function updateHabit(ctx, id, fields) {
    if (!fields.name.trim())
        return;
    await ctx.store.transaction(async (tx) => {
        const habit = await tx.habits.get(id);
        if (!habit)
            return;
        const updated = {
            ...habit,
            name: fields.name.trim(),
            criterion: fields.criterion.trim(),
            weekdays: fields.weekdays.length > 0 ? [...fields.weekdays].sort() : habit.weekdays,
            objectiveId: fields.objectiveId,
            updatedAt: ctx.clock.now().toISOString(),
        };
        await tx.habits.put(updated);
        await record(ctx, tx, 'habit.updated', 'habit', id, today(ctx), { ...fields });
    });
}
/** Archiving keeps the logs for the metrics; the habit just stops being asked. */
export async function setHabitArchived(ctx, id, archived) {
    await ctx.store.transaction(async (tx) => {
        const habit = await tx.habits.get(id);
        if (!habit || (habit.status === 'archived') === archived)
            return;
        await tx.habits.put({ ...habit, status: archived ? 'archived' : 'active', updatedAt: ctx.clock.now().toISOString() });
        await record(ctx, tx, 'habit.archived', 'habit', id, today(ctx), { archived });
    });
}
/** Logs a day as yes or no. Logging again replaces the answer. */
export async function logHabit(ctx, habitId, day, done) {
    await ctx.store.transaction(async (tx) => {
        const id = habitLogId(habitId, day);
        const current = await tx.habitLogs.get(id);
        if (current?.done === done)
            return;
        await tx.habitLogs.put({ id, habitId, day, done, updatedAt: ctx.clock.now().toISOString() });
        await record(ctx, tx, 'habit.logged', 'habit', habitId, day, { done });
    });
}
