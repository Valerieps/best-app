import { toDayKey } from '../domain/day';
import { positionBetween } from '../domain/position';
import { record } from './events';
import { createBlock, createSection, setSectionTitle } from './notebook';
/** Section 3: "Iniciar Dia", warm up, dashboard, and reminders that come back in the app. */
function today(ctx) {
    return toDayKey(ctx.clock.now());
}
async function dayRecordFor(ctx, tx, day) {
    return (await tx.days.get(day)) ?? { day, lastCheckoutAt: null, updatedAt: ctx.clock.now().toISOString() };
}
export async function startDay(ctx) {
    await ctx.store.transaction(async (tx) => {
        const day = today(ctx);
        const current = await dayRecordFor(ctx, tx, day);
        if (current.startedAt)
            return;
        const at = ctx.clock.now().toISOString();
        await tx.days.put({ ...current, startedAt: at, updatedAt: at });
        await record(ctx, tx, 'day.started', 'day', day, day);
    });
}
/**
 * Answers a warm-up item: done, "pular hoje", or "perguntar de novo" at `askAt`, which creates
 * a reminder that comes back inside the app.
 */
export async function answerWarmupItem(ctx, item, result, askAt) {
    await ctx.store.transaction(async (tx) => {
        const day = today(ctx);
        const current = await dayRecordFor(ctx, tx, day);
        const at = ctx.clock.now().toISOString();
        await tx.days.put({ ...current, warmup: { ...(current.warmup ?? {}), [item.id]: result }, updatedAt: at });
        await record(ctx, tx, 'warmup.answered', 'day', day, day, { itemId: item.id, result });
        if (result === 'later' && askAt) {
            const reminder = {
                id: ctx.ids.next(),
                source: 'warmup',
                sourceId: item.id,
                day,
                text: item.text,
                dueAt: askAt.toISOString(),
                status: 'pending',
                createdAt: at,
                updatedAt: at,
            };
            await tx.reminders.put(reminder);
            await record(ctx, tx, 'reminder.created', 'reminder', reminder.id, day, { dueAt: reminder.dueAt, source: 'warmup' });
        }
    });
}
/** "Iniciar o Flow de Execução": from the dashboard to the day note. */
export async function startExecution(ctx) {
    await ctx.store.transaction(async (tx) => {
        const day = today(ctx);
        const current = await dayRecordFor(ctx, tx, day);
        if (current.executionStartedAt)
            return;
        const at = ctx.clock.now().toISOString();
        await tx.days.put({ ...current, startedAt: current.startedAt ?? at, executionStartedAt: at, updatedAt: at });
        await record(ctx, tx, 'day.executionStarted', 'day', day, day);
    });
}
/** "Registrar pensamentos" on the dashboard: they go into a new general section of the day note. */
export async function registerThoughts(ctx, text) {
    const lines = text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    if (lines.length === 0)
        return;
    const section = await createSection(ctx, 'general');
    await setSectionTitle(ctx, section.id, 'Pensamentos');
    let position = null;
    for (const line of lines) {
        position = positionBetween(position, null);
        await createBlock(ctx, { sectionId: section.id, position }, line);
    }
}
/** Answers a reminder: "feito" or "largar". A done warm-up reminder marks the item done that day. */
export async function answerReminder(ctx, reminderId, answer) {
    await ctx.store.transaction(async (tx) => {
        const reminder = await tx.reminders.get(reminderId);
        if (!reminder || reminder.status !== 'pending')
            return;
        const at = ctx.clock.now().toISOString();
        await tx.reminders.put({ ...reminder, status: answer, updatedAt: at });
        await record(ctx, tx, 'reminder.answered', 'reminder', reminder.id, today(ctx), { answer });
        if (answer === 'done' && reminder.source === 'warmup') {
            const dayRecord = await dayRecordFor(ctx, tx, reminder.day);
            await tx.days.put({ ...dayRecord, warmup: { ...(dayRecord.warmup ?? {}), [reminder.sourceId]: 'done' }, updatedAt: at });
        }
    });
}
/** "Mais tarde" (or "mudar" at checkout): the reminder comes back at `dueAt`. */
export async function snoozeReminder(ctx, reminderId, dueAt) {
    await ctx.store.transaction(async (tx) => {
        const reminder = await tx.reminders.get(reminderId);
        if (!reminder || reminder.status !== 'pending')
            return;
        await tx.reminders.put({ ...reminder, dueAt: dueAt.toISOString(), updatedAt: ctx.clock.now().toISOString() });
        await record(ctx, tx, 'reminder.snoozed', 'reminder', reminder.id, today(ctx), { dueAt: dueAt.toISOString() });
    });
}
