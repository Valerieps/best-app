import type { AutoBackupState } from '../../infrastructure/autoBackup';
import { navigate } from '../hooks';
import type { BackupActions } from './useBackup';

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

interface Status {
  tone: 'ok' | 'attention' | 'problem' | 'off';
  label: string;
  /** Longer description, for the tooltip and screen readers. */
  detail: string;
}

function statusOf(state: AutoBackupState): Status | null {
  switch (state.status) {
    case 'active':
      if (state.saving) return { tone: 'ok', label: 'Salvando…', detail: `Salvando o backup em "${state.fileName}"` };
      return {
        tone: 'ok',
        label: state.lastSavedAt ? `Backup ${timeLabel(state.lastSavedAt)}` : 'Backup ativo',
        detail: state.lastSavedAt
          ? `Backup automático salvo às ${timeLabel(state.lastSavedAt)} em "${state.fileName}"`
          : `Backup automático ativo em "${state.fileName}"`,
      };
    case 'noFile':
      return { tone: 'attention', label: 'Sem backup', detail: 'Backup automático desativado. Abrir "Dados e backup"' };
    case 'needsPermission':
      return { tone: 'attention', label: 'Retomar backup', detail: `Autorizar o Chrome a gravar em "${state.fileName}"` };
    case 'blocked':
    case 'error':
      return { tone: 'problem', label: 'Backup pausado', detail: 'Backup automático pausado. Abrir "Dados e backup"' };
    case 'unsupported':
      return { tone: 'off', label: 'Sem backup automático', detail: 'Este navegador não permite backup automático' };
    default:
      return null;
  }
}

/**
 * Compact backup status for the top bar: a colored dot and a short label. Clicking it opens
 * "Dados e backup", or resumes a paused backup, which needs a click to ask Chrome again.
 */
export function BackupIndicator({ state, actions }: { state: AutoBackupState; actions: BackupActions }) {
  const status = statusOf(state);
  if (!status) return null;
  const onClick = state.status === 'needsPermission' ? actions.resume : () => navigate({ name: 'data' });
  return (
    <button
      type="button"
      className={`tertiary backup-status backup-status--${status.tone}`}
      title={status.detail}
      aria-label={status.detail}
      onClick={onClick}
    >
      <span className="backup-status__dot" aria-hidden="true" />
      <span className="backup-status__label">{status.label}</span>
    </button>
  );
}
