import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Linkified } from '../components/Linkified';
const PIN_KEY = 'best-app:pinPriorities';
function readPinned() {
    try {
        return localStorage.getItem(PIN_KEY) === '1';
    }
    catch {
        return false;
    }
}
/** Whether the priorities block stays visible on scroll. A convenience of this browser only. */
export function usePinnedPriorities() {
    const [pinned, setPinned] = useState(readPinned);
    const update = (next) => {
        try {
            localStorage.setItem(PIN_KEY, next ? '1' : '0');
        }
        catch {
            // Nothing to do: the choice just won't be remembered.
        }
        setPinned(next);
    };
    return [pinned, update];
}
/** "Prioridades do dia": up to 3 tasks, highlighted. */
export function PrioritiesBlock({ priorities, today, pinned, onToggleDone, onDemote }) {
    return (_jsxs("section", { className: `priorities ${pinned ? 'priorities--pinned' : ''}`, "aria-label": "Prioridades do dia", children: [_jsx("h2", { className: "priorities__title", children: "Prioridades do dia" }), priorities.length === 0 ? (_jsx("p", { className: "muted priorities__empty", children: "Nenhuma prioridade agora. Promova uma tarefa com \u2605." })) : (_jsx("ol", { className: "priorities__list", children: priorities.map(({ task, automatic }) => (_jsxs("li", { className: "priorities__item", children: [_jsx("input", { type: "checkbox", checked: task.status === 'done', onChange: (event) => onToggleDone(task.id, event.target.checked), "aria-label": `Finalizar "${task.text}"` }), _jsx("span", { className: "priorities__text", children: _jsx(Linkified, { text: task.text || '(tarefa sem texto)' }) }), automatic && task.deadline === today && _jsx("span", { className: "chip chip--whiteboard", children: "prazo m\u00E1ximo hoje" }), !automatic && (_jsx("button", { type: "button", className: "line__action", onClick: () => onDemote(task.id), "aria-label": "Tirar das prioridades", children: "\u2715" }))] }, task.id))) }))] }));
}
