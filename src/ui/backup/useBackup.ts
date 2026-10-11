import { useCallback, useState, useSyncExternalStore } from 'react';
import { parseBackup, type BackupFile, type ImportLoss } from '../../application/backup';
import { exportBackup, importBackup, previewImport, undoImport } from '../../infrastructure/backupRepository';
import { downloadBackup, readBackupFile } from '../../infrastructure/backupFiles';
import { autoBackup, db } from '../services';

export interface BackupMessage {
  kind: 'success' | 'error';
  text: string;
}

export interface PendingImport {
  backup: BackupFile;
  loss: ImportLoss;
}

function isUserCancel(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function useAutoBackupState() {
  return useSyncExternalStore(autoBackup.subscribe, autoBackup.getState);
}

/** Backup actions shared by the banner, the top bar and the backup panel. */
export function useBackup() {
  const [message, setMessage] = useState<BackupMessage | null>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);

  const chooseFile = useCallback(async () => {
    try {
      await autoBackup.chooseFile();
      setMessage({ kind: 'success', text: 'Backup automático ativado.' });
    } catch (error) {
      if (!isUserCancel(error)) setMessage({ kind: 'error', text: 'Não foi possível gravar nesse arquivo.' });
    }
  }, []);

  const resume = useCallback(() => autoBackup.resume(), []);

  const download = useCallback(async () => {
    const now = new Date();
    downloadBackup(await exportBackup(db, now), now);
  }, []);

  /** Shows the import dialog, with what would be lost, for a backup already parsed. */
  const reviewImport = useCallback(async (backup: BackupFile) => {
    setPendingImport({ backup, loss: await previewImport(db, backup) });
  }, []);

  const importFromFile = useCallback(
    async (file: File) => {
      const result = parseBackup(await readBackupFile(file));
      if (!result.ok) return setMessage({ kind: 'error', text: result.error });
      await reviewImport(result.backup);
    },
    [reviewImport],
  );

  const confirmImport = useCallback(async () => {
    if (!pendingImport) return;
    setPendingImport(null);
    try {
      await importBackup(db, pendingImport.backup, new Date());
      setMessage({ kind: 'success', text: 'Backup importado.' });
      await autoBackup.flush();
    } catch {
      setMessage({ kind: 'error', text: 'Não foi possível importar. Seus dados não foram alterados.' });
    }
  }, [pendingImport]);

  const cancelImport = useCallback(() => setPendingImport(null), []);

  const undo = useCallback(async () => {
    try {
      await undoImport(db);
      setMessage({ kind: 'success', text: 'Importação desfeita. Os dados voltaram ao que eram antes.' });
      await autoBackup.flush();
    } catch {
      setMessage({ kind: 'error', text: 'Não foi possível desfazer a importação.' });
    }
  }, []);

  return {
    message,
    pendingImport,
    chooseFile,
    resume,
    retry: () => autoBackup.flush(),
    download,
    reviewImport,
    importFromFile,
    confirmImport,
    cancelImport,
    undo,
  };
}

export type BackupActions = ReturnType<typeof useBackup>;
