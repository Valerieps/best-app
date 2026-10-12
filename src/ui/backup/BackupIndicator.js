import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { navigate } from '../hooks';
function timeLabel(iso) {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function statusOf(state) {
    switch (state.status) {
        case 'active':
            if (state.saving)
                return { tone: 'ok', label: 'Salvando…', detail: `Salvando o backup em "${state.fileName}"` };
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
export function BackupIndicator({ state, actions }) {
    const status = statusOf(state);
    if (!status)
        return null;
    const onClick = state.status === 'needsPermission' ? actions.resume : () => navigate({ name: 'data' });
    return (_jsxs("button", { type: "button", className: `tertiary backup-status backup-status--${status.tone}`, title: status.detail, "aria-label": status.detail, onClick: onClick, children: [_jsx("span", { className: "backup-status__dot", "aria-hidden": "true" }), _jsx("span", { className: "backup-status__label", children: status.label })] }));
}
