import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { detectKind } from '../../domain/blockKind';
import { relativeDay } from '../format';
import { useFocusTarget } from './focus';
/** Wait after the last keystroke before saving the text. */
const SAVE_DELAY_MS = 400;
/** Hint on an empty line, shown only while the line is being written (P3 in AVALIACAO-UX.md). */
export const NOTE_HINT = 'Escreva, ou comece com [] e espaço para criar uma tarefa';
/** A hidden date field opened by a button: a shortcut, or the chip of a date already set. */
export function DatePicker({ label, value, min, onChange, className, children, }) {
    const ref = useRef(null);
    return (_jsxs("span", { className: "line__picker", children: [_jsx("button", { type: "button", className: className, title: label, "aria-label": label, onClick: () => {
                    const input = ref.current;
                    if (!input)
                        return;
                    if (typeof input.showPicker === 'function')
                        input.showPicker();
                    else
                        input.focus();
                }, children: children }), _jsx("input", { ref: ref, type: "date", className: "line__date-input", tabIndex: -1, "aria-hidden": "true", min: min, value: value ?? '', onChange: (event) => onChange(event.target.value || null) })] }));
}
export function BlockLine({ block, free, day, today, isPriority, allowNewLines, handlers, extraMeta, hideDate = false }) {
    const ref = useRef(null);
    const [text, setText] = useState(block.text);
    const saveTimer = useRef(null);
    const latest = useRef({ block, text, handlers });
    latest.current = { block, text, handlers };
    useFocusTarget(block.id, ref);
    // Follow changes made elsewhere (another tab, a merge) unless there are unsaved local edits.
    const synced = useRef(block.text);
    useEffect(() => {
        setText((current) => (current === synced.current ? block.text : current));
        synced.current = block.text;
    }, [block.text]);
    const flush = () => {
        if (saveTimer.current)
            clearTimeout(saveTimer.current);
        saveTimer.current = null;
        const { block: current, text: value, handlers: h } = latest.current;
        if (value !== current.text)
            h.onSaveText(current, value);
    };
    // Save what is pending when the line goes away.
    useEffect(() => flush, []);
    function onChange(value) {
        if (block.kind === 'note' && free) {
            const detected = detectKind(value);
            if (detected.kind === 'task') {
                setText(detected.text);
                if (saveTimer.current)
                    clearTimeout(saveTimer.current);
                handlers.onMakeTask(block, detected.text);
                return;
            }
        }
        setText(value);
        if (saveTimer.current)
            clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(flush, SAVE_DELAY_MS);
    }
    function onKeyDown(event) {
        const element = event.currentTarget;
        const atStart = element.selectionStart === 0 && element.selectionEnd === 0;
        const atEnd = element.selectionStart === element.value.length;
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            if (!allowNewLines)
                return;
            if (saveTimer.current)
                clearTimeout(saveTimer.current);
            const caret = element.selectionStart;
            const value = element.value;
            // The rest of the line moves to the new line right away; the split is saved after.
            setText(value.slice(0, caret));
            latest.current.text = value.slice(0, caret);
            handlers.onEnter(block, value, caret);
        }
        else if (event.key === 'Backspace' && atStart && free) {
            event.preventDefault();
            if (saveTimer.current)
                clearTimeout(saveTimer.current);
            // The line is merged or deleted; its text travels with the handler, nothing to save here.
            latest.current.text = latest.current.block.text;
            handlers.onBackspaceAtStart(block, element.value);
        }
        else if (event.key === 'ArrowUp' && atStart) {
            event.preventDefault();
            handlers.onArrow(block, 'up');
        }
        else if (event.key === 'ArrowDown' && atEnd) {
            event.preventDefault();
            handlers.onArrow(block, 'down');
        }
    }
    const isTask = block.kind === 'task';
    const done = isTask && block.status === 'done';
    const active = isTask && block.status === 'active';
    const deadline = block.deadline ?? null;
    const showDate = isTask && !hideDate && block.intendedDate !== null && block.intendedDate !== day;
    const dateLabel = showDate ? relativeDay(block.intendedDate, today) : '';
    const deadlineLabel = deadline ? `prazo ${relativeDay(deadline, today)}` : '';
    const pickDate = (label, className, children) => (_jsx(DatePicker, { label: label, className: className, value: block.intendedDate, min: today, onChange: (date) => handlers.onSetDate(block, date), children: children }));
    const pickDeadline = (label, className, children) => (_jsx(DatePicker, { label: label, className: className, value: deadline, onChange: (date) => handlers.onSetDeadline(block, date), children: children }));
    const priorityLabel = isPriority ? 'Tirar das prioridades do dia' : 'Promover a prioridade do dia';
    return (_jsxs("div", { className: `line line--${block.kind} ${done ? 'line--done' : ''}`, children: [isTask && (_jsx("input", { type: "checkbox", className: "line__check", checked: done, onChange: (event) => handlers.onToggleDone(block, event.target.checked), "aria-label": done ? 'Reabrir tarefa' : 'Finalizar tarefa' })), _jsx("textarea", { ref: ref, className: "line__text", rows: 1, value: text, spellCheck: true, onChange: (event) => onChange(event.target.value), onKeyDown: onKeyDown, onBlur: flush, placeholder: block.kind === 'note' && free && allowNewLines ? NOTE_HINT : undefined, "aria-label": isTask ? 'Tarefa' : 'Nota' }), _jsxs("span", { className: "line__meta", children: [extraMeta, showDate &&
                        (active ? pickDate('Mudar a data de intenção', 'line__chip', dateLabel) : _jsx("span", { className: "muted", children: dateLabel })), deadline &&
                        (active ? pickDeadline('Mudar o prazo máximo', 'line__chip', deadlineLabel) : _jsx("span", { className: "chip chip--muted", children: deadlineLabel }))] }), _jsxs("span", { className: "line__actions", children: [active && !showDate && pickDate(hideDate ? 'Mudar a data de intenção' : 'Data de intenção', 'line__action', 'Data'), active && !deadline && pickDeadline('Prazo máximo', 'line__action', 'Prazo'), block.kind === 'note' && free && (_jsx("button", { type: "button", className: "line__action", onClick: () => handlers.onMakeTask(block, text), children: "Converter em tarefa" }))] }), active && (_jsx("button", { type: "button", className: `line__star ${isPriority ? 'line__star--on' : 'line__reveal'}`, title: priorityLabel, "aria-label": priorityLabel, "aria-pressed": isPriority, onClick: () => handlers.onTogglePriority(block, !isPriority), children: isPriority ? '★' : '☆' }))] }));
}
/** Empty line of a section with no blocks: typing in it creates the first block. */
export function GhostLine({ id, placeholder, onCreate }) {
    const ref = useRef(null);
    useFocusTarget(id, ref);
    return (_jsx("div", { className: "line line--ghost", children: _jsx("textarea", { ref: ref, className: "line__text", rows: 1, value: "", placeholder: placeholder, onChange: (event) => {
                if (event.target.value)
                    onCreate(event.target.value);
            }, "aria-label": "Nova linha" }) }));
}
