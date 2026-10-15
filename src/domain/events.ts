import type { DayKey } from './day';
import type { DirectionMetrics } from './directionMetrics';
import type { BlockKind, NotesDestination, Resource, SectionKind, Settings, WarmupResult } from './entities';
import type { WeeklyMetrics } from './metrics';
import type { ReviewKind } from './reviews';

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

/** No details: the type, the entity and the time say everything. */
type NoData = Record<string, never>;

/** Why a task's intended date moved: the screen or ritual that moved it. */
export type DateChangeReason = 'checkout' | 'planning' | 'dayNote' | 'closePendingDays';

/**
 * The details each event type carries, as the app writes them today. `record` only accepts
 * these, so a misnamed field fails to compile. The map is also the list of event types.
 *
 * Never change the shape of a type that is already recorded: the history keeps the old events.
 * Add an optional field, or, for an incompatible change, move the old shape to `LegacyEventData`
 * and bump `EVENT_DATA_VERSION` (ADR-043).
 */
export interface EventData {
  'block.created': { kind: BlockKind; sectionId: string; projectId?: string };
  /** `text` when the line was deleted; `mergedInto` when it was joined into the previous one. */
  'block.deleted': { kind: BlockKind; text: string } | { kind: BlockKind; mergedInto: string };
  'block.kindChanged': { from: BlockKind; to: BlockKind };
  /** `projectId` null when a triage unlinks the task; `mergedFrom` when projects were merged. */
  'block.linkedToProject': { projectId: string | null; mergedFrom?: string };
  'task.intendedDateChanged': { from: DayKey | null; to: DayKey | null; reason: DateChangeReason };
  'task.deadlineChanged': { from: DayKey | null; to: DayKey | null };
  'task.postponed': { from: DayKey | null; to: DayKey | null; reason: DateChangeReason };
  /** The task as it was when finished: the execution log the intention metrics read. */
  'task.finished': {
    intendedDate: DayKey | null;
    firstIntendedDate: DayKey | null;
    postponeCount: number;
    projectId: string | null;
  };
  'task.reopened': NoData;
  /** History only: archiving was removed, and archived tasks became undated active tasks (ADR-049). */
  'task.archived': NoData;
  /** History only, like `task.archived`. */
  'task.reactivated': { previousIntendedDate: DayKey | null };
  'task.abandoned': NoData;
  'task.deferredToReflection': NoData;
  'task.convertedToHabit': { habitId: string };
  /** `projectPage` and `projectId` when the section is a project's page. */
  'section.created': { kind: SectionKind; projectPage?: true; projectId?: string };
  'section.titleChanged': { from: string | null; to: string | null };
  'section.linkedToProject': { projectId: string; mergedFrom?: string };
  /** The section went back to being a whiteboard; `projectId` is the project it left. */
  'section.unlinkedFromProject': { projectId: string };
  'section.leftUnlinked': NoData;
  'section.keptUnlinked': NoData;
  'section.notesMovedToWiki': { projectId: string | null };
  'section.notesDiscarded': { projectId: string | null };
  'section.notesDeferredToReflection': { projectId: string | null };
  'section.notesReopened': { from: NotesDestination };
  'section.detailsChanged': { participants: string | null; docLink: string | null };
  'project.created': { name: string };
  'project.renamed': { from: string; to: string };
  'project.finished': NoData;
  'project.reopened': NoData;
  'project.merged': { into: string };
  'project.iconChanged': { from: string | null; to: string | null };
  'project.linkedToObjective': { objectiveId: string | null };
  /**
   * A change of a priority list, carrying the whole list after it. Day priorities (entity
   * `day:<day>`) name the task; the list in focus names the project, and a removal says why.
   */
  'priority.added': { taskId: string; itemIds: string[] } | { projectId: string; itemIds: string[] };
  'priority.removed':
    | { taskId: string; itemIds: string[] }
    | { projectId: string; reason: 'review' | 'finished'; itemIds: string[] };
  'reflection.closed': { kind: ReviewKind; since: string | null; metrics: WeeklyMetrics | DirectionMetrics };
  'settings.changed': Partial<Omit<Settings, 'id' | 'updatedAt'>>;
  'day.started': NoData;
  'day.executionStarted': NoData;
  'day.checkoutCompleted': { mode: 'checkout' | 'closePendingDays' };
  'warmup.answered': { itemId: string; result: WarmupResult };
  'reminder.created': { dueAt: string; source: 'warmup' };
  'reminder.answered': { answer: 'done' | 'dropped' };
  'reminder.snoozed': { dueAt: string };
  'objective.created': { goal: string };
  'objective.updated': { goal: string; motivation: string };
  'objective.finished': { achieved: boolean };
  'objective.reopened': NoData;
  'resource.added': { ownerType: Resource['ownerType']; ownerId: string; sectionId: string | null };
  'resource.renamed': { from: string; to: string };
  'resource.removed': { ownerId: string };
  'habit.created': { name: string };
  'habit.updated': { name: string; criterion: string; weekdays: number[]; objectiveId: string | null };
  'habit.archived': { archived: boolean };
  'habit.logged': { done: boolean };
  /** A backup file replaced the data; the event lands in the history it brought (ADR-006). */
  'backup.imported': { exportedAt: string; schemaVersion: number };
  /** The last import was undone; the event lands in the history from before it. */
  'backup.importUndone': { importedAt: string };
}

/**
 * Shapes the app wrote in the past and no longer writes, kept so the readers handle them.
 * Only types whose shape changed are here.
 */
export interface LegacyEventData {
  /** The week lists of priority projects, before the single list in focus. */
  'priority.added': { projectId: string; itemIds: string[]; week: string };
  'priority.removed': { projectId: string; itemIds: string[]; week: string };
  /** The weekly and monthly reflections, before the Focus and Direction reviews. */
  'reflection.closed': { week: string; metrics: WeeklyMetrics } | { month: string; metrics: unknown };
}

/**
 * Version of the shapes in `EventData`. An event without `v` is version 1. Bump it when a shape
 * changes incompatibly, so a reader can tell the old events from the new.
 */
export const EVENT_DATA_VERSION = 1;

export type EventType = keyof EventData;

/** Event types that carry no details, so `record` can be called without them. */
export type EventTypeWithoutData = {
  [T in EventType]: EventData[T] extends NoData ? T : never;
}[EventType];

interface EventBase {
  id: string;
  entityType: EntityType;
  entityId: string;
  /** When the change happened. */
  at: string;
  /** Day the change belongs to, for per-day and per-period metrics. */
  day: DayKey;
  /** Version of the shape of `data`; absent means 1. */
  v?: number;
}

/** An event of one type, as read from the history: today's shape or an older one. */
export type EventOf<T extends EventType> = EventBase & {
  type: T;
  /** Event-specific details, such as `{ from, to }` for a date change. */
  data: EventData[T] | (T extends keyof LegacyEventData ? LegacyEventData[T] : never);
};

/** Any event, discriminated by `type`: checking the type narrows `data`. */
export type DomainEvent = { [T in EventType]: EventOf<T> }[EventType];
