import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { reactivateTask, setTaskDone } from '../../application/notebook';
import { loadActiveTasks, loadArchivedTasks } from '../../application/queries';
import { ProjectChip } from '../components/Chips';
import { Linkified } from '../components/Linkified';
import { LoadingPage } from '../components/Skeleton';
import { formatShortDate, formatTime, postponedLabel, relativeDay } from '../format';
import { routeHash } from '../hooks';
import { appContext, reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';
function originLabel(section) {
    if (!section)
        return 'Origem desconhecida';
    if (section.projectPage)
        return `Veio da página do projeto · ${formatShortDate(section.day)}`;
    const kind = section.kind === 'meeting' ? 'Reunião' : 'Geral';
    return `Veio de: ${kind} · ${formatTime(section.createdAt)} · ${section.title ?? 'sem título'} · ${formatShortDate(section.day)}`;
}
function ListPage({ title, children }) {
    return (_jsxs("main", { className: "page", children: [_jsx("h1", { className: "page__title", children: title }), children] }));
}
function TaskRow({ item, today, action }) {
    const [open, setOpen] = useState(false);
    const { task, project, origin } = item;
    const when = task.intendedDate ? relativeDay(task.intendedDate, today) : 'sem data';
    const meta = [task.status === 'active' ? when : null, postponedLabel(task.postponeCount)].filter(Boolean).join(' · ');
    return (_jsxs("li", { className: "card-list__item card-list__item--stacked", children: [_jsxs("div", { className: "task-row", children: [action, _jsx("button", { type: "button", className: "task-row__text", onClick: () => setOpen(!open), "aria-expanded": open, children: _jsx(Linkified, { text: task.text || '(tarefa sem texto)' }) }), _jsxs("span", { className: "list-meta", children: [project && _jsx(ProjectChip, { name: project.name }), meta && _jsx("span", { className: "muted", children: meta })] })] }), open && (_jsxs("p", { className: "muted task-row__origin", children: [originLabel(origin), origin?.notesDestination === 'wiki' && (_jsxs(_Fragment, { children: [' · ', _jsx("a", { href: routeHash({ name: 'wiki', section: origin.id }), children: "ver na wiki" })] }))] }))] }));
}
export function ActiveTasksScreen({ today }) {
    const items = useLiveQuery(() => loadActiveTasks(reader));
    if (!items)
        return _jsx(LoadingPage, { title: "Tarefas ativas" });
    return (_jsx(ListPage, { title: "Tarefas ativas", children: items.length === 0 ? (_jsx("p", { className: "muted", children: "Nenhuma tarefa ativa." })) : (_jsxs(_Fragment, { children: [_jsx("ul", { className: "card-list", children: items.map((item) => (_jsx(TaskRow, { item: item, today: today, action: _jsx("input", { type: "checkbox", checked: false, onChange: () => void setTaskDone(appContext, item.task.id, true), "aria-label": `Finalizar "${item.task.text}"` }) }, item.task.id))) }), _jsx("p", { className: "muted", children: "Toque numa tarefa para ver de onde ela veio." })] })) }));
}
export function ArchivedTasksScreen({ today }) {
    const items = useLiveQuery(() => loadArchivedTasks(reader));
    if (!items)
        return _jsx(LoadingPage, { title: "Tarefas arquivadas" });
    return (_jsx(ListPage, { title: "Tarefas arquivadas", children: items.length === 0 ? (_jsx("p", { className: "muted", children: "Nenhuma tarefa arquivada." })) : (_jsx("ul", { className: "card-list", children: items.map((item) => (_jsx(TaskRow, { item: item, today: today, action: _jsx("button", { type: "button", className: "small", onClick: () => void reactivateTask(appContext, item.task.id), children: "Reativar" }) }, item.task.id))) })) }));
}
