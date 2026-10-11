import type { DayKey } from '../domain/day';
import type { EntityType, EventType } from '../domain/events';
import type { AppContext, StoreTransaction } from './ports';

/** Appends one event to the history, stamped with the current time. */
export async function record(
  ctx: AppContext,
  tx: StoreTransaction,
  type: EventType,
  entityType: EntityType,
  entityId: string,
  day: DayKey,
  data: Record<string, unknown> = {},
): Promise<void> {
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
