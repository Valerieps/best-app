import { jsx as _jsx } from "react/jsx-runtime";
export function KindChip({ kind }) {
    return _jsx("span", { className: `chip chip--${kind}`, children: kind === 'meeting' ? 'Reunião' : 'Geral' });
}
export function WhiteboardChip() {
    return _jsx("span", { className: "chip chip--whiteboard", children: "quadro branco" });
}
/** Without a name: the "projeto" tag. With a name: the project itself. */
export function ProjectChip({ name }) {
    return _jsx("span", { className: "chip chip--project", children: name ?? 'projeto' });
}
export function NoteChip({ children }) {
    return _jsx("span", { className: "chip chip--muted", children: children });
}
