import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { addLinkResource, linkProjectToObjective, removeResource, renameResource } from '../../application/objectives';
import { toDayKey } from '../../domain/day';
import { Dropdown, DropdownItem } from '../components/Dropdown';
import { Icon } from '../components/Icon';
import { Linkified, toSafeHref } from '../components/Linkified';
import { formatShortDate, linkDomain } from '../format';
import { navigate } from '../hooks';
import { appContext } from '../services';
function ObjectiveField({ view, objectives }) {
    const { project } = view;
    const current = objectives.find((objective) => objective.id === project.objectiveId) ?? null;
    const choices = objectives.filter((objective) => objective.status === 'active' && objective.id !== current?.id);
    const link = (objectiveId) => void linkProjectToObjective(appContext, project.id, objectiveId);
    return (_jsx(Dropdown, { label: current ? `Objetivo: ${current.goal}. Trocar` : 'Vincular a um objetivo', triggerClassName: "link project-panel__objective", trigger: current ? current.goal : 'Vincular', children: (close) => (_jsxs(_Fragment, { children: [current && (_jsx(DropdownItem, { onSelect: () => {
                        close();
                        navigate({ name: 'objective', id: current.id });
                    }, children: "Abrir o objetivo" })), choices.map((objective) => (_jsx(DropdownItem, { onSelect: () => {
                        close();
                        link(objective.id);
                    }, children: objective.goal }, objective.id))), choices.length === 0 && !current && (_jsx(DropdownItem, { onSelect: () => {
                        close();
                        navigate({ name: 'objectives' });
                    }, children: "Nenhum objetivo ativo. Abrir Objetivos" })), current && (_jsx(DropdownItem, { onSelect: () => {
                        close();
                        link(null);
                    }, children: "Tirar o v\u00EDnculo" }))] })) }));
}
function ResourceCard({ item }) {
    const { resource, notes } = item;
    const [editing, setEditing] = useState(false);
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState(resource.title);
    const href = resource.url ? toSafeHref(resource.url) : null;
    const detail = resource.url ? linkDomain(resource.url) : `nota · ${formatShortDate(toDayKey(new Date(resource.createdAt)))}`;
    const save = () => {
        setEditing(false);
        void renameResource(appContext, resource.id, title);
    };
    return (_jsxs("li", { className: "resource-card", children: [_jsx("span", { className: "resource-card__icon", children: _jsx(Icon, { name: resource.url ? 'link' : 'notes' }) }), _jsxs("span", { className: "resource-card__body", children: [editing ? (_jsx("input", { className: "text-input resource-card__input", value: title, autoFocus: true, "aria-label": "T\u00EDtulo do recurso", onChange: (event) => setTitle(event.target.value), onBlur: save, onKeyDown: (event) => {
                            if (event.key === 'Enter')
                                save();
                            if (event.key === 'Escape') {
                                setTitle(resource.title);
                                setEditing(false);
                            }
                        } })) : href ? (_jsx("a", { className: "resource-card__title", href: href, target: "_blank", rel: "noopener noreferrer", children: resource.title })) : notes.length > 0 ? (_jsx("button", { type: "button", className: "resource-card__title resource-card__toggle", "aria-expanded": open, onClick: () => setOpen(!open), children: resource.title })) : (_jsx("span", { className: "resource-card__title", children: resource.title })), detail !== resource.title && _jsx("span", { className: "muted resource-card__detail", children: detail }), open &&
                        notes.map((note) => (_jsx("p", { className: "resource-card__note", children: _jsx(Linkified, { text: note.text }) }, note.id)))] }), !editing && (_jsxs("span", { className: "resource-card__actions", children: [_jsx("button", { type: "button", className: "line__action", onClick: () => setEditing(true), "aria-label": `Renomear "${resource.title}"`, children: "Renomear" }), _jsx("button", { type: "button", className: "line__action", onClick: () => void removeResource(appContext, resource.id), "aria-label": `Remover "${resource.title}"`, children: "\u2715" })] }))] }));
}
/** "Colar link": pasting adds the link right away, titled with its domain; Enter adds what was typed. */
function PasteLink({ projectId }) {
    const [value, setValue] = useState('');
    const add = (url) => {
        const trimmed = url.trim();
        if (!trimmed)
            return;
        void addLinkResource(appContext, { ownerType: 'project', ownerId: projectId }, trimmed, linkDomain(trimmed));
        setValue('');
    };
    const onPaste = (event) => {
        const pasted = event.clipboardData.getData('text').trim();
        if (value === '' && toSafeHref(pasted)) {
            event.preventDefault();
            add(pasted);
        }
    };
    const onKeyDown = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            add(value);
        }
    };
    return (_jsxs("label", { className: "paste-link", children: [_jsx(Icon, { name: "plus", size: "sm" }), _jsx("input", { className: "paste-link__input", value: value, placeholder: "Colar link", "aria-label": "Colar um link como recurso", onChange: (event) => setValue(event.target.value), onPaste: onPaste, onKeyDown: onKeyDown })] }));
}
/** Side column of the project page: details and resources. */
export function ProjectSidePanel({ view, objectives, resources, pinned, floating, onTogglePin, onClose }) {
    const { project } = view;
    const status = project.status === 'finished' && project.finishedAt
        ? `Finalizado em ${formatShortDate(toDayKey(new Date(project.finishedAt)))}`
        : project.status === 'finished'
            ? 'Finalizado'
            : 'Ativo';
    return (_jsxs("aside", { className: `project-panel ${floating ? 'project-panel--floating' : ''}`, "aria-label": "Sobre o projeto", children: [_jsxs("div", { className: "project-panel__head", children: [_jsx("span", { className: "project-panel__title", children: "Sobre o projeto" }), _jsxs("span", { children: [_jsx("button", { type: "button", className: `tertiary project-panel__icon-button ${pinned ? 'project-panel__icon-button--on' : ''}`, "aria-pressed": pinned, "aria-label": pinned ? 'Desafixar a coluna' : 'Fixar a coluna', title: pinned ? 'Desafixar a coluna' : 'Fixar a coluna', onClick: onTogglePin, children: _jsx(Icon, { name: "pin", filled: pinned }) }), floating && (_jsx("button", { type: "button", className: "tertiary project-panel__icon-button", "aria-label": "Fechar a coluna", title: "Fechar", onClick: onClose, children: _jsx(Icon, { name: "close" }) }))] })] }), _jsx("h2", { className: "project-panel__heading", children: "Detalhes" }), _jsxs("dl", { className: "project-panel__details", children: [_jsxs("div", { children: [_jsx("dt", { className: "muted", children: "Objetivo" }), _jsx("dd", { children: _jsx(ObjectiveField, { view: view, objectives: objectives }) })] }), _jsxs("div", { children: [_jsx("dt", { className: "muted", children: "Status" }), _jsx("dd", { children: status })] }), _jsxs("div", { children: [_jsx("dt", { className: "muted", children: "Se\u00E7\u00F5es" }), _jsx("dd", { children: view.sections })] })] }), _jsx("h2", { className: "project-panel__heading", children: "Recursos" }), resources.length === 0 ? (_jsx("p", { className: "muted project-panel__empty", children: "Notas viram recurso no checkout; links entram aqui." })) : (_jsx("ul", { className: "resource-list", children: resources.map((item) => (_jsx(ResourceCard, { item: item }, item.resource.id))) })), _jsx(PasteLink, { projectId: project.id })] }));
}
