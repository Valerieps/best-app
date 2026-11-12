import type { DayKey } from './day';

/**
 * Entities stored by the app. Each block, section and project is its own record:
 * blocks exist only once, and the day note, projects and resources point at them instead of copying.
 * Timestamps are ISO 8601 strings.
 */

/** `idea` (phase 7): a line written with `[?] ` (spec/ideias.md). Not a task: no date, no triage. */
export type BlockKind = 'task' | 'note' | 'idea';

/**
 * Idea only (spec/ideias.md, "Destinos"): `open` until it gets a destination; `becameProject` and
 * `dropped` take it out of circulation. An idea that became a task is a task (`kind: 'task'`).
 */
export type IdeaStatus = 'open' | 'becameProject' | 'dropped';

/** converted (section 6): the task became a habit at checkout and left circulation. */
export type TaskStatus = 'active' | 'done' | 'abandoned' | 'converted';

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
  /** When the task was finished or abandoned. */
  closedAt: string | null;
  /**
   * Latest day whose checkout decided this task. A task is pending on a day it shows up in
   * only while this is earlier than that day. Null until the first triage.
   */
  lastTriagedDay: DayKey | null;
  /** Prazo máximo (1b), optional. Absent in records saved before 1b. */
  deadline?: DayKey | null;
  /**
   * Order among the tasks carried into a day from other days (request 2). Counts only while
   * `day` is the intended date; absent until the task is reordered.
   */
  carriedOrder?: { day: DayKey; position: string } | null;
  /**
   * Task only: something a person owes me ("aguardando", spec/pessoas.md). Its intended date is
   * the day to follow up ("data para cobrar"). Absent in records saved before people existed.
   */
  waiting?: boolean;
  /** Idea only (phase 7, ADR-067). Absent in other blocks. */
  ideaStatus?: IdeaStatus;
  /** Idea only: how many times I said "ainda não" to it. */
  notYetCount?: number;
  /** Idea only: when I last said "ainda não", or null. */
  lastNotYetAt?: string | null;
  /** Idea only: the hidden section where I write what I think about it, created on first use. */
  ideaSectionId?: string | null;
}

export type SectionKind = 'general' | 'meeting';

/** Where a section's notes go at checkout. All notes of a section are triaged together. */
/**
 * `wiki` means the day closed and the notes are kept: the name is historical, there is no wiki
 * (ADR-050). `discarded` only shows up in older data. Notes once left for the Revisão de Foco
 * (`weeklyReflection`) became `wiki` in version 10 (ADR-060).
 */
export type NotesDestination = 'pending' | 'wiki' | 'discarded';

/**
 * Checkout decision for a section still on whiteboard (no project). `keptUnlinked` means the
 * the (removed) whiteboards assistant was told to leave it as it is.
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
  /**
   * A note written on a project page's timeline: it belongs to no day note and shows only on
   * the project page. Its `day` is the day it was written. Absent in other sections.
   */
  projectNote?: boolean;
  /**
   * Phase 7: the idea whose page this section is; it holds what I write about the idea (ADR-067).
   * It belongs to no day note and no project: its tasks get the idea's project when written.
   * Absent in other sections.
   */
  ideaId?: string;
}

/** `merged` projects were joined into another one (`mergedInto`) by the (removed) duplicates assistant. */
/** `backlog`: kept for later, out of the active list (spec/projetos.md, "Backlog"). */
export type ProjectStatus = 'active' | 'backlog' | 'finished' | 'merged';

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
  mergedInto?: string | null;
  /** Projects the (removed) duplicates assistant was told are not the same as this one. */
  keepSeparateFrom?: string[];
  /** Section 4: at most one objective. */
  objectiveId?: string | null;
  /** Section 2: one of `PROJECT_ICONS`; absent or null shows the name's initial. */
  icon?: string | null;
  /** Phase 7: the idea this project grew from, and the idea's project then (spec/ideias.md). */
  fromIdeaId?: string | null;
  fromProjectId?: string | null;
}

/** Someone cited with `@Nome` (spec/pessoas.md). `merged` people were joined into `mergedInto`. */
export type PersonStatus = 'active' | 'archived' | 'merged';

