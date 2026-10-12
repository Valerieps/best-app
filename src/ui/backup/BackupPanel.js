import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef } from 'react';
import { getImportSnapshotDate, getLastBackupAt } from '../../infrastructure/backupRepository';
import { randomIds } from '../../infrastructure/browser';
import { db } from '../services';
import { useLiveQuery } from '../useLiveQuery';
function formatDate(iso) {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' });
}
function fileName(state) {
    return 'fileName' in state ? state.fileName : null;
}
export function BackupPanel({ state, actions, storagePersisted }) {
    const fileInput = useRef(null);
    const lastBackupAt = useLiveQuery(() => getLastBackupAt(db));
    const snapshotDate = useLiveQuery(() => getImportSnapshotDate(db));
    const currentFile = fileName(state);
    function onFileChosen(event) {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file)
            void actions.importFromFile(file);
    }
    return (_jsxs("section", { className: "panel", "aria-labelledby": "backup-title", children: [_jsx("h2", { id: "backup-title", children: "Dados e backup" }), _jsx("p", { className: "muted", children: "Seus dados ficam s\u00F3 neste navegador. O backup autom\u00E1tico grava uma c\u00F3pia num arquivo a cada mudan\u00E7a. Escolha um arquivo numa pasta sincronizada do Google Drive para trocar de computador sem perder nada." }), _jsxs("div", { className: "panel__actions", children: [state.status !== 'unsupported' && (_jsx("button", { type: "button", className: "primary", onClick: actions.chooseFile, children: currentFile ? 'Trocar arquivo do backup' : 'Ativar backup automático' })), _jsx("button", { type: "button", onClick: actions.download, children: "Baixar uma c\u00F3pia" }), _jsx("button", { type: "button", onClick: () => fileInput.current?.click(), children: "Importar backup" }), snapshotDate && (_jsx("button", { type: "button", onClick: actions.undo, children: "Desfazer importa\u00E7\u00E3o" }))] }), _jsx("input", { ref: fileInput, type: "file", accept: "application/json,.json", className: "visually-hidden", tabIndex: -1, "aria-hidden": "true", onChange: onFileChosen }), import.meta.env.DEV && (_jsxs("div", { className: "panel__actions", children: [_jsx("button", { type: "button", onClick: async () => {
                            // Dynamic import, so the generator stays out of the production build.
                            const { buildSyntheticBackup } = await import('../../dev/syntheticData');
                            await actions.reviewImport(await buildSyntheticBackup(new Date(), randomIds));
                        }, children: "Carregar dados sint\u00E9ticos" }), _jsx("span", { className: "muted", children: "S\u00F3 no modo de desenvolvimento. Substitui tudo, como uma importa\u00E7\u00E3o." })] })), _jsxs("p", { className: "muted", children: [currentFile ? `Backup automático em "${currentFile}". ` : '', lastBackupAt ? `Último backup: ${formatDate(lastBackupAt)}.` : 'Nenhum backup feito ainda.'] }), storagePersisted === false && (_jsx("p", { className: "muted", children: "O Chrome n\u00E3o garantiu o armazenamento permanente deste site. Mantenha o backup ativo." })), actions.message && (_jsx("p", { className: `status ${actions.message.kind === 'error' ? 'status--error' : ''}`, role: "status", children: actions.message.text }))] }));
}
