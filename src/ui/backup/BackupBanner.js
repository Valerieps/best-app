import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
function Banner({ tone = 'warning', children }) {
    return (_jsx("div", { className: `banner ${tone === 'danger' ? 'banner--danger' : ''}`, role: "status", children: children }));
}
/** Only shows up when the automatic backup needs attention. Warns, never blocks. */
export function BackupBanner({ state, actions, onSnooze }) {
    const later = (_jsx("button", { type: "button", className: "link", onClick: onSnooze, children: "Lembrar depois" }));
    switch (state.status) {
        case 'noFile':
            return (_jsxs(Banner, { children: [_jsx("span", { children: "Seus dados ainda n\u00E3o t\u00EAm backup. Escolha um arquivo, e o app passa a salvar sozinho a cada mudan\u00E7a." }), _jsxs("span", { className: "banner__actions", children: [_jsx("button", { type: "button", className: "link", onClick: actions.chooseFile, children: "Ativar backup autom\u00E1tico" }), later] })] }));
        case 'needsPermission':
            return (_jsxs(Banner, { children: [_jsxs("span", { children: ["O backup autom\u00E1tico est\u00E1 pausado at\u00E9 voc\u00EA autorizar o Chrome a gravar em \"", state.fileName, "\"."] }), _jsxs("span", { className: "banner__actions", children: [_jsx("button", { type: "button", className: "link", onClick: actions.resume, children: "Retomar" }), later] })] }));
        case 'blocked':
            if (state.reason === 'invalidFile') {
                return (_jsxs(Banner, { tone: "danger", children: [_jsxs("span", { children: ["\"", state.fileName, "\" n\u00E3o \u00E9 um backup do app, ent\u00E3o o backup autom\u00E1tico n\u00E3o grava nele."] }), _jsx("button", { type: "button", className: "link", onClick: actions.chooseFile, children: "Escolher outro arquivo" })] }));
            }
            return (_jsxs(Banner, { tone: "danger", children: [_jsxs("span", { children: ["Backup autom\u00E1tico pausado: \"", state.fileName, "\" tem dados que este navegador n\u00E3o tem, e gravar por cima apagaria esses dados."] }), _jsxs("span", { className: "banner__actions", children: [_jsx("button", { type: "button", className: "link", onClick: () => actions.reviewImport(state.fileBackup), children: "Ver e importar o backup" }), _jsx("button", { type: "button", className: "link", onClick: actions.chooseFile, children: "Escolher outro arquivo" })] })] }));
        case 'error':
            return (_jsxs(Banner, { tone: "danger", children: [_jsxs("span", { children: ["N\u00E3o foi poss\u00EDvel gravar o backup em \"", state.fileName, "\"."] }), _jsx("button", { type: "button", className: "link", onClick: actions.retry, children: "Tentar de novo" })] }));
        case 'unsupported':
            return (_jsxs(Banner, { children: [_jsx("span", { children: "Este navegador n\u00E3o permite backup autom\u00E1tico. Use o Chrome, ou baixe backups em \"Dados e backup\"." }), later] }));
        default:
            return null;
    }
}
