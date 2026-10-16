import Dexie, { type Table, type Transaction } from 'dexie';
import type { Repository, Store, StoreTransaction } from '../application/ports';
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
} from '../domain/entities';
import type { DomainEvent } from '../domain/events';
import type { AppDatabase } from './db';

function repository<T>(table: Table<T, string>): Repository<T> {
  return {
    get: (key) => table.get(key),
    put: async (entity) => {
      await table.put(entity);
    },
    delete: (key) => table.delete(key),
  };
}

export class DexieStore implements Store {
  /** @param onCommit called after every successful transaction, e.g. to schedule a backup */
  constructor(
    private readonly db: AppDatabase,
    private readonly onCommit: () => void = () => {},
  ) {}

  async transaction<T>(work: (tx: StoreTransaction) => Promise<T>): Promise<T> {
    const db = this.db;
    const result = await db.transaction('rw', [db.blocks, db.sections, db.projects, db.days, db.events, db.priorities, db.reflections, db.settings, db.reminders, db.objectives, db.resources, db.habits, db.habitLogs, db.people], (trans: Transaction) => {
      // Tables taken from the transaction object stay bound to it, so use cases can be plain
      // async functions. Dexie.waitFor keeps the transaction open across their native awaits,
      // which would otherwise make Dexie abort with PrematureCommitError (ADR-003).
      const blocks = trans.table('blocks') as Table<Block, string>;
      const events = trans.table('events') as Table<DomainEvent, string>;
      const sections = trans.table('sections') as Table<Section, string>;
      const priorities = trans.table('priorities') as Table<PriorityList, string>;
      return Dexie.waitFor(
        work({
          blocks: repository(blocks),
          sections: repository(sections),
          projects: repository(trans.table('projects') as Table<Project, string>),
          days: repository(trans.table('days') as Table<DayRecord, string>),
          priorities: repository(priorities),
          reflections: repository(trans.table('reflections') as Table<Reflection, string>),
          settings: repository(trans.table('settings') as Table<Settings, string>),
          reminders: repository(trans.table('reminders') as Table<Reminder, string>),
          objectives: repository(trans.table('objectives') as Table<Objective, string>),
          resources: repository(trans.table('resources') as Table<Resource, string>),
          habits: repository(trans.table('habits') as Table<Habit, string>),
          habitLogs: repository(trans.table('habitLogs') as Table<HabitLog, string>),
          people: repository(trans.table('people') as Table<Person, string>),
          allPeople: () => (trans.table('people') as Table<Person, string>).toArray(),
          blocksWithMentions: () => blocks.filter((block) => block.text.includes('@')).toArray(),
          blocksInSection: (sectionId) => blocks.where('sectionId').equals(sectionId).toArray(),
          blocksOfProject: (projectId) => blocks.where('projectId').equals(projectId).toArray(),
          sectionsOfProject: (projectId) => sections.where('projectId').equals(projectId).toArray(),
          priorityListsBetween: (fromId, toId) => priorities.where('id').between(fromId, toId, true, true).toArray(),
          appendEvent: async (event) => {
            // `add` (not `put`) so an existing event can never be overwritten.
            await events.add(event);
          },
        }),
      );
    });
    this.onCommit();
    return result;
  }
}
