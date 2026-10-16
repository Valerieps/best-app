import type { ReactNode } from 'react';
import type { AutoBackupState } from '../../infrastructure/autoBackup';
import { daysSinceBackup } from '../notices';
import type { BackupActions } from './useBackup';

interface Props {
  state: AutoBackupState;
  actions: BackupActions;
  /**
   * Date of the last backup, when the backup is not writing and that backup is more than 24
   * hours old: the band turns red and cannot be snoozed (`backupNoticeLevel`).
   */
  staleSince: string | null;
  /**
   * "Lembrar depois", for the setup warnings only. When this band shows is decided by
   * `pickTopNotice`: one warning at a time.
   */
  onSnooze(): void;
}

function Banner({ tone = 'warning', children }: { tone?: 'warning' | 'danger'; children: ReactNode }) {
  return (
    <div className={`banner ${tone === 'danger' ? 'banner--danger' : ''}`} role="status">
      {children}
    </div>
  );
}

/** Only shows up when the automatic backup needs attention. Warns, never blocks. */
export function BackupBanner({ state, actions, staleSince, onSnooze }: Props) {
  if (staleSince !== null && (state.status === 'needsPermission' || state.status === 'noFile')) {
    const days = daysSinceBackup(staleSince, new Date());
    return (
      <Banner tone="danger">
        <span>Seu último backup foi há {days === 1 ? '1 dia' : `${days} dias`}.</span>
        {state.status === 'needsPermission' ? (
          <button type="button" className="link" onClick={actions.resume}>
            Retomar
          </button>
        ) : (
          <button type="button" className="link" onClick={actions.chooseFolder}>
            Escolher pasta
          </button>
        )}
      </Banner>
    );
  }
  const later = (
    <button type="button" className="link" onClick={onSnooze}>
      Lembrar depois
    </button>
  );
  switch (state.status) {
    case 'noFile':
      return (
        <Banner>
          <span>Seus dados ainda não têm backup. Escolha uma pasta, e o app passa a salvar sozinho a cada mudança.</span>
          <span className="banner__actions">
            <button type="button" className="link" onClick={actions.chooseFolder}>
              Ativar backup automático
            </button>
            {later}
          </span>
        </Banner>
      );
    case 'needsPermission':
      return (
        <Banner>
          <span>O backup automático está pausado até você autorizar o Chrome a gravar em "{state.fileName}".</span>
          <span className="banner__actions">
            <button type="button" className="link" onClick={actions.resume}>
              Retomar
            </button>
            {later}
          </span>
        </Banner>
      );
    case 'blocked':
      if (state.reason === 'invalidFile') {
        return (
          <Banner tone="danger">
            <span>O arquivo de backup em "{state.fileName}" não é um backup do app, então o backup automático não grava nele.</span>
            <button type="button" className="link" onClick={actions.chooseFolder}>
              Escolher outra pasta
            </button>
          </Banner>
        );
      }
      return (
        <Banner tone="danger">
          <span>
            Backup automático pausado: o backup em "{state.fileName}" tem dados que este navegador não tem, e gravar
            por cima apagaria esses dados.
          </span>
          <span className="banner__actions">
            <button type="button" className="link" onClick={() => actions.reviewImport(state.fileBackup)}>
              Ver e importar o backup
            </button>
            <button type="button" className="link" onClick={actions.chooseFolder}>
              Escolher outra pasta
            </button>
          </span>
        </Banner>
      );
    case 'error':
      return (
        <Banner tone="danger">
          <span>Não foi possível gravar o backup em "{state.fileName}".</span>
          <button type="button" className="link" onClick={actions.retry}>
            Tentar de novo
          </button>
        </Banner>
      );
    case 'unsupported':
      return (
        <Banner>
          <span>Este navegador não permite backup automático. Use o Chrome, ou baixe backups em "Dados e backup".</span>
          {later}
        </Banner>
      );
    default:
      return null;
  }
}
