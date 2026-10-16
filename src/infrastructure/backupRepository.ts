import {
  BACKUP_TABLES,
  computeImportLoss,
  createBackup,
  type BackupFile,
  type BackupTables,
  type ImportLoss,
} from '../application/backup';
import { toDayKey } from '../domain/day';
import type { EventData, EventOf } from '../domain/events';
import type { AppDatabase } from './db';

const SNAPSHOT_ID = 'before-import';
const LAST_BACKUP_KEY = 'lastBackupAt';
const OVERWRITE_ALLOWED_KEY = 'autoBackupOverwriteAllowed';

function userTables(db: AppDatabase) {
  return [db.blocks, db.sections, db.projects, db.days, db.events, db.priorities, db.reflections, db.settings, db.reminders, db.objectives, db.resources, db.habits, db.habitLogs, db.people];
}

export async function readAllTables(db: AppDatabase): Promise<BackupTables> {
  return db.transaction('r', userTables(db), async () => ({
    blocks: await db.blocks.toArray(),
    sections: await db.sections.toArray(),
    projects: await db.projects.toArray(),
    days: await db.days.toArray(),
    events: await db.events.toArray(),
    priorities: await db.priorities.toArray(),
    reflections: await db.reflections.toArray(),
    settings: await db.settings.toArray(),
    reminders: await db.reminders.toArray(),
    objectives: await db.objectives.toArray(),
    resources: await db.resources.toArray(),
    habits: await db.habits.toArray(),
    habitLogs: await db.habitLogs.toArray(),
    people: await db.people.toArray(),
  }));
}

async function replaceAllTables(db: AppDatabase, tables: BackupTables): Promise<void> {
  for (const name of BACKUP_TABLES) {
    await db[name].clear();
    // Each table holds its own row type; the union cast keeps Dexie's typing happy.
    await (db[name] as unknown as { bulkAdd(rows: unknown[]): Promise<unknown> }).bulkAdd(tables[name]);
  }
}

export async function exportBackup(db: AppDatabase, now: Date): Promise<BackupFile> {
  return createBackup(await readAllTables(db), now);
}

export async function markBackupDone(db: AppDatabase, at: Date): Promise<void> {
  await db.meta.put({ key: LAST_BACKUP_KEY, value: at.toISOString() });
}

export async function getLastBackupAt(db: AppDatabase): Promise<string | null> {
  const entry = await db.meta.get(LAST_BACKUP_KEY);
  return typeof entry?.value === 'string' ? entry.value : null;
}

export async function previewImport(db: AppDatabase, backup: BackupFile): Promise<ImportLoss> {
  return computeImportLoss(await readAllTables(db), backup.tables);
}

/**
 * Importing and undoing replace the whole history, so each leaves an event in the history it
 * puts in place (issue #37): the history then shows that its data came from a file.
 */
function backupEvent<T extends 'backup.imported' | 'backup.importUndone'>(type: T, now: Date, id: string, data: EventData[T]): EventOf<T> {
  return { id, type, entityType: 'backup', entityId: 'backup', at: now.toISOString(), day: toDayKey(now), data };
}

/**
 * Replaces all user data with the backup. The current data is saved first as a snapshot,
 * in the same transaction, so a failed import changes nothing and a finished one can be undone.
 */
export async function importBackup(db: AppDatabase, backup: BackupFile, now: Date, eventId: string = crypto.randomUUID()): Promise<void> {
  await db.transaction('rw', [...userTables(db), db.snapshots, db.meta], async () => {
    const current = await readAllTables(db);
    await db.snapshots.put({ id: SNAPSHOT_ID, createdAt: now.toISOString(), tables: current });
    await replaceAllTables(db, backup.tables);
    await db.events.add(backupEvent('backup.imported', now, eventId, { exportedAt: backup.exportedAt, schemaVersion: backup.schemaVersion }));
    await allowAutoBackupOverwrite(db);
  });
}

/**
 * After an import or an undo, the user chose the browser's data on purpose, so the next
 * automatic backup may replace whatever the backup file holds. Persisted so it survives
 * closing the tab before that write happens.
 */
async function allowAutoBackupOverwrite(db: AppDatabase): Promise<void> {
  await db.meta.put({ key: OVERWRITE_ALLOWED_KEY, value: true });
}

export async function isAutoBackupOverwriteAllowed(db: AppDatabase): Promise<boolean> {
  return (await db.meta.get(OVERWRITE_ALLOWED_KEY))?.value === true;
}

export async function clearAutoBackupOverwrite(db: AppDatabase): Promise<void> {
  await db.meta.delete(OVERWRITE_ALLOWED_KEY);
}

export async function getImportSnapshotDate(db: AppDatabase): Promise<string | null> {
  const snapshot = await db.snapshots.get(SNAPSHOT_ID);
  return snapshot?.createdAt ?? null;
}

/** Restores the data as it was right before the last import. */
export async function undoImport(db: AppDatabase, now = new Date(), eventId: string = crypto.randomUUID()): Promise<void> {
  await db.transaction('rw', [...userTables(db), db.snapshots, db.meta], async () => {
    const snapshot = await db.snapshots.get(SNAPSHOT_ID);
    if (!snapshot) throw new Error('There is no import to undo');
    await replaceAllTables(db, snapshot.tables);
    await db.events.add(backupEvent('backup.importUndone', now, eventId, { importedAt: snapshot.createdAt }));
    await db.snapshots.delete(SNAPSHOT_ID);
    await allowAutoBackupOverwrite(db);
  });
}
