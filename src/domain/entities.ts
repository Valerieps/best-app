import type { AssistantId, StatusLimits } from './cleanupStatus';
import type { DayKey } from './day';
import type { ReviewCadence } from './reviews';

/**
 * Entities stored by the app. Each block, section and project is its own record:
 * blocks exist only once, and notes, projects and the wiki point at them instead of copying.
 * Timestamps are ISO 8601 strings.
 */

export type BlockKind = 'task' | 'note';

/** converted (section 6): the task became a habit at checkout and left circulation. */
export type TaskStatus = 'active' | 'done' | 'archived' | 'abandoned' | 'converted';

export interface Block {
  id: string;
  kind: BlockKind;
  text: string;
  /** Section where the block was originally written. */
  sectionId: string;
  /** Fractional index that orders blocks inside a section without rewriting siblings. */
  position: string;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
  /** Task-only fields; null for notes. */
  status: TaskStatus | null;
  /** Day the task is meant to show up in the day note. */
  intendedDate: DayKey | null;
  /** First intended date ever set, kept to measure the distance to the final action. */
  firstIntendedDate: DayKey | null;
  postponeCount: number;
  /** When the task was finished, archived or abandoned. */
  closedAt: string | null;
  /**
   * Latest day whose checkout decided this task. A task is pending on a day it shows up in
   * only while this is earlier than that day. Null until the first triage.
   */
  lastTriagedDay: DayKey | null;
  /** Prazo máximo (1b), optional. Absent in records saved before 1b. */
  deadline?: DayKey | null;
  /** Section 2: left for the weekly reflection to decide ("decidir na reflexão semanal"). */
  awaitingReflection?: boolean;
  /**
   * Order among the tasks carried into a day from other days (request 2). Counts only while
   * `day` is the intended date; absent until the task is reordered.
   */
  carriedOrder?: { day: DayKey; position: string } | null;
}

export type SectionKind = 'general' | 'meeting';

/** Where a section's notes go at checkout. All notes of a section are triaged together. */
export type NotesDestination = 'pending' | 'wiki' | 'discarded' | 'weeklyReflection';

/**
 * Checkout decision for a section still on whiteboard (no project). `keptUnlinked` means the
 * whiteboards assistant was told to leave it as it is, so it stops suggesting it.
 */
export type WhiteboardDecision = 'pending' | 'leftUnlinked' | 'keptUnlinked';

export interface Section {
  id: string;
  kind: SectionKind;
  day: DayKey;
  createdAt: string;
  updatedAt: string;
  title: string | null;
  /** Null means the section is on whiteboard. */
  projectId: string | null;
  notesDestination: NotesDestination;
  whiteboardDecision: WhiteboardDecision;
  /** Meeting sections only (1b). Absent in records saved before 1b. */
  participants?: string | null;
  docLink?: string | null;
  /**
   * Section 2: holds the tasks written on a project's page. It belongs to no day note, so its
   * tasks only show up in a day when they get an intended date, and its `day` is just the day it
   * was created. Absent in other sections.
   */
  projectPage?: boolean;
}

/** `merged` projects were joined into another one (`mergedInto`) by the duplicates assistant. */
export type ProjectStatus = 'active' | 'finished' | 'merged';

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
  mergedInto?: string | null;
  /** Projects the duplicates assistant was told are not the same as this one. */
  keepSeparateFrom?: string[];
  /** Section 4: at most one objective. */
  objectiveId?: string | null;
  /** Section 2: one of `PROJECT_ICONS`; absent or null shows the name's initial. */
  icon?: string | null;
}

/** Per-day bookkeeping. Whether a checkout is pending is derived from the blocks. */
export interface DayRecord {
  day: DayKey;
  lastCheckoutAt: string | null;
  updatedAt: string;
  /** Section 3: when "Iniciar Dia" was pressed. */
  startedAt?: string | null;
  /** Section 3: result of each warm-up item that day. */
  warmup?: Record<string, WarmupResult>;
  /** Section 3: when "Iniciar o Flow de Execução" was pressed. */
  executionStartedAt?: string | null;
  /**
   * Order of the day note's parts, when it was changed (see `orderDayParts`): section ids and
   * the keys of the priorities and the carried tasks. Absent until the first reordering.
   */
  sectionOrder?: string[];
}

export type WarmupResult = 'done' | 'skipped' | 'later';

