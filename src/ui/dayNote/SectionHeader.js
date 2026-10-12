import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { normalizeForMatch } from '../../domain/text';
import { formatTime } from '../format';
import { KindChip, ProjectChip, WhiteboardChip } from '../components/Chips';
const MAX_SUGGESTIONS = 5;
/**
 * Section header: kind, time and an optional title. While typing the title of a whiteboard
 * section, existing projects are suggested; choosing one links the section to it.
 */
export function SectionHeader({ section, kind, projects, onSaveTitle, onLinkProject, onCreateProject }) {
    const [title, setTitle] = useState(section?.title ?? '');
    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState(0);
    const inputRef = useRef(null);
    const project = section?.projectId ? projects.find((p) => p.id === section.projectId) ?? null : null;
    const whiteboard = section !== null && section.projectId === null;
    useEffect(() => {
        if (document.activeElement !== inputRef.current)
            setTitle(section?.title ?? '');
    }, [section?.title]);
    const typed = title.trim();
    const options = [];
    if (whiteboard && open && typed) {
        const query = normalizeForMatch(typed);
        projects
            .filter((p) => p.status === 'active' && normalizeForMatch(p.name).includes(query))
            .slice(0, MAX_SUGGESTIONS)
            .forEach((p) => options.push({ type: 'project', project: p }));
        if (!projects.some((p) => normalizeForMatch(p.name) === query))
            options.push({ type: 'create', name: typed });
        options.push({ type: 'titleOnly', name: typed });
    }
    function choose(option) {
        setOpen(false);
        if (option.type === 'project') {
            setTitle(option.project.name);
            onLinkProject(option.project);
        }
        else if (option.type === 'create') {
            onCreateProject(option.name);
        }
        else {
            onSaveTitle(option.name);
        }
        inputRef.current?.blur();
    }
    function onKeyDown(event) {
        if (event.key === 'Escape') {
            setOpen(false);
            return;
        }
        if (event.key === 'Enter') {
            event.preventDefault();
            if (options.length > 0)
                choose(options[Math.min(highlight, options.length - 1)]);
            else {
                onSaveTitle(title);
                inputRef.current?.blur();
            }
            return;
        }
        if (options.length === 0)
            return;
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setHighlight((highlight + 1) % options.length);
        }
        else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlight((highlight - 1 + options.length) % options.length);
        }
    }
    return (_jsxs("div", { className: "section__header", children: [_jsx(KindChip, { kind: kind }), section && _jsx("span", { className: "section__time", children: formatTime(section.createdAt) }), _jsxs("div", { className: "title-field", children: [_jsx("input", { ref: inputRef, className: "section__title", value: title, placeholder: "Sem t\u00EDtulo", disabled: !section, onChange: (event) => {
                            setTitle(event.target.value);
                            setOpen(true);
                            setHighlight(0);
                        }, onFocus: () => setOpen(true), onBlur: () => {
                            // Let a click on a suggestion land before closing.
                            setTimeout(() => setOpen(false), 150);
                            if (title.trim() !== (section?.title ?? ''))
                                onSaveTitle(title);
                        }, onKeyDown: onKeyDown, "aria-label": "T\u00EDtulo da se\u00E7\u00E3o", "aria-expanded": options.length > 0, "aria-autocomplete": "list", role: "combobox" }), options.length > 0 && (_jsx("ul", { className: "suggestions", role: "listbox", children: options.map((option, index) => (_jsxs("li", { role: "option", "aria-selected": index === highlight, className: `suggestions__item ${index === highlight ? 'suggestions__item--active' : ''}`, onMouseDown: (event) => {
                                event.preventDefault();
                                choose(option);
                            }, children: [option.type === 'project' && (_jsxs(_Fragment, { children: [option.project.name, " ", _jsx(ProjectChip, {})] })), option.type === 'create' && _jsxs(_Fragment, { children: ["Criar o projeto \u201C", option.name, "\u201D"] }), option.type === 'titleOnly' && (_jsxs("span", { className: "muted", children: ["Usar \u201C", option.name, "\u201D s\u00F3 como t\u00EDtulo (quadro branco)"] }))] }, option.type === 'project' ? option.project.id : option.type))) }))] }), whiteboard && _jsx(WhiteboardChip, {}), project && _jsx(ProjectChip, {})] }));
}
