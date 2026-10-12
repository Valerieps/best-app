import type { ReactNode } from 'react';
import type { AutoBackupState } from '../../infrastructure/autoBackup';
import type { BackupActions } from './useBackup';

interface Props {
  state: AutoBackupState;
  actions: BackupActions;
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
export function BackupBanner({ state, actions, onSnooze }: Props) {
  const later = (
    <button type="button" className="link" onClick={onSnooze}>
      Lembrar depois
    </button>
  );
  switch (state.status) {
    case 'noFile':
      return (
        <Banner>
          <span>Seus dados ainda não têm backup. Escolha um arquivo, e o app passa a salvar sozinho a cada mudança.</span>
          <span className="banner__actions">
            <button type="button" className="link" onClick={actions.chooseFile}>
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
            <span>"{state.fileName}" não é um backup do app, então o backup automático não grava nele.</span>
            <button type="button" className="link" onClick={actions.chooseFile}>
              Escolher outro arquivo
            </button>
          </Banner>
        );
      }
      return (
        <Banner tone="danger">
          <span>
            Backup automático pausado: "{state.fileName}" tem dados que este navegador não tem, e gravar por cima
            apagaria esses dados.
          </span>
          <span className="banner__actions">
            <button type="button" className="link" onClick={() => actions.reviewImport(state.fileBackup)}>
              Ver e importar o backup
            </button>
            <button type="button" className="link" onClick={actions.chooseFile}>
              Escolher outro arquivo
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
