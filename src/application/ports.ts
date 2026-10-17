import type { DayKey } from '../domain/day';
import type {
  Block,
  DayRecord,
  Habit,
  HabitLog,
  Objective,
  Person,
  PriorityList,
  Project,
  Reflection,
  Reminder,
  Resource,
  Section,
  Settings,
  TaskStatus,
} from '../domain/entities';
import type { DomainEvent } from '../domain/events';

export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  next(): string;
}

export interface Repository<T> {
  get(key: string): Promise<T | undefined>;
  put(entity: T): Promise<void>;
  delete(key: string): Promise<void>;
}

/** Everything a use case can touch inside one atomic unit of work. */
export interface StoreTransaction {
  blocks: Repository<Block>;
  sections: Repository<Section>;
  projects: Repository<Project>;
  days: Repository<DayRecord>;
  priorities: Repository<PriorityList>;
  /** Closed reviews: history only since ADR-060, kept so backups carry them. */
  reflections: Repository<Reflection>;
  settings: Repository<Settings>;
  reminders: Repository<Reminder>;
  objectives: Repository<Objective>;
  resources: Repository<Resource>;
  habits: Repository<Habit>;
  habitLogs: Repository<HabitLog>;
  people: Repository<Person>;
  allPeople(): Promise<Person[]>;
  /** Blocks whose text has an `@`: the ones that may cite someone (spec/pessoas.md). */
  blocksWithMentions(): Promise<Block[]>;
  blocksInSection(sectionId: string): Promise<Block[]>;
  blocksOfProject(projectId: string): Promise<Block[]>;
  sectionsOfProject(projectId: string): Promise<Section[]>;
  /** Priority lists whose ids are between `fromId` and `toId`, both included. */
  priorityListsBetween(fromId: string, toId: string): Promise<PriorityList[]>;
  appendEvent(event: DomainEvent): Promise<void>;
}

export interface Store {
  /**
   * Runs `work` atomically: entity changes and their events are saved together,
   * or nothing is saved if `work` throws.
   */
  transaction<T>(work: (tx: StoreTransaction) => Promise<T>): Promise<T>;
}

/** Read side used by the queries. Implementations must be reactive-friendly (no side effects). */
export interface Reader {
  sectionsOfDay(day: DayKey): Promise<Section[]>;
  sectionsByIds(ids: string[]): Promise<Section[]>;
  /** Sections whose notes or whiteboard decision may still be pending. */
  sectionsNeedingTriage(): Promise<Section[]>;
  wikiSections(): Promise<Section[]>;
  blocksInSections(sectionIds: string[]): Promise<Block[]>;
  tasksIntendedFor(day: DayKey): Promise<Block[]>;
  tasksWithStatus(status: TaskStatus): Promise<Block[]>;
  projects(): Promise<Project[]>;
  blocksByIds(ids: string[]): Promise<Block[]>;
  tasksWithDeadline(day: DayKey): Promise<Block[]>;
  priorityList(id: string): Promise<PriorityList | undefined>;
  sectionsWithStatus(decision: Section['whiteboardDecision']): Promise<Section[]>;
  sectionsWithNotesDestination(destination: Section['notesDestination']): Promise<Section[]>;
  eventsBetween(startDay: DayKey, endDay: DayKey): Promise<DomainEvent[]>;
  /** Every event about these entities, such as the finishes and reopenings of some tasks. */
  eventsOfEntities(ids: string[]): Promise<DomainEvent[]>;
  settings(): Promise<Settings | undefined>;
  blocksOfProject(projectId: string): Promise<Block[]>;
  sectionsOfProject(projectId: string): Promise<Section[]>;
  pendingReminders(): Promise<Reminder[]>;
  dayRecord(day: DayKey): Promise<DayRecord | undefined>;
  objectives(): Promise<Objective[]>;
  resourcesOf(ownerId: string): Promise<Resource[]>;
  habits(): Promise<Habit[]>;
  habitLogsBetween(startDay: DayKey, endDay: DayKey): Promise<HabitLog[]>;
  /** Priority lists whose ids are between `fromId` and `toId` (e.g. every day of a month). */
  priorityListsBetween(fromId: string, toId: string): Promise<PriorityList[]>;
  people(): Promise<Person[]>;
  /** Blocks whose text has an `@`: the ones that may cite someone (spec/pessoas.md). */
  blocksWithMentions(): Promise<Block[]>;
}

export interface AppContext {
  store: Store;
  clock: Clock;
  ids: IdGenerator;
}
