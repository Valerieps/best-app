/** Appends one event to the history, stamped with the current time. */
export async function record(ctx, tx, type, entityType, entityId, day, data = {}) {
    await tx.appendEvent({
        id: ctx.ids.next(),
        type,
        entityType,
        entityId,
        at: ctx.clock.now().toISOString(),
        day,
        data,
    });
}
