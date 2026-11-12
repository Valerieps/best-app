import type { DayKey } from './day';
import type { BlockKind, NotesDestination, Resource, SectionKind, Settings, WarmupResult } from './entities';

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
  | 'person'
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
  /** `sectionId` when the new note moved to a note on its project's page ("Tarefas esquecidas"). */
  'block.kindChanged': { from: BlockKind; to: BlockKind; sectionId?: string };
  /**
   * `projectId` null when a triage unlinks the task; `mergedFrom` when projects were merged;
   * `byTag` when a project tag in the text moved the block (ADR-066).
   */
  'block.linkedToProject': { projectId: string | null; mergedFrom?: string; byTag?: true };
  'task.intendedDateChanged': { from: DayKey | null; to: DayKey | null; reason: DateChangeReason };
  'task.deadlineChanged': { from: DayKey | null; to: DayKey | null };
  'task.postponed': { from: DayKey | null; to: DayKey | null; reason: DateChangeReason };
  /** The task as it was when finished: the execution log the intention metrics read. */
  'task.finished': {
    intendedDate: DayKey | null;
    firstIntendedDate: DayKey | null;
    postponeCount: number;
    projectId: string | null;
    /** A task someone owed me (spec/pessoas.md): left out of the intention metrics. */
    waiting?: true;
  };
  'task.reopened': NoData;
  /** History only: archiving was removed, and archived tasks became undated active tasks (ADR-049). */
  'task.archived': NoData;
  /** History only, like `task.archived`. */
  'task.reactivated': { previousIntendedDate: DayKey | null };
  'task.abandoned': NoData;
  /** History only: the task was left for the Revisão de Foco, which was removed (ADR-060). */
  'task.deferredToReflection': NoData;
  'task.convertedToHabit': { habitId: string };
  /** The task became, or stopped being, something a person owes me (spec/pessoas.md). */
  'task.waitingChanged': { waiting: boolean };
  /**
   * `projectPage` and `projectId` when the section is a project's page; `projectNote` and
   * `projectId` when it is a note written on a project's page; `ideaId` when it is an idea's page.
   */
  'section.created': { kind: SectionKind; projectPage?: true; projectNote?: true; projectId?: string; ideaId?: string };
  'section.titleChanged': { from: string | null; to: string | null };
  'section.linkedToProject': { projectId: string; mergedFrom?: string };
  /** The section went back to being a whiteboard; `projectId` is the project it left. */
  'section.unlinkedFromProject': { projectId: string };
  'section.leftUnlinked': NoData;
  'section.keptUnlinked': NoData;
  'section.notesMovedToWiki': { projectId: string | null };
  'section.notesDiscarded': { projectId: string | null };
  /** History only, like `task.deferredToReflection`. */
  'section.notesDeferredToReflection': { projectId: string | null };
  /** `weeklyReflection` is a destination from before ADR-060. */
  'section.notesReopened': { from: NotesDestination | 'weeklyReflection' };
  'section.detailsChanged': { participants: string | null; docLink: string | null };
  /** `fromIdeaId` and `fromProjectId` when the project grew from an idea (spec/ideias.md). */
  'project.created': { name: string; fromIdeaId?: string; fromProjectId?: string };
  'project.renamed': { from: string; to: string };
  'project.finished': NoData;
  'project.reopened': NoData;
  'project.merged': { into: string };
  /**
   * The project was deleted for good, with its history (ADR-074). `erased` lists the rows that went
   * with it (the project, its page sections, their blocks and its resources), by type and id only,
   * so the backup guard can tell a deliberate deletion from a loss. No name or text is kept.
   */
  'project.deleted': { erased: { entityType: EntityType; entityId: string }[] };
  'project.iconChanged': { from: string | null; to: string | null };
  'project.linkedToObjective': { objectiveId: string | null };
  /**
   * A change of a priority list, carrying the whole list after it. Day priorities (entity
   * `day:<day>`) name the task; the list in focus names the project, and a removal says why:
   * `removed` by hand, `finished` with the project, `review` in the Revisão de Foco (history
   * only, ADR-060). An addition that took another project's place names it in `replaced`. The
   * project next steps (entity `next:<projectId>`, ADR-065, removed by ADR-070) named the task and
   * the project, and a removal said why: `removed`, `finished`, `abandoned` or `moved`; history only.
   * The "Fila de execução" (entity `queue`, ADR-069) names the task, and a removal says why:
   * `removed` by hand, `finished` or `abandoned`.
   */
  'priority.added':
    | { taskId: string; itemIds: string[] }
    | { projectId: string; itemIds: string[]; replaced?: string }
    | { taskId: string; projectId: string; itemIds: string[]; replaced?: string };
  'priority.removed':
    | { taskId: string; itemIds: string[] }
    | { taskId: string; reason: 'removed' | 'finished' | 'abandoned'; itemIds: string[] }
    | { taskId: string; projectId: string; reason: 'removed' | 'finished' | 'abandoned' | 'moved'; itemIds: string[] }
    | { projectId: string; reason: 'removed' | 'finished' | 'review'; itemIds: string[] };
  /**
   * History only: a review was closed, with a snapshot of the metrics it showed. The reviews
   * were removed (ADR-060); the closed ones stay in the history and in the backup.
   */
  'reflection.closed': { kind: 'focus' | 'direction'; since: string | null; metrics: Record<string, unknown> };
  /** The idea's destinations (spec/ideias.md, "Destinos"), on the idea's block. */
  'idea.becameTask': { projectId: string | null };
  /** `projectId` is the new project; `fromProjectId` the idea's project then, if any. */
  'idea.becameProject': { projectId: string; fromProjectId: string | null };
  'idea.dropped': NoData;
  /** "Ainda não": `count` is how many times so far, this one included. */
  'idea.notYet': { count: number };
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
  'person.created': { name: string };
  'person.renamed': { from: string; to: string };
  'person.merged': { into: string };
  'person.archived': { archived: boolean };
  /** The person was deleted; the lines that cited them keep their text. */
  'person.deleted': { name: string };
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
  'reflection.closed': { week: string; metrics: unknown } | { month: string; metrics: unknown };
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
