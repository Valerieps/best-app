import Dexie, { type Table, type Transaction } from 'dexie';
import type { BackupTables } from '../application/backup';
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
import { toDayKey } from '../domain/day';
import { migrateMonthPriorityLists, migrateToFocusList } from '../domain/focusProjects';
import { undateArchivedTask } from '../domain/tasks';

/** App settings and bookkeeping that never go into a backup (e.g. file handles). */
export interface MetaEntry {
  key: string;
  value: unknown;
}

/** Copy of all user data taken right before an import, so the import can be undone. */
export interface Snapshot {
  id: string;
  createdAt: string;
  tables: BackupTables;
}

export const DATABASE_NAME = 'best-app';

/** The last version declared below; raise it with each new `this.version(n)`. */
export const DATABASE_VERSION = 9;

/** Snapshot of the data as it was before the last database upgrade (ADR-059). */
export const UPGRADE_SNAPSHOT_ID = 'beforeUpgrade';

const snapshotted = new WeakSet<Transaction>();

/**
 * Copies every user table into `snapshots` before an upgrade changes any row, so a migration
 * with a bug can be undone by hand. When several versions upgrade in one go, only the first
 * copy is kept: it is the data as the previous app left it. Runs inside the upgrade
 * transaction, so a failed upgrade leaves no copy and no change.
 */
export async function snapshotBeforeUpgrade(tx: Transaction, now: Date = new Date()): Promise<void> {
  if (snapshotted.has(tx)) return;
  snapshotted.add(tx);
  const tables: Record<string, unknown[]> = {};
  // The stores that exist at this step; later versions' tables are not created yet.
  for (const name of Array.from(tx.idbtrans.objectStoreNames)) {
    if (name === 'snapshots' || name === 'meta') continue;
    tables[name] = await tx.table(name).toArray();
  }
  await tx.table('snapshots').put({ id: UPGRADE_SNAPSHOT_ID, createdAt: now.toISOString(), tables });
}

export class AppDatabase extends Dexie {
  blocks!: Table<Block, string>;
  sections!: Table<Section, string>;
  projects!: Table<Project, string>;
  days!: Table<DayRecord, string>;
  events!: Table<DomainEvent, string>;
  meta!: Table<MetaEntry, string>;
  snapshots!: Table<Snapshot, string>;
  priorities!: Table<PriorityList, string>;
  reflections!: Table<Reflection, string>;
  settings!: Table<Settings, string>;
  reminders!: Table<Reminder, string>;
  objectives!: Table<Objective, string>;
  resources!: Table<Resource, string>;
  habits!: Table<Habit, string>;
  habitLogs!: Table<HabitLog, string>;
  people!: Table<Person, string>;

  constructor(name = DATABASE_NAME) {
    super(name);
    // Each database version matches the BACKUP_SCHEMA_VERSION of the same number.
    // Only indexed fields are listed here. Rules for new versions (ADR-059): only add tables,
    // indexes or optional fields; never drop or rename in the same release; every `upgrade`
    // calls `snapshotBeforeUpgrade` first; `backup.ts` gets the same migration; a version, once
    // deployed, is never rolled back.
    this.version(1).stores({
      blocks: 'id, sectionId, status, intendedDate, projectId',
      sections: 'id, day, projectId',
      projects: 'id, status',
      days: 'day',
      events: 'id, at, day, type, entityId',
      meta: 'key',
      snapshots: 'id, createdAt',
    });
    // 1b: day priorities, and deadlines become searchable.
    this.version(2).stores({
      blocks: 'id, sectionId, status, intendedDate, projectId, deadline',
      priorities: 'id',
    });
    // Section 2: weekly reflections and user settings.
    this.version(3).stores({
      reflections: 'id',
      settings: 'id',
    });
    // Section 3: reminders that come back inside the app.
    this.version(4).stores({
      reminders: 'id, status, dueAt',
    });
    // Sections 4 and 6: objectives, their resources, habits and their logs.
    this.version(5).stores({
      objectives: 'id, status',
      resources: 'id, ownerId',
      habits: 'id, status',
      habitLogs: 'id, habitId, day',
    });
    // Section 2: the priority projects move from the month to the week (ADR-035).
    this.version(6)
      .stores({ priorities: 'id' })
      .upgrade(async (tx) => {
        await snapshotBeforeUpgrade(tx);
        const table = tx.table('priorities');
        const rows = await table.toArray();
        const migrated = migrateMonthPriorityLists(rows);
        await table.clear();
        await table.bulkPut(migrated);
      });
    // Section 2: the Revisão de Foco replaces the week lists with a single list in focus. The
    // week lists stay as the history of the raio-x.
    this.version(7)
      .stores({ priorities: 'id' })
      .upgrade(async (tx) => {
        await snapshotBeforeUpgrade(tx);
        const table = tx.table('priorities');
        const rows = await table.toArray();
        const migrated = migrateToFocusList(rows, toDayKey(new Date()));
        if (migrated.length > rows.length) await table.put(migrated[migrated.length - 1]);
      });
    // Archiving was removed: archived tasks become active tasks without a date (ADR-049).
    this.version(8)
      .stores({ blocks: 'id, sectionId, status, intendedDate, projectId, deadline' })
      .upgrade(async (tx) => {
        await snapshotBeforeUpgrade(tx);
        await tx
          .table('blocks')
          .where('status')
          .equals('archived')
          .modify((row: Record<string, unknown>) => {
            Object.assign(row, undateArchivedTask(row));
          });
      });
    // People cited with `@` (spec/pessoas.md).
    this.version(9).stores({
      people: 'id, status',
    });
  }
}
