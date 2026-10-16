import type { AutoBackupInterval } from '../domain/entities';
import { computeImportLoss, parseBackup, type BackupFile, type BackupTables, type ImportLoss } from './backup';

/**
 * Automatic backups rewrite the chosen file after every change. Before each automatic write
 * the app checks the file, so it never overwrites data the browser does not have — for example
 * when Chrome cleared the site data and the app opened empty, or when another computer saved
 * newer data to the same synced file.
 */

/** Wait after the last change before writing, so a burst of edits becomes one write. */
export const AUTO_BACKUP_DELAY_MS = 3000;

export const DEFAULT_AUTO_BACKUP_INTERVAL: AutoBackupInterval = 'afterChange';

/**
 * How long a change waits before it is written. After every change, each new change restarts
 * the short wait, so a burst becomes one write. With an interval, the first change starts the
 * wait and later ones join it: restarting would never write while the user keeps working.
 */
export function autoBackupWait(interval: AutoBackupInterval): { ms: number; restartOnChange: boolean } {
  switch (interval) {
    case 'afterChange':
      return { ms: AUTO_BACKUP_DELAY_MS, restartOnChange: true };
    case 'quarterHour':
      return { ms: 15 * 60 * 1000, restartOnChange: false };
    case 'hour':
      return { ms: 60 * 60 * 1000, restartOnChange: false };
  }
}

export type AutoBackupDecision =
  | { kind: 'write' }
  | { kind: 'blocked'; reason: 'invalidFile' }
  | { kind: 'blocked'; reason: 'fileHasMoreData'; fileBackup: BackupFile; loss: ImportLoss };

/**
 * @param fileText current contents of the backup file
 * @param current everything in the browser right now
 * @param overwriteAllowed true right after the user imported or undid an import, when replacing
 *   the file's data is exactly what they asked for
 */
export function decideAutoBackup(fileText: string, current: BackupTables, overwriteAllowed: boolean): AutoBackupDecision {
  if (fileText.trim() === '') return { kind: 'write' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(fileText);
  } catch {
    return { kind: 'blocked', reason: 'invalidFile' };
  }
  const result = parseBackup(parsed);
  // Never overwrite a file that is not a backup of this app, even if the user allowed overwriting.
  if (!result.ok) return { kind: 'blocked', reason: 'invalidFile' };
  if (overwriteAllowed) return { kind: 'write' };

  // What would be lost if the file's data were replaced by the browser's data.
  const loss = computeImportLoss(result.backup.tables, current);
  if (loss.hasLoss) return { kind: 'blocked', reason: 'fileHasMoreData', fileBackup: result.backup, loss };
  return { kind: 'write' };
}
