import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { keepProjectsSeparate, mergeProjects, resolveWhiteboardGroup } from '../../application/assistants';
import { loadCleanupDashboard } from '../../application/queries';
import { ScreenHeader } from '../components/ScreenHeader';
import { Segmented } from '../components/Segmented';
import { LoadingPage } from '../components/Skeleton';
import { ClosePendingDaysDialog } from '../dayNote/ClosePendingDaysDialog';
import { listDays, plural } from '../format';
import { navigate } from '../hooks';
import { appContext, reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';
import { ASSISTANT_INFO, AssistantIcon, STATUS_LABELS } from './assistantInfo';
/**
 * "Colocar ordem na casa" (ASSISTENTES.md): a dashboard with one card per assistant, colored
 * by how much it found. The details and suggested actions only show after opening a card.
 */
export function CleanupScreen({ today, assistant }) {
    const dashboard = useLiveQuery(() => loadCleanupDashboard(reader, today), [today]);
    const projects = useLiveQuery(() => reader.projects()) ?? [];
    if (!dashboard)
        return _jsx(LoadingPage, { title: assistant ? undefined : 'Colocar ordem na casa' });
    return assistant ? (_jsx(AssistantScreen, { id: assistant, dashboard: dashboard, projects: projects, today: today })) : (_jsx(Dashboard, { dashboard: dashboard }));
}
function Dashboard({ dashboard }) {
    return (_jsxs("main", { className: "page", children: [_jsx(ScreenHeader, { title: "Colocar ordem na casa" }), _jsx("ul", { className: "cleanup-grid", children: dashboard.cards.map(({ id, status }) => {
                    const { name } = ASSISTANT_INFO[id];
                    return (_jsx("li", { children: _jsxs("button", { type: "button", className: `cleanup-card status--${status}`, title: STATUS_LABELS[status], "aria-label": `${name}, ${STATUS_LABELS[status]}`, onClick: () => navigate({ name: 'cleanup', assistant: id }), children: [_jsx("span", { className: "status-icon", children: _jsx(AssistantIcon, { id: id }) }), name] }) }, id));
                }) })] }));
}
function AssistantScreen({ id, dashboard, projects, today, }) {
    const { name, description } = ASSISTANT_INFO[id];
    const card = dashboard.cards.find((candidate) => candidate.id === id);
    const backToDashboard = () => navigate({ name: 'cleanup' });
    return (_jsxs("main", { className: "page", children: [_jsx("button", { type: "button", className: "link screen-header__back", onClick: backToDashboard, children: "\u2190 Colocar ordem na casa" }), _jsxs("header", { className: `assistant-header status--${card.status}`, children: [_jsx("span", { className: "status-icon", children: _jsx(AssistantIcon, { id: id }) }), _jsxs("div", { children: [_jsx("h1", { className: "assistant-header__title", children: name }), _jsx("p", { className: "assistant-header__description", children: description })] }), _jsxs("span", { className: "visually-hidden", children: ["Estado: ", STATUS_LABELS[card.status]] })] }), card.count === 0 ? (_jsx("p", { className: "muted", children: "Nada para limpar aqui." })) : (_jsxs(_Fragment, { children: [id === 'pendingDays' && _jsx(PendingDaysAssistant, { days: dashboard.pendingDays, today: today }), id === 'whiteboards' && (_jsx(WhiteboardsAssistant, { groups: dashboard.whiteboards, projects: projects, onDone: backToDashboard })), id === 'duplicates' && _jsx(DuplicatesAssistant, { groups: dashboard.duplicates, onDone: backToDashboard })] }))] }));
}
function PendingDaysAssistant({ days, today }) {
    const [closing, setClosing] = useState(false);
    return (_jsxs("section", { className: "assistant", children: [_jsxs("p", { children: [listDays(days, today), " ainda sem checkout."] }), _jsx("div", { className: "assistant__actions", children: _jsx("button", { type: "button", className: "primary", onClick: () => setClosing(true), children: "Fechar dias pendentes" }) }), closing && _jsx(ClosePendingDaysDialog, { today: today, onClose: () => setClosing(false) })] }));
}
function WhiteboardsAssistant({ groups, projects, onDone, }) {
    const [choices, setChoices] = useState(new Map());
    const [busy, setBusy] = useState(false);
    const active = projects.filter((project) => project.status === 'active');
    const actionOf = (group) => choices.get(group.key) ?? group.suggestion;
    const choose = (group, action) => setChoices((previous) => new Map(previous).set(group.key, action));
    async function accept() {
        setBusy(true);
        try {
            for (const group of groups) {
                const action = actionOf(group);
                const safe = action.kind === 'convert' && !action.name.trim() ? { kind: 'keep' } : action;
                await resolveWhiteboardGroup(appContext, group.sections.map((section) => section.id), safe);
            }
            onDone();
        }
        finally {
            setBusy(false);
        }
    }
    return (_jsxs("section", { className: "assistant", children: [_jsx("ul", { className: "card-list", children: groups.map((group) => {
                    const action = actionOf(group);
                    const linkTarget = action.kind === 'link' ? active.find((p) => p.id === action.projectId) : undefined;
                    return (_jsxs("li", { className: "card-list__item card-list__item--stacked", children: [_jsxs("div", { className: "triage-row triage-row--flush", children: [_jsxs("span", { className: "triage-row__label", children: ["\u201C", group.title, "\u201D ", _jsx("span", { className: "muted", children: plural(group.sections.length, 'seção', 'seções') })] }), _jsx(Segmented, { label: `Ação para “${group.title}”`, value: action.kind, options: [
                                            { value: 'convert', label: 'Converter em projeto' },
                                            { value: 'link', label: linkTarget ? `Vincular a ${linkTarget.name}` : 'Vincular a…' },
                                            { value: 'keep', label: 'Deixar como está' },
                                        ], onChange: (value) => {
                                            if (value === 'convert')
                                                choose(group, { kind: 'convert', name: group.title });
                                            else if (value === 'keep')
                                                choose(group, { kind: 'keep' });
                                            else if (active[0])
                                                choose(group, { kind: 'link', projectId: linkTarget?.id ?? active[0].id });
                                        } })] }), action.kind === 'link' && active.length > 1 && (_jsx("select", { className: "text-input assistant__select", value: action.projectId, onChange: (event) => choose(group, { kind: 'link', projectId: event.target.value }), "aria-label": "Projeto", children: active.map((project) => (_jsx("option", { value: project.id, children: project.name }, project.id))) }))] }, group.key));
                }) }), _jsx("div", { className: "assistant__actions", children: _jsx("button", { type: "button", className: "primary", onClick: accept, disabled: busy, children: "Aceitar sugest\u00F5es" }) })] }));
}
function DuplicatesAssistant({ groups, onDone }) {
    const [choices, setChoices] = useState(new Map());
    const [busy, setBusy] = useState(false);
    async function accept() {
        setBusy(true);
        try {
            for (const group of groups) {
                const ids = group.projects.map((project) => project.id);
                if ((choices.get(group.key) ?? 'merge') === 'merge')
                    await mergeProjects(appContext, group.keep.id, ids);
                else
                    await keepProjectsSeparate(appContext, ids);
            }
            onDone();
        }
        finally {
            setBusy(false);
        }
    }
    return (_jsxs("section", { className: "assistant", children: [_jsx("ul", { className: "card-list", children: groups.map((group) => (_jsxs("li", { className: "card-list__item", children: [_jsx("span", { children: group.projects.map((project) => `“${project.name}”`).join(' e ') }), _jsx(Segmented, { label: "A\u00E7\u00E3o para os projetos parecidos", value: choices.get(group.key) ?? 'merge', options: [
                                { value: 'merge', label: `Juntar em “${group.keep.name}”` },
                                { value: 'separate', label: 'Manter separados' },
                            ], onChange: (value) => setChoices((previous) => new Map(previous).set(group.key, value)) })] }, group.key))) }), _jsx("div", { className: "assistant__actions", children: _jsx("button", { type: "button", className: "primary", onClick: accept, disabled: busy, children: "Aceitar sugest\u00F5es" }) })] }));
}
