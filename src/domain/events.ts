import type { DayKey } from './day';

/**
 * Append-only history of every change. Metrics, including future ones, are computed from it,
 * so events are never edited or deleted. Entity fields like `postponeCount` are read caches
 * that can be rebuilt from here.
 */

export type EntityType =
  | 'block'
  | 'section'
  | 'project'
  | 'day'
  | 'priorities'
  | 'reflection'
  | 'settings'
  | 'reminder'
  | 'objective'
  | 'resource'
  | 'habit'
  | 'backup';

export type EventType =
  | 'block.created'
  | 'block.deleted'
  | 'block.kindChanged'
  | 'block.linkedToProject'
  | 'task.intendedDateChanged'
  | 'task.deadlineChanged'
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
  | 'section.notesReopened'
  | 'section.detailsChanged'
  | 'section.keptUnlinked'
  | 'project.created'
  | 'project.finished'
  | 'project.merged'
  | 'priority.added'
  | 'priority.removed'
  | 'task.deferredToReflection'
  | 'section.notesDeferredToReflection'
  | 'project.renamed'
  | 'project.reopened'
  | 'reflection.closed'
  | 'settings.changed'
  | 'day.started'
  | 'day.executionStarted'
  | 'warmup.answered'
  | 'reminder.created'
  | 'reminder.answered'
  | 'reminder.snoozed'
  | 'objective.created'
  | 'objective.updated'
  | 'objective.finished'
  | 'objective.reopened'
  | 'project.linkedToObjective'
  | 'project.iconChanged'
  | 'resource.added'
  | 'resource.renamed'
  | 'resource.removed'
  | 'habit.created'
  | 'habit.updated'
  | 'habit.archived'
  | 'habit.logged'
  | 'task.convertedToHabit'
  | 'day.checkoutCompleted'
  | 'backup.imported'
  | 'backup.importUndone';

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
