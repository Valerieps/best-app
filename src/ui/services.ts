import type { AppContext } from '../application/ports';
import { AutoBackup } from '../infrastructure/autoBackup';
import { canPickBackupFile, dexieHandleStorage, pickBackupFile } from '../infrastructure/backupFiles';
import { systemClock, randomIds } from '../infrastructure/browser';
import { AppDatabase } from '../infrastructure/db';
import { DexieStore } from '../infrastructure/dexieStore';

/** Single database and context for the running app. Tests build their own. */
export const db = new AppDatabase();

export const autoBackup = new AutoBackup({
  db,
  handles: dexieHandleStorage(db),
  pick: pickBackupFile,
  supported: canPickBackupFile(),
  now: () => systemClock.now(),
});

export const appContext: AppContext = {
  // Every saved change schedules an automatic backup.
  store: new DexieStore(db, () => autoBackup.schedule()),
  clock: systemClock,
  ids: randomIds,
};
