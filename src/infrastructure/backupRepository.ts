import {
  BACKUP_TABLES,
  computeImportLoss,
  createBackup,
  type BackupFile,
  type BackupTables,
  type ImportLoss,
} from '../application/backup';
import type { AppDatabase } from './db';

const SNAPSHOT_ID = 'before-import';
const LAST_BACKUP_KEY = 'lastBackupAt';

function userTables(db: AppDatabase) {
  return [db.blocks, db.sections, db.projects, db.days, db.events];
}

export async function readAllTables(db: AppDatabase): Promise<BackupTables> {
  return db.transaction('r', userTables(db), async () => ({
    blocks: await db.blocks.toArray(),
    sections: await db.sections.toArray(),
    projects: await db.projects.toArray(),
    days: await db.days.toArray(),
    events: await db.events.toArray(),
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
 * Replaces all user data with the backup. The current data is saved first as a snapshot,
 * in the same transaction, so a failed import changes nothing and a finished one can be undone.
 */
export async function importBackup(db: AppDatabase, backup: BackupFile, now: Date): Promise<void> {
  await db.transaction('rw', [...userTables(db), db.snapshots], async () => {
    const current = await readAllTables(db);
    await db.snapshots.put({ id: SNAPSHOT_ID, createdAt: now.toISOString(), tables: current });
    await replaceAllTables(db, backup.tables);
  });
}

export async function getImportSnapshotDate(db: AppDatabase): Promise<string | null> {
  const snapshot = await db.snapshots.get(SNAPSHOT_ID);
  return snapshot?.createdAt ?? null;
}

/** Restores the data as it was right before the last import. */
export async function undoImport(db: AppDatabase): Promise<void> {
  await db.transaction('rw', [...userTables(db), db.snapshots], async () => {
    const snapshot = await db.snapshots.get(SNAPSHOT_ID);
    if (!snapshot) throw new Error('There is no import to undo');
    await replaceAllTables(db, snapshot.tables);
    await db.snapshots.delete(SNAPSHOT_ID);
  });
}
