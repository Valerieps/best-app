import type { DayKey } from '../domain/day';
import type { DomainEvent, EntityType, EventData, EventType, EventTypeWithoutData } from '../domain/events';
import type { AppContext, StoreTransaction } from './ports';

/** The details `record` takes after the day: required, unless the type carries none. */
type DataArgs<T extends EventType> = T extends EventTypeWithoutData ? [data?: EventData[T]] : [data: EventData[T]];

/** Appends one event to the history, stamped with the current time. */
export async function record<T extends EventType>(
  ctx: AppContext,
  tx: StoreTransaction,
  type: T,
  entityType: EntityType,
  entityId: string,
  day: DayKey,
  ...[data]: DataArgs<T>
): Promise<void> {
  await tx.appendEvent({
    id: ctx.ids.next(),
    type,
    entityType,
    entityId,
    at: ctx.clock.now().toISOString(),
    day,
    data: data ?? {},
  } as DomainEvent);
}
