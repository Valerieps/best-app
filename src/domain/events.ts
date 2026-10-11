import type { DayKey } from './day';

/**
 * Append-only history of every change. Metrics, including future ones, are computed from it,
 * so events are never edited or deleted. Entity fields like `postponeCount` are read caches
 * that can be rebuilt from here.
 */

export type EntityType = 'block' | 'section' | 'project' | 'day';

export type EventType =
  | 'block.created'
  | 'block.kindChanged'
  | 'block.linkedToProject'
  | 'task.intendedDateChanged'
  | 'task.postponed'
  | 'task.finished'
  | 'task.reopened'
  | 'task.archived'
  | 'task.reactivated'
  | 'task.abandoned'
  | 'section.created'
  | 'section.titleChanged'
  | 'section.linkedToProject'
  | 'section.leftUnlinked'
  | 'section.notesMovedToWiki'
  | 'section.notesDiscarded'
  | 'project.created'
  | 'project.finished'
  | 'day.checkoutCompleted';

export interface DomainEvent {
  id: string;
  type: EventType;
  entityType: EntityType;
  entityId: string;
  /** When the change happened. */
  at: string;
  /** Day the change belongs to, for per-day and per-period metrics. */
  day: DayKey;
  /** Event-specific details, such as `{ from, to }` for a date change. */
  data: Record<string, unknown>;
}
