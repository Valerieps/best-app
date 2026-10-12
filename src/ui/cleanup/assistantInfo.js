import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/** Name, description and icon of each cleanup assistant, as the user sees them. */
export const ASSISTANT_INFO = {
    pendingDays: {
        name: 'Dias em aberto',
        description: 'Dias que ficaram sem checkout.',
        unit: ['dia', 'dias'],
    },
    whiteboards: {
        name: 'Seções soltas',
        description: 'Seções que ficaram sem projeto, agrupadas pelos títulos repetidos.',
        unit: ['grupo', 'grupos'],
    },
    duplicates: {
        name: 'Projetos repetidos',
        description: 'Projetos com nomes parecidos. Juntar move as seções e tarefas para o projeto mais antigo.',
        unit: ['par', 'pares'],
    },
};
export const STATUS_LABELS = {
    0: 'em dia',
    1: 'atenção',
    2: 'acumulando',
    3: 'urgente',
};
/** Line icons drawn inline: the app never downloads assets. */
export function AssistantIcon({ id }) {
    return (_jsxs("svg", { className: "assistant-icon", viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false", children: [id === 'pendingDays' && (_jsxs(_Fragment, { children: [_jsx("rect", { x: "3", y: "5", width: "18", height: "16", rx: "2" }), _jsx("path", { d: "M3 10h18M8 3v4M16 3v4" })] })), id === 'whiteboards' && (_jsxs(_Fragment, { children: [_jsx("path", { d: "M5 3h10l4 4v14H5z" }), _jsx("path", { d: "M15 3v4h4M8 12h8M8 16h5" })] })), id === 'duplicates' && (_jsxs(_Fragment, { children: [_jsx("rect", { x: "8", y: "8", width: "13", height: "13", rx: "2" }), _jsx("path", { d: "M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" })] }))] }));
}
