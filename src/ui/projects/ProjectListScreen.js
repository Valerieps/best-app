import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { addPriorityProject } from '../../application/priorityProjects';
import { createProject } from '../../application/projects';
import { loadProjectList } from '../../application/queries';
import { setProjectListGroupOpen } from '../../application/settings';
import { toDayKey } from '../../domain/day';
import { PRIORITY_PROJECT_LIMIT } from '../../domain/priorityProjects';
import { CARD_MAP_WEEKS, ROW_MAP_WEEKS } from '../../domain/projectActivity';
import { Dropdown, DropdownItem } from '../components/Dropdown';
import { Icon } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import { LoadingPage } from '../components/Skeleton';
import { formatShortDate, plural, projectListSummary, relativeDay } from '../format';
import { navigate, routeHash } from '../hooks';
import { appContext, reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';
import { enqueue } from '../writeQueue';
import { ActivityLegend, ActivityMap } from './ActivityMap';
import { ProjectActionsMenu } from './ProjectActions';
import { ProjectIconBadge } from './ProjectIcon';
function write(work) {
    enqueue(work).catch(() => {
        // Logged by the queue; the screen shows the saved state again on its own.
    });
}
/**
 * The project list (SPEC.md, "Projetos"): where projects are followed. The week's priority
 * projects are cards with a 16-week activity map; the other active ones are rows with 8 weeks.
 */
export function ProjectsScreen({ today }) {
    const view = useLiveQuery(() => loadProjectList(reader, today), [today]);
    const [creating, setCreating] = useState(false);
    if (!view)
        return _jsx(LoadingPage, { title: "Projetos" });
    const candidates = view.others.map((item) => item.project);
    const freeSlots = PRIORITY_PROJECT_LIMIT - view.priority.length;
    const hasActive = view.summary.active > 0;
    return (_jsxs("main", { className: "page page--wide projects", children: [_jsx(ScreenHeader, { title: _jsxs(_Fragment, { children: [_jsx("h1", { className: "projects__title", children: "Projetos" }), hasActive && _jsx("p", { className: "muted projects__summary", children: projectListSummary(view.summary) })] }), primary: { label: 'Novo projeto', onSelect: () => setCreating(true) }, children: creating && _jsx(NewProjectField, { onDone: () => setCreating(false) }) }), !hasActive && (_jsx("p", { className: "muted", children: "Nenhum projeto ativo. Crie um aqui, ou d\u00EA um t\u00EDtulo a uma se\u00E7\u00E3o da nota do dia e escolha \u201CCriar o projeto\u201D." })), hasActive && (_jsxs("section", { className: "projects__group", "aria-labelledby": "projects-priority", children: [_jsxs("div", { className: "projects__group-head", children: [_jsx("h2", { className: "projects__group-title", id: "projects-priority", children: "Priorit\u00E1rios da semana" }), _jsx(ActivityLegend, {})] }), _jsxs("div", { className: "priority-cards", children: [view.priority.map((item) => (_jsx(PriorityCard, { item: item, view: view, today: today }, item.project.id))), Array.from({ length: freeSlots }, (_, index) => (_jsx(FreeSlot, { candidates: candidates }, index)))] })] })), view.others.length > 0 && (_jsx(Group, { group: "others", open: view.open.others, title: `Outros ativos (${view.others.length})`, note: view.others.some((item) => item.stalledDays !== null) ? plural(view.others.filter((item) => item.stalledDays !== null).length, 'parado', 'parados') : null, children: _jsx("ul", { className: "project-rows", children: view.others.map((item) => (_jsxs("li", { className: "project-row", children: [_jsxs("a", { className: "project-row__name project-link", href: routeHash({ name: 'project', id: item.project.id }), children: [_jsx(ProjectIconBadge, { project: item.project, size: "sm" }), _jsx("span", { className: "project-row__label", children: item.project.name })] }), _jsx("span", { className: `project-row__state ${item.stalledDays !== null ? 'project-row__state--warning' : ''}`, children: item.stalledDays !== null ? `Parado há ${item.stalledDays} dias` : plural(item.activeTasks, 'ativa', 'ativas') }), _jsx(ActivityMap, { activity: item.activity, today: today, weeks: ROW_MAP_WEEKS, name: item.project.name }), _jsx(ProjectActionsMenu, { project: item.project, objectives: view.objectives, canAddToPriorities: item.canAddToPriorities })] }, item.project.id))) }) })), view.finished.length > 0 && (_jsx(Group, { group: "finished", open: view.open.finished, title: `Finalizados (${view.finished.length})`, note: null, children: _jsx("ul", { className: "project-rows", children: view.finished.map((item) => (_jsxs("li", { className: "project-row project-row--finished", children: [_jsxs("a", { className: "project-row__name project-link", href: routeHash({ name: 'project', id: item.project.id }), children: [_jsx(ProjectIconBadge, { project: item.project, size: "sm" }), _jsx("span", { className: "project-row__label", children: item.project.name })] }), _jsx("span", { className: "project-row__state", children: item.project.finishedAt ? `Finalizado em ${formatShortDate(toDayKey(new Date(item.project.finishedAt)))}` : 'Finalizado' }), _jsx(ProjectActionsMenu, { project: item.project, objectives: view.objectives, canAddToPriorities: false })] }, item.project.id))) }) }))] }));
}
function PriorityCard({ item, view, today }) {
    const { project } = item;
    return (_jsxs("article", { className: "priority-card", "aria-label": project.name, children: [_jsxs("header", { className: "priority-card__head", children: [_jsxs("a", { className: "priority-card__name project-link", href: routeHash({ name: 'project', id: project.id }), children: [_jsx(ProjectIconBadge, { project: project, size: "md" }), _jsx("span", { className: "priority-card__label", children: project.name })] }), _jsx(ProjectActionsMenu, { project: project, objectives: view.objectives, canAddToPriorities: false })] }), _jsx(ActivityMap, { activity: item.activity, today: today, weeks: CARD_MAP_WEEKS, name: project.name }), _jsxs("div", { className: "priority-card__stats", children: [_jsxs("p", { children: [_jsx(Count, { value: item.activeTasks, one: "ativa", many: "ativas" }), ' · ', _jsx("span", { className: item.stuckTasks > 0 ? 'priority-card__stat--warning' : '', children: _jsx(Count, { value: item.stuckTasks, one: "travada", many: "travadas" }) })] }), _jsxs("p", { children: [_jsx(Count, { value: item.finishedLastTwoWeeks, one: "finalizada", many: "finalizadas" }), " nas \u00FAltimas 2 semanas"] })] }), _jsx("p", { className: "priority-card__objective", title: item.objective?.goal, children: item.objective ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "muted", children: "Objetivo: " }), item.objective.goal] })) : (_jsx("span", { className: "muted", children: "Sem objetivo" })) }), _jsx("p", { className: `priority-card__last ${item.stalledDays !== null ? 'priority-card__last--warning' : ''}`, children: item.stalledDays !== null
                    ? `Parado há ${item.stalledDays} dias`
                    : item.lastActivityDay
                        ? `Última atividade ${relativeDay(item.lastActivityDay, today)}`
                        : 'Nenhuma atividade ainda' })] }));
}
/** "3 ativas", with the number in bold. */
function Count({ value, one, many }) {
    return (_jsxs(_Fragment, { children: [_jsx("strong", { className: "priority-card__number", children: value }), " ", value === 1 ? one : many] }));
}
/** A dashed free slot: "Definir prioridade" lets an active project take it. */
function FreeSlot({ candidates }) {
    return (_jsx(Dropdown, { className: "priority-slot", triggerClassName: "priority-slot__button", align: "left", label: "Definir prioridade: escolher um projeto ativo", trigger: _jsxs(_Fragment, { children: [_jsx(Icon, { name: "plus" }), "Definir prioridade"] }), children: (close) => candidates.length === 0 ? (_jsx("p", { className: "dropdown__empty muted", children: "Nenhum outro projeto ativo." })) : (candidates.map((project) => (_jsx(DropdownItem, { onSelect: () => {
                close();
                write(() => addPriorityProject(appContext, project.id));
            }, children: _jsxs("span", { className: "project-link", children: [_jsx(ProjectIconBadge, { project: project, size: "sm" }), project.name] }) }, project.id)))) }));
}
/** A collapsible group whose open state is kept in the settings. */
function Group({ group, open: saved, title, note, children }) {
    // Opens at once; the saved choice catches up when the settings are written.
    const [open, setOpen] = useState(saved);
    useEffect(() => setOpen(saved), [saved]);
    return (_jsxs("section", { className: "projects__group", children: [_jsxs("button", { type: "button", className: "projects__toggle", "aria-expanded": open, onClick: () => {
                    setOpen(!open);
                    write(() => setProjectListGroupOpen(appContext, group, !open));
                }, children: [_jsx(Icon, { name: open ? 'chevronDown' : 'chevronRight', size: "sm" }), _jsx("span", { className: "projects__group-title", children: title }), note && _jsxs("span", { className: "projects__toggle-note", children: ["\u00B7 ", note] })] }), open && children] }));
}
/** "Novo projeto": Enter creates it and opens its page; Escape gives up. */
function NewProjectField({ onDone }) {
    const [name, setName] = useState('');
    const onKeyDown = async (event) => {
        if (event.key === 'Escape')
            onDone();
        if (event.key !== 'Enter' || event.nativeEvent.isComposing || !name.trim())
            return;
        event.preventDefault();
        const project = await enqueue(() => createProject(appContext, name));
        onDone();
        navigate({ name: 'project', id: project.id });
    };
    return (_jsxs("label", { className: "new-project", children: [_jsx(Icon, { name: "plus", size: "sm" }), _jsx("input", { className: "new-project__input", value: name, autoFocus: true, placeholder: "Nome do projeto", "aria-label": "Nome do novo projeto", onChange: (event) => setName(event.target.value), onKeyDown: (event) => void onKeyDown(event), onBlur: () => !name.trim() && onDone() })] }));
}
