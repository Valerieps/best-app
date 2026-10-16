import { useCallback, useState, useSyncExternalStore } from 'react';
import { parseBackup, type BackupFile, type ImportLoss } from '../../application/backup';
import { exportBackup, importBackup, previewImport, undoImport } from '../../infrastructure/backupRepository';
import { downloadBackup, readBackupFile } from '../../infrastructure/backupFiles';
import { autoBackup, db } from '../services';
import { runAfterPendingWrites } from '../writeQueue';

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

  const chooseFolder = useCallback(async () => {
    try {
      await autoBackup.chooseFolder();
      if (autoBackup.getState().status === 'active') setMessage({ kind: 'success', text: 'Backup automático ativado.' });
    } catch (error) {
      if (!isUserCancel(error)) setMessage({ kind: 'error', text: 'Não foi possível gravar nessa pasta.' });
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

  /** Restores a dated copy through the import, which shows what would be lost and can be undone. */
  const restoreCopy = useCallback(
    async (name: string) => {
      try {
        const result = parseBackup(JSON.parse(await autoBackup.readCopy(name)));
        if (!result.ok) return setMessage({ kind: 'error', text: result.error });
        await reviewImport(result.backup);
      } catch {
        setMessage({ kind: 'error', text: 'Não foi possível ler essa cópia.' });
      }
    },
    [reviewImport],
  );

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
      await runAfterPendingWrites(() => importBackup(db, pendingImport.backup, new Date()));
      setMessage({ kind: 'success', text: 'Backup importado.' });
      await autoBackup.flush();
    } catch {
      setMessage({ kind: 'error', text: 'Não foi possível importar. Seus dados não foram alterados.' });
    }
  }, [pendingImport]);

  const cancelImport = useCallback(() => setPendingImport(null), []);

  const undo = useCallback(async () => {
    try {
      await runAfterPendingWrites(() => undoImport(db));
      setMessage({ kind: 'success', text: 'Importação desfeita. Os dados voltaram ao que eram antes.' });
      await autoBackup.flush();
    } catch {
      setMessage({ kind: 'error', text: 'Não foi possível desfazer a importação.' });
    }
  }, []);

  return {
    message,
    pendingImport,
    chooseFolder,
    restoreCopy,
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