export interface Person {
  id: string;
  /** One word, as written after the `@`. */
  name: string;
  status: PersonStatus;
  mergedInto?: string | null;
  createdAt: string;
  updatedAt: string;
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
 * 2, the single list of projects in focus) or `queue` (the "Fila de execução", ADR-069). `weekProjects:2026-W42` lists are the week's priority
 * projects from before the single list (ADR-035), kept as history, and so are the `next:<projectId>`
 * lists of the project next steps, removed in favor of the queue (ADR-070); before version 6
 * they were per month, with ids `month:AAAA-MM`.
 */
export interface PriorityList {
  id: string;
  /** `focusProjects` and `weekProjects` list projects; `day`, `queue` and the old `nextSteps` list tasks. */
  scope: 'day' | 'focusProjects' | 'weekProjects' | 'nextSteps' | 'queue';
  /** A day (AAAA-MM-DD), an ISO week (AAAA-Www) for the old week lists, or empty. */
  period: string;
  itemIds: string[];
  updatedAt: string;
}

/**
 * A closed review, kept as history with no screen since the reviews were removed (ADR-060):
 * `focus` (Revisão de Foco) or `direction` (Revisão de Rumo). `week` (id `week:2026-W41`) and
 * `month` (id `month:2026-10`) are the weekly and monthly reflections from before them.
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
/** Focus mode on one part of a day note: a section, "De outros dias" or the priorities. */
export interface DayNoteFocus {
  day: DayKey;
  /** The part's key: a section id, or the keys of the parts in `domain/order.ts`. */
  part: string;
  /**
   * Whether new lines can be written: true when the focus started on today's note. It stays
   * true past midnight, so the day turning never interrupts what I am writing.
   */
  writable: boolean;
}

export interface Settings {
  id: 'main';
  /*
   * Records saved before may still carry `reviewCadence` (the cadence of the reviews, removed in
   * ADR-060) or `weeklyReflection` (the weekly reflection before them), which nothing reads.
   */
  /** Section 3: weekdays the user works (0 = Sunday). Absent means every day. */
  activeDays?: number[];
  /** Section 3: the warm-up checklist, in order. Empty or absent means no warm up. */
  warmupItems?: WarmupItem[];
  /**
   * Days without a date, counted from creation, after which a task shows up in "Tarefas
   * esquecidas". Absent means the default (`DEFAULT_FORGOTTEN_TASK_DAYS`).
   */
  forgottenTaskDays?: number;
  /** Whether the side column of the project page stays docked, for every project. */
  projectPanelPinned?: boolean;
  /** Which groups of the project list are open; absent groups use their default. */
  projectListGroups?: Partial<Record<ProjectListGroup, boolean>>;
  /** Whether the sidebar is collapsed to a narrow strip. Absent means open. */
  sidebarCollapsed?: boolean;
  /** Width of the open sidebar, in pixels, dragged by the user. Absent means the default width. */
  sidebarWidth?: number;
  /**
   * The menu open in the right panel (spec/navegacao.md, "Painel da direita"). Absent or null
   * means the panel is collapsed to its strip of icons, the default.
   */
  rightPanelMenu?: RightPanelMenu | null;
  /** Width of the open right panel, in pixels, dragged by the user. Absent means the default width. */
  rightPanelWidth?: number;
  /** Whether the center area is collapsed to a narrow strip on the left. Absent means open. */
  centerCollapsed?: boolean;
  /**
   * The part of the day note shown alone, in focus mode (spec/nota-do-dia.md, "Modo foco").
   * Absent or null shows the whole note. Only the user leaves it.
   */
  dayNoteFocus?: DayNoteFocus | null;
  /** Light, dark or the system's appearance (spec/principios.md, "Aparência"). Absent means the system's. */
  appearance?: Appearance;
  /** How often the automatic backup writes the file (spec/principios.md, "Backup"). Absent means after every change. */
  autoBackupInterval?: AutoBackupInterval;
  updatedAt: string;
}

/** The app's appearance: always light, always dark, or following the system. */
export type Appearance = 'light' | 'dark' | 'system';

/** How often the automatic backup writes: a few seconds after every change, or at most every 15 minutes or hour. */
export type AutoBackupInterval = 'afterChange' | 'quarterHour' | 'hour';

/** Collapsible groups of the project list: "Outros ativos" (open by default) and "Finalizados" (closed). */
export type ProjectListGroup = 'others' | 'backlog' | 'finished';

/** Menus of the right panel (spec/navegacao.md, "Painel da direita"). */
export type RightPanelMenu = 'execute';

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