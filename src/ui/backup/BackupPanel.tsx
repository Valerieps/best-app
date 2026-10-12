import { useRef, type ChangeEvent } from 'react';
import type { AutoBackupState } from '../../infrastructure/autoBackup';
import { getImportSnapshotDate, getLastBackupAt } from '../../infrastructure/backupRepository';
import { randomIds } from '../../infrastructure/browser';
import { db } from '../services';
import { useLiveQuery } from '../useLiveQuery';
import type { BackupActions } from './useBackup';

interface Props {
  state: AutoBackupState;
  actions: BackupActions;
  storagePersisted: boolean | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' });
}

function fileName(state: AutoBackupState): string | null {
  return 'fileName' in state ? state.fileName : null;
}

export function BackupPanel({ state, actions, storagePersisted }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const lastBackupAt = useLiveQuery(() => getLastBackupAt(db));
  const snapshotDate = useLiveQuery(() => getImportSnapshotDate(db));
  const currentFile = fileName(state);

  function onFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void actions.importFromFile(file);
  }

  return (
    <section className="panel" aria-labelledby="backup-title">
      <h2 id="backup-title">Dados e backup</h2>
      <p className="muted">
        Seus dados ficam só neste navegador. O backup automático grava uma cópia num arquivo a cada mudança. Escolha
        um arquivo numa pasta sincronizada do Google Drive para trocar de computador sem perder nada.
      </p>

      <div className="panel__actions">
        {state.status === 'needsPermission' && (
          <button type="button" className="primary" onClick={actions.resume}>
            Retomar backup
          </button>
        )}
        {state.status !== 'unsupported' && (
          <button
            type="button"
            className={state.status === 'needsPermission' ? undefined : 'primary'}
            onClick={actions.chooseFile}
          >
            {currentFile ? 'Trocar arquivo do backup' : 'Ativar backup automático'}
          </button>
        )}
        <button type="button" onClick={actions.download}>
          Baixar uma cópia
        </button>
        <button type="button" onClick={() => fileInput.current?.click()}>
          Importar backup
        </button>
        {snapshotDate && (
          <button type="button" onClick={actions.undo}>
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

      {import.meta.env.DEV && (
        <div className="panel__actions">
          <button
            type="button"
            onClick={async () => {
              // Dynamic import, so the generator stays out of the production build.
              const { buildSyntheticBackup } = await import('../../dev/syntheticData');
              await actions.reviewImport(await buildSyntheticBackup(new Date(), randomIds));
            }}
          >
            Carregar dados sintéticos
          </button>
          <span className="muted">Só no modo de desenvolvimento. Substitui tudo, como uma importação.</span>
        </div>
      )}

      <p className="muted">
        {currentFile ? `Backup automático em "${currentFile}". ` : ''}
        {lastBackupAt ? `Último backup: ${formatDate(lastBackupAt)}.` : 'Nenhum backup feito ainda.'}
      </p>
      {storagePersisted === false && (
        <p className="muted">O Chrome não garantiu o armazenamento permanente deste site. Mantenha o backup ativo.</p>
      )}

      {actions.message && (
        <p className={`status ${actions.message.kind === 'error' ? 'status--error' : ''}`} role="status">
          {actions.message.text}
        </p>
      )}
    </section>
  );
}
