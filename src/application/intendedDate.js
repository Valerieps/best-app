import { isPostponement } from '../domain/tasks';
import { record } from './events';
/**
 * Moves a task's intended date and records it, counting postponements. Returns the updated
 * task; the caller saves it.
 */
export async function moveIntendedDate(ctx, tx, task, to, day, reason) {
    const from = task.intendedDate;
    if (from === to)
        return task;
    const postponed = isPostponement(from, to);
    await record(ctx, tx, 'task.intendedDateChanged', 'block', task.id, day, { from, to, reason });
    if (postponed)
        await record(ctx, tx, 'task.postponed', 'block', task.id, day, { from, to, reason });
    return {
        ...task,
        intendedDate: to,
        firstIntendedDate: task.firstIntendedDate ?? to,
        postponeCount: task.postponeCount + (postponed ? 1 : 0),
        updatedAt: ctx.clock.now().toISOString(),
    };
}
