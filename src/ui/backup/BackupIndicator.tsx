import type { AutoBackupState } from '../../infrastructure/autoBackup';
import type { BackupActions } from './useBackup';

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** Compact backup status for the top bar. Details and fixes live in the banner. */
export function BackupIndicator({ state, actions }: { state: AutoBackupState; actions: BackupActions }) {
  switch (state.status) {
    case 'active':
      return (
        <span className="muted" title={`Backup automático em "${state.fileName}"`}>
          {state.saving
            ? 'Salvando backup…'
            : state.lastSavedAt
              ? `Backup salvo às ${timeLabel(state.lastSavedAt)}`
              : 'Backup automático ativo'}
        </span>
      );
    case 'noFile':
      return (
        <button type="button" onClick={actions.chooseFile}>
          Ativar backup
        </button>
      );
    case 'needsPermission':
      return (
        <button type="button" onClick={actions.resume}>
          Retomar backup
        </button>
      );
    case 'blocked':
    case 'error':
      return <span className="indicator--danger">Backup pausado</span>;
    default:
      return null;
  }
}
