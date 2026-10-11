import { useRef, useState, type ChangeEvent } from 'react';
import { parseBackup, type BackupFile, type ImportLoss } from '../../application/backup';
import {
  getImportSnapshotDate,
  getLastBackupAt,
  importBackup,
  previewImport,
  undoImport,
} from '../../infrastructure/backupRepository';
import { canPickBackupFile, getSavedBackupFileName, readBackupFile } from '../../infrastructure/backupFiles';
import { db } from '../services';
import { useLiveQuery } from '../useLiveQuery';
import { ImportDialog } from './ImportDialog';
import type { useBackupActions } from './useBackupActions';

interface Props {
  actions: ReturnType<typeof useBackupActions>;
  storagePersisted: boolean | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' });
}

export function BackupPanel({ actions, storagePersisted }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ backup: BackupFile; loss: ImportLoss } | null>(null);

  const lastBackupAt = useLiveQuery(() => getLastBackupAt(db));
  const snapshotDate = useLiveQuery(() => getImportSnapshotDate(db));
  const savedFileName = useLiveQuery(() => getSavedBackupFileName(db));

  async function onFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const result = parseBackup(await readBackupFile(file));
    if (!result.ok) {
      actions.setStatus({ kind: 'error', message: result.error });
      return;
    }
    setPending({ backup: result.backup, loss: await previewImport(db, result.backup) });
  }

  async function confirmImport() {
    if (!pending) return;
    setPending(null);
    try {
      await importBackup(db, pending.backup, new Date());
      actions.setStatus({ kind: 'success', message: 'Backup importado.' });
    } catch {
      actions.setStatus({ kind: 'error', message: 'Não foi possível importar. Seus dados não foram alterados.' });
    }
  }

  async function onUndo() {
    try {
      await undoImport(db);
      actions.setStatus({ kind: 'success', message: 'Importação desfeita. Os dados voltaram ao que eram antes.' });
    } catch {
      actions.setStatus({ kind: 'error', message: 'Não foi possível desfazer a importação.' });
    }
  }

  return (
    <section className="panel" aria-labelledby="backup-title">
      <h2 id="backup-title">Dados e backup</h2>
      <p className="muted">
        Seus dados ficam só neste navegador. Para não perdê-los e para trocar de computador, salve um backup, de
        preferência numa pasta sincronizada do Google Drive.
      </p>

      <div className="panel__actions">
        {canPickBackupFile() && (
          <button type="button" className="primary" onClick={actions.saveToNewFile}>
            Salvar backup em…
          </button>
        )}
        <button type="button" onClick={actions.download}>
          Baixar backup
        </button>
        <button type="button" onClick={() => fileInput.current?.click()}>
          Importar backup
        </button>
        {snapshotDate && (
          <button type="button" onClick={onUndo}>
            Desfazer importação
          </button>
        )}
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="visually-hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={onFileChosen}
      />

      <p className="muted">
        {lastBackupAt ? `Último backup: ${formatDate(lastBackupAt)}.` : 'Nenhum backup feito ainda.'}
        {savedFileName && ` O backup rápido salva em "${savedFileName}".`}
      </p>
      {storagePersisted === false && (
        <p className="muted">
          O Chrome não garantiu o armazenamento permanente deste site. Faça backups com frequência.
        </p>
      )}

      {actions.status && (
        <p className={`status ${actions.status.kind === 'error' ? 'status--error' : ''}`} role="status">
          {actions.status.message}
        </p>
      )}

      {pending && (
        <ImportDialog
          backup={pending.backup}
          loss={pending.loss}
          onConfirm={confirmImport}
          onCancel={() => setPending(null)}
        />
      )}
    </section>
  );
}
