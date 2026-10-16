import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { COPIES_FOLDER, COPIES_KEPT_TODAY, PAST_DAYS_KEPT } from '../../application/backupCopies';
import type { AutoBackupState, BackupCopy } from '../../infrastructure/autoBackup';
import { getImportSnapshotDate, getLastBackupAt } from '../../infrastructure/backupRepository';
import { randomIds } from '../../infrastructure/browser';
import { autoBackup, db } from '../services';
import { useLiveQueryState } from '../useLiveQuery';
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
  // This panel is the way out when something breaks, so its details never take it down.
  const lastBackupAt = useLiveQueryState(() => getLastBackupAt(db)).value;
  const snapshotDate = useLiveQueryState(() => getImportSnapshotDate(db)).value;
  const currentFile = fileName(state);
  const copies = useBackupCopies(state);

  function onFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void actions.importFromFile(file);
  }

  return (
    <section className="panel" aria-label="Backup">
      <p className="muted panel__intro">
        Seus dados ficam só neste navegador. O backup automático grava tudo, a cada mudança, numa pasta sua: uma pasta
        sincronizada do Google Drive da empresa deixa trocar de computador sem perder nada.
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
            onClick={actions.chooseFolder}
          >
            {currentFile ? 'Trocar pasta do backup' : 'Ativar backup automático'}
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
          <span className="muted">Só em desenvolvimento; substitui tudo.</span>
        </div>
      )}

      <p className="muted">
        {currentFile ? `Backup automático em "${currentFile}". ` : ''}
        {lastBackupAt ? `Último backup: ${formatDate(lastBackupAt)}.` : 'Nenhum backup feito ainda.'}
      </p>
      {state.status === 'active' && state.copies === 'off' && (
        <p className="muted">Sem cópias datadas: para tê-las, escolha a pasta de novo em “Trocar pasta do backup”.</p>
      )}
      {state.status === 'active' && state.copies === 'failed' && (
        <p className="status status--error" role="status">
          Não foi possível gravar as cópias datadas. O backup principal continua sendo gravado.
        </p>
      )}
      {copies.length > 0 && (
        <>
          <h2 className="backup-copies__title">Cópias datadas</h2>
          <p className="muted">
            Na subpasta "{COPIES_FOLDER}": hoje, uma a cada 2 horas (as {COPIES_KEPT_TODAY} mais recentes); dos {PAST_DAYS_KEPT}{' '}
            dias anteriores, a última de cada dia. Restaurar mostra antes o que seria perdido, e dá para desfazer.
          </p>
          <ul className="card-list backup-copies">
            {copies.map((copy) => (
              <li className="card-list__item" key={copy.name}>
                <span>{copy.at.toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                <button type="button" className="link" onClick={() => void actions.restoreCopy(copy.name)}>
                  Restaurar
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
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

/** The dated copies in the backup folder, read again after each backup. */
function useBackupCopies(state: AutoBackupState): BackupCopy[] {
  const [copies, setCopies] = useState<BackupCopy[]>([]);
  const savedAt = state.status === 'active' ? state.lastSavedAt : null;
  useEffect(() => {
    let current = true;
    autoBackup.listCopies().then(
      (list) => current && setCopies(list),
      () => current && setCopies([]),
    );
    return () => {
      current = false;
    };
  }, [state.status, savedAt]);
  return copies;
}
