import { useCallback, useState } from 'react';
import { exportBackup, markBackupDone } from '../../infrastructure/backupRepository';
import {
  canPickBackupFile,
  downloadBackup,
  saveBackupToPickedFile,
  saveBackupToRememberedFile,
} from '../../infrastructure/backupFiles';
import { db } from '../services';

export interface BackupStatus {
  kind: 'success' | 'error';
  message: string;
}

function timeLabel(moment: Date): string {
  return moment.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function isUserCancel(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function useBackupActions() {
  const [status, setStatus] = useState<BackupStatus | null>(null);

  const run = useCallback(async (action: (now: Date) => Promise<string | null>) => {
    const now = new Date();
    try {
      const message = await action(now);
      if (message) {
        await markBackupDone(db, now);
        setStatus({ kind: 'success', message });
      }
    } catch (error) {
      if (isUserCancel(error)) return;
      setStatus({ kind: 'error', message: 'Não foi possível salvar o backup. Tente de novo.' });
    }
  }, []);

  /** Saves to a file the user picks (e.g. in a synced Google Drive folder) and remembers it. */
  const saveToNewFile = useCallback(
    () =>
      run(async (now) => {
        await saveBackupToPickedFile(db, await exportBackup(db, now), now);
        return `Backup salvo às ${timeLabel(now)}.`;
      }),
    [run],
  );

  /** Downloads the backup to the browser's download folder. */
  const download = useCallback(
    () =>
      run(async (now) => {
        downloadBackup(await exportBackup(db, now), now);
        return `Backup baixado às ${timeLabel(now)}.`;
      }),
    [run],
  );

  /** One click: the remembered file if there is one, otherwise ask where to save. */
  const quickSave = useCallback(
    () =>
      run(async (now) => {
        const backup = await exportBackup(db, now);
        if (await saveBackupToRememberedFile(db, backup)) return `Backup salvo às ${timeLabel(now)}.`;
        if (canPickBackupFile()) {
          await saveBackupToPickedFile(db, backup, now);
          return `Backup salvo às ${timeLabel(now)}.`;
        }
        downloadBackup(backup, now);
        return `Backup baixado às ${timeLabel(now)}.`;
      }),
    [run],
  );

  return { status, setStatus, quickSave, saveToNewFile, download };
}