/**
 * Ordered priorities. Ids look like `day:2026-10-11` (the day's tasks) or `focusProjects` (section
 * 2, the single list of projects in focus). `weekProjects:2026-W42` lists are the week's priority
 * projects from before the reviews (ADR-035), kept as history for the raio-x; before version 6
 * they were per month, with ids `month:AAAA-MM`.
 */
export interface PriorityList {
  id: string;
  /** `focusProjects` and `weekProjects` list projects; `day` lists tasks. */
  scope: 'day' | 'focusProjects' | 'weekProjects';
  /** A day (AAAA-MM-DD), an ISO week (AAAA-Www) for the old week lists, or empty. */
  period: string;
  itemIds: string[];
  updatedAt: string;
}

/**
 * A review (spec/rituais.md): `focus` (Revisão de Foco, section 2) or `direction` (Revisão de
 * Rumo, section 4). `week` (id `week:2026-W41`) and `month` (id `month:2026-10`) are the weekly
 * and monthly reflections from before the reviews, kept as history.
 */
export interface Reflection {
  id: string;
  kind: 'focus' | 'direction' | 'week' | 'month';
  period: string;
  start: DayKey;
  end: DayKey;
  bestMoments: string;
  improvements: string;
  closedAt: string | null;
  updatedAt: string;
}

/** User settings, a single record with id `main`. Goes into backups. */
export interface Settings {
  id: 'main';
  /**
   * How many checkouts and Revisões de Foco make each review available; absent numbers use the
   * defaults. Records saved before the reviews may still carry `weeklyReflection` (weekday and
   * hour of the weekly reflection), which nothing reads anymore.
   */
  reviewCadence?: Partial<ReviewCadence>;
  /** Section 3: weekdays the user works (0 = Sunday). Absent means every day. */
  activeDays?: number[];
  /** Section 3: the warm-up checklist, in order. Empty or absent means no warm up. */
  warmupItems?: WarmupItem[];
  /**
   * Limits, in days of waiting, for the colors of the cleanup dashboard; absent assistants use
   * the defaults (ADR-045).
   */
  cleanupAgeLimits?: Partial<Record<AssistantId, StatusLimits>>;
  /**
   * Limits by number of items, from before the colors measured age. Nothing reads them anymore:
   * a count would make no sense as days.
   */
  cleanupLimits?: Partial<Record<AssistantId, StatusLimits>>;
  /** Whether the side column of the project page stays docked, for every project. */
  projectPanelPinned?: boolean;
  /** Which groups of the project list are open; absent groups use their default. */
  projectListGroups?: Partial<Record<ProjectListGroup, boolean>>;
  /** Whether the sidebar is collapsed to a narrow strip. Absent means open. */
  sidebarCollapsed?: boolean;
  updatedAt: string;
}

/** Collapsible groups of the project list: "Outros ativos" (open by default) and "Finalizados" (closed). */
export type ProjectListGroup = 'others' | 'finished';

export interface WarmupItem {
  id: string;
  text: string;
}

/**
 * Section 3: something that comes back inside the app after a chosen time, like a warm-up item
 * asked again at XXh. The app never sends notifications.
 */
export interface Reminder {
  id: string;
  source: 'warmup';
  sourceId: string;
  /** Day the reminder was created for. */
  day: DayKey;
  text: string;
  dueAt: string;
  status: 'pending' | 'done' | 'dropped';
  createdAt: string;
  updatedAt: string;
}
/**
 * Section 4: an objective is a goal (a sentence the user decides was reached or not), a
 * motivation (provisional name), projects and resources.
 */
export interface Objective {
  id: string;
  goal: string;
  motivation: string;
  status: 'active' | 'finished';
  /** Set when finished: whether the goal was reached. */
  achieved: boolean | null;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
}

/** Section 4: notes or links that support an objective or a project. */
export interface Resource {
  id: string;
  ownerType: 'objective' | 'project';
  ownerId: string;
  /** Notes of a section linked as a resource at checkout. */
  sectionId: string | null;
  /** Or a link added by hand. */
  url: string | null;
  title: string;
  createdAt: string;
}

/** Section 6: an action with a recurrence and a "done" criterion; logged as yes or no. */
export interface Habit {
  id: string;
  name: string;
  criterion: string;
  /** Weekdays it is expected (0 = Sunday). */
  weekdays: number[];
  objectiveId: string | null;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface HabitLog {
  /** `${habitId}:${day}` */
  id: string;
  habitId: string;
  day: DayKey;
  done: boolean;
  updatedAt: string;
}