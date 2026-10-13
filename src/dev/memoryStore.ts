import { BACKUP_TABLES, TABLE_KEYS, type BackupTableName, type BackupTables } from '../application/backup';
import type { Reader, Repository, Store, StoreTransaction } from '../application/ports';
import type { DayKey } from '../domain/day';
import type {
  Block,
  DayRecord,
  Habit,
  HabitLog,
  Objective,
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

/**
 * In-memory Store and Reader, used to run the real use cases off the database (e.g. to build
 * synthetic data). Mirrors DexieStore and DexieReader. Transactions are not rolled back on
 * error: a failed run is meant to be thrown away, not kept.
 */
export class MemoryStore implements Store, Reader {
  private readonly tables = new Map<BackupTableName, Map<string, unknown>>(
    BACKUP_TABLES.map((name) => [name, new Map<string, unknown>()]),
  );

  private rows<T>(name: BackupTableName): T[] {
    return [...this.tables.get(name)!.values()] as T[];
  }

  private repository<T>(name: BackupTableName): Repository<T> {
    const table = this.tables.get(name)!;
    const key = TABLE_KEYS[name];
    return {
      get: async (id) => {
        const row = table.get(id);
        return row === undefined ? undefined : (structuredClone(row) as T);
      },
      put: async (entity) => {
        table.set((entity as Record<string, string>)[key], structuredClone(entity));
      },
      delete: async (id) => {
        table.delete(id);
      },
    };
  }

  async transaction<T>(work: (tx: StoreTransaction) => Promise<T>): Promise<T> {
    return work({
      blocks: this.repository('blocks'),
      sections: this.repository('sections'),
      projects: this.repository('projects'),
      days: this.repository('days'),
      priorities: this.repository('priorities'),
      reflections: this.repository('reflections'),
      settings: this.repository('settings'),
      reminders: this.repository('reminders'),
      objectives: this.repository('objectives'),
      resources: this.repository('resources'),
      habits: this.repository('habits'),
      habitLogs: this.repository('habitLogs'),
      blocksInSection: async (sectionId) => this.blocks().filter((block) => block.sectionId === sectionId),
      blocksOfProject: async (projectId) => this.blocks().filter((block) => block.projectId === projectId),
      sectionsOfProject: async (projectId) => this.sections().filter((section) => section.projectId === projectId),
      priorityListsBetween: (fromId, toId) => this.priorityListsBetween(fromId, toId),
      appendEvent: async (event) => {
        const events = this.tables.get('events')!;
        if (events.has(event.id)) throw new Error(`Event ${event.id} already exists`);
        events.set(event.id, structuredClone(event));
      },
    });
  }

  /** Every table, as a backup holds them. */
  snapshot(): BackupTables {
    return Object.fromEntries(BACKUP_TABLES.map((name) => [name, structuredClone(this.rows(name))])) as unknown as BackupTables;
  }

  private blocks(): Block[] {
    return this.rows<Block>('blocks');
  }

  private sections(): Section[] {
    return this.rows<Section>('sections');
  }

  async sectionsOfDay(day: DayKey) {
    return this.sections().filter((section) => section.day === day);
  }

  async sectionsByIds(ids: string[]) {
    return this.sections().filter((section) => ids.includes(section.id));
  }

  async sectionsNeedingTriage() {
    return this.sections().filter(
      (section) =>
        section.notesDestination === 'pending' || (section.projectId === null && section.whiteboardDecision === 'pending'),
    );
  }

  async wikiSections() {
    return this.sections().filter((section) => section.notesDestination === 'wiki');
  }

  async blocksInSections(sectionIds: string[]) {
    return this.blocks().filter((block) => sectionIds.includes(block.sectionId));
  }

  async tasksIntendedFor(day: DayKey) {
    return this.blocks().filter((block) => block.intendedDate === day);
  }

  async tasksWithStatus(status: TaskStatus) {
    return this.blocks().filter((block) => block.status === status);
  }

  async projects() {
    return this.rows<Project>('projects');
  }

  async blocksByIds(ids: string[]) {
    return ids.flatMap((id) => this.blocks().filter((block) => block.id === id));
  }

  async tasksWithDeadline(day: DayKey) {
    return this.blocks().filter((block) => block.deadline === day);
  }

  async priorityList(id: string) {
    return this.repository<PriorityList>('priorities').get(id);
  }

  async sectionsWithStatus(decision: Section['whiteboardDecision']) {
    return this.sections().filter((section) => section.whiteboardDecision === decision);
  }

  async sectionsWithNotesDestination(destination: Section['notesDestination']) {
    return this.sections().filter((section) => section.notesDestination === destination);
  }

  async tasksAwaitingReflection() {
    return this.blocks().filter((block) => block.status === 'active' && block.awaitingReflection === true);
  }

  async eventsOfEntities(ids: string[]) {
    const wanted = new Set(ids);
    return this.rows<DomainEvent>('events').filter((event) => wanted.has(event.entityId));
  }

  async eventsBetween(startDay: DayKey, endDay: DayKey) {
    return this.rows<DomainEvent>('events').filter(
      (event) => event.day >= startDay && event.day <= endDay,
    );
  }

  async reflection(id: string) {
    return this.repository<Reflection>('reflections').get(id);
  }

  async reflections() {
    return this.rows<Reflection>('reflections');
  }

  async settings() {
    return this.repository<Settings>('settings').get('main');
  }

  async blocksOfProject(projectId: string) {
    return this.blocks().filter((block) => block.projectId === projectId);
  }

  async sectionsOfProject(projectId: string) {
    return this.sections().filter((section) => section.projectId === projectId);
  }

  async pendingReminders() {
    return this.rows<Reminder>('reminders').filter((reminder) => reminder.status === 'pending');
  }

  async dayRecord(day: DayKey) {
    return this.repository<DayRecord>('days').get(day);
  }

  async objectives() {
    return this.rows<Objective>('objectives');
  }

  async resourcesOf(ownerId: string) {
    return this.rows<Resource>('resources').filter((resource) => resource.ownerId === ownerId);
  }

  async habits() {
    return this.rows<Habit>('habits');
  }

  async habitLogsBetween(startDay: DayKey, endDay: DayKey) {
    return this.rows<HabitLog>('habitLogs').filter(
      (log) => log.day >= startDay && log.day <= endDay,
    );
  }

  async priorityListsBetween(fromId: string, toId: string) {
    return structuredClone(this.rows<PriorityList>('priorities').filter((list) => list.id >= fromId && list.id <= toId));
  }
}
