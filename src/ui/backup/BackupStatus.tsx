import type { AutoBackupState } from '../../infrastructure/autoBackup';

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
 * Compact backup status, shown in the sidebar's "Dados e backup" row: a colored dot and a short
 * label. The row opens "Dados e backup", where a paused backup is resumed. When all is well, the
 * green dot says it alone, and the time stays in the tooltip; a problem keeps its words.
 */
export function BackupStatus({ state }: { state: AutoBackupState }) {
  const status = statusOf(state);
  if (!status) return null;
  return (
    <span className={`backup-status backup-status--${status.tone}`} title={status.detail}>
      <span className="backup-status__dot" aria-hidden="true" />
      {status.tone !== 'ok' && <span className="backup-status__label">{status.label}</span>}
      <span className="visually-hidden">: {status.detail}</span>
    </span>
  );
}
