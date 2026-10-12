import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { setDayPriority, setDeadline, setIntendedDate } from '../../application/dayTools';
import { setTaskDone, updateBlockText } from '../../application/notebook';
import { createProjectTask, renameProject, setProjectIcon } from '../../application/projects';
import { loadDayPriorities, loadProject, loadProjectResources } from '../../application/queries';
import { setProjectPanelPinned } from '../../application/settings';
import { agendaDays, groupProjectTasks, stuckReason } from '../../domain/projectPage';
import { BlockLine, DatePicker } from '../dayNote/BlockLine';
import { requestFocus } from '../dayNote/focus';
import { Icon } from '../components/Icon';
import { Linkified } from '../components/Linkified';
import { LoadingPage } from '../components/Skeleton';
import { agendaDate, formatLongDate, formatShortDate, formatTime, plural, stuckReasonLabel } from '../format';
import { navigate, routeHash } from '../hooks';
import { appContext, reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';
import { enqueue } from '../writeQueue';
import { ProjectActionsMenu } from './ProjectActions';
import { ProjectIconPicker } from './ProjectIcon';
import { ProjectSidePanel } from './ProjectSidePanel';
function write(work) {
    enqueue(work).catch(() => {
        // Logged by the queue; the screen shows the saved state again on its own.
    });
}
/** Below this width the docked column would squeeze the tasks, so it only opens over them. */
const NARROW_QUERY = '(max-width: 900px)';
function useNarrow() {
    const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW_QUERY).matches);
    useEffect(() => {
        const query = window.matchMedia(NARROW_QUERY);
        const onChange = () => setNarrow(query.matches);
        // Some browsers and emulators only fire `resize`, so listen to both.
        query.addEventListener('change', onChange);
        window.addEventListener('resize', onChange);
        return () => {
            query.removeEventListener('change', onChange);
            window.removeEventListener('resize', onChange);
        };
    }, []);
    return narrow;
}
/** "Nova tarefa", always above the tabs: Enter creates the task and keeps the field for the next one. */
function NewTaskField({ projectId }) {
    const [text, setText] = useState('');
    const onKeyDown = (event) => {
        if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
            event.preventDefault();
            const typed = text;
            setText('');
            write(() => createProjectTask(appContext, projectId, typed));
        }
        else if (event.key === 'Escape') {
            setText('');
            event.currentTarget.blur();
        }
    };
    return (_jsxs("label", { className: "new-task", children: [_jsx(Icon, { name: "plus", size: "sm" }), _jsx("input", { className: "new-task__input", value: text, placeholder: "Nova tarefa", "aria-label": "Nova tarefa do projeto", onChange: (event) => setText(event.target.value), onKeyDown: onKeyDown })] }));
}
/** A group with a counter that can be folded: "Sem data" (open at first) and "Feitas" (closed). */
function FoldedGroup({ label, count, initiallyOpen, className, children }) {
    const [open, setOpen] = useState(initiallyOpen);
    if (count === 0)
        return null;
    return (_jsxs("section", { className: `task-group ${className}`, "aria-label": label, children: [_jsxs("button", { type: "button", className: "task-group__toggle", "aria-expanded": open, onClick: () => setOpen(!open), children: [_jsx(Icon, { name: open ? 'chevronDown' : 'chevronRight', size: "sm" }), label, " ", _jsx("span", { className: "task-group__count", children: count })] }), open && children] }));
}
export function ProjectScreen({ id, tab, today }) {
    const view = useLiveQuery(() => loadProject(reader, id, today), [id, today]);
    const objectives = useLiveQuery(() => reader.objectives()) ?? [];
    const resources = useLiveQuery(() => loadProjectResources(reader, id), [id]) ?? [];
    const dayPriorities = useLiveQuery(() => loadDayPriorities(reader, today), [today]) ?? [];
    const pinned = useLiveQuery(async () => (await reader.settings())?.projectPanelPinned ?? false) ?? false;
    const narrow = useNarrow();
    const [peek, setPeek] = useState(false);
    const [name, setName] = useState('');
    useEffect(() => {
        if (view)
            setName(view.project.name);
    }, [view?.project.name]);
    const docked = pinned && !narrow;
    const panelShown = docked || peek;
    // A peeking column closes on Escape and on a click outside it (or its toggle).
    useEffect(() => {
        if (!peek || docked)
            return;
        const onKey = (event) => event.key === 'Escape' && setPeek(false);
        const onPointer = (event) => {
            const target = event.target;
            if (!target.closest('.project-panel, .project-tabs__side, .dropdown__list'))
                setPeek(false);
        };
        document.addEventListener('keydown', onKey);
        document.addEventListener('pointerdown', onPointer);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('pointerdown', onPointer);
        };
    }, [peek, docked]);
    const back = (_jsxs("nav", { className: "crumb", "aria-label": "Trilha", children: [_jsx("a", { href: routeHash({ name: 'projects' }), children: "Projetos" }), _jsx(Icon, { name: "chevronRight", size: "sm" }), _jsx("span", { "aria-current": "page", children: view?.project.name ?? '' })] }));
    if (view === undefined)
        return _jsx(LoadingPage, { before: back });
    if (view === null) {
        return (_jsx("main", { className: "page", children: _jsx("p", { className: "muted", children: "Projeto n\u00E3o encontrado." }) }));
    }
    const { project } = view;
    const active = view.activeTasks.map((item) => item.task);
    const done = view.doneTasks.map((item) => item.task);
    const groups = groupProjectTasks(active, today);
    const agenda = agendaDays(groups.upcoming);
    const priorityIds = new Set(dayPriorities.map((priority) => priority.task.id));
    // Arrow keys move through the lines in the order they show.
    const shownLines = [...groups.stuck, ...agenda.flatMap((entry) => entry.tasks), ...groups.undated, ...done];
    const handlers = {
        onSaveText: (block, text) => write(() => updateBlockText(appContext, block.id, text)),
        // The page has no free lines: Enter, Backspace and kind changes belong to the day note.
        onEnter: () => { },
        onBackspaceAtStart: () => { },
        onMakeTask: () => { },
        onToggleDone: (block, isDone) => write(() => setTaskDone(appContext, block.id, isDone)),
        onArrow: (block, direction) => {
            const index = shownLines.findIndex((line) => line.id === block.id);
            const target = shownLines[index + (direction === 'up' ? -1 : 1)];
            if (target)
                requestFocus(target.id, direction === 'up' ? 'end' : 0);
        },
        onSetDate: (block, date) => write(() => setIntendedDate(appContext, block.id, date)),
        onSetDeadline: (block, date) => write(() => setDeadline(appContext, block.id, date)),
        onTogglePriority: (block, on) => write(() => setDayPriority(appContext, block.id, on)),
    };
    const line = (task, hideDate = false) => (_jsx(BlockLine, { block: task, free: false, day: null, today: today, isPriority: priorityIds.has(task.id), allowNewLines: false, handlers: handlers, hideDate: hideDate }, task.id));
    const togglePanel = () => {
        if (docked)
            write(() => setProjectPanelPinned(appContext, false));
        else
            setPeek(!peek);
    };
    const togglePin = () => {
        setPeek(false);
        write(() => setProjectPanelPinned(appContext, !pinned));
    };
    const goTab = (next) => navigate(next === 'notes' ? { name: 'project', id, tab: 'notes' } : { name: 'project', id });
    return (_jsx("main", { className: `page page--project ${docked ? 'page--project-docked' : ''}`, children: _jsxs("div", { className: "project-layout", children: [_jsxs("div", { className: "project-layout__main", children: [back, _jsxs("header", { className: "project-head", children: [_jsx(ProjectIconPicker, { project: project, onChange: (icon) => write(() => setProjectIcon(appContext, project.id, icon)) }), _jsx("input", { className: "project-head__name", value: name, onChange: (event) => setName(event.target.value), onBlur: () => write(() => renameProject(appContext, project.id, name)), onKeyDown: (event) => event.key === 'Enter' && event.currentTarget.blur(), "aria-label": "Nome do projeto" }), view.isPriority && (_jsx("span", { className: "project-head__star", title: "Priorit\u00E1rio da semana", "aria-label": "Priorit\u00E1rio da semana", role: "img", children: _jsx(Icon, { name: "star", size: "sm", filled: true }) })), _jsx(ProjectActionsMenu, { project: project, objectives: objectives, canAddToPriorities: view.canAddToPriorities })] }), _jsx(NewTaskField, { projectId: project.id }), _jsxs("div", { className: "project-tabs", role: "tablist", "aria-label": "Conte\u00FAdo do projeto", children: [_jsxs("button", { type: "button", role: "tab", "aria-selected": tab === 'tasks', className: "project-tabs__tab", onClick: () => goTab('tasks'), children: ["Tarefas ", _jsx("span", { className: "project-tabs__count", children: active.length })] }), _jsxs("button", { type: "button", role: "tab", "aria-selected": tab === 'notes', className: "project-tabs__tab", onClick: () => goTab('notes'), children: ["Notas ", _jsx("span", { className: "project-tabs__count", children: view.notes.length })] }), _jsx("span", { className: "project-tabs__spacer" }), _jsxs("button", { type: "button", className: "tertiary project-tabs__side", "aria-expanded": panelShown, "aria-label": `${panelShown ? 'Esconder' : 'Mostrar'} detalhes e recursos${resources.length > 0 ? `, ${plural(resources.length, 'recurso', 'recursos')}` : ''}`, title: "Detalhes e recursos", onClick: togglePanel, children: [_jsx(Icon, { name: "sidebar" }), resources.length > 0 && _jsx("span", { className: "project-tabs__badge", children: resources.length })] })] }), tab === 'tasks' ? (_jsxs("div", { role: "tabpanel", "aria-label": "Tarefas", className: "project-tasks", children: [active.length === 0 && _jsx("p", { className: "muted project-tasks__empty", children: "Nenhuma tarefa ativa." }), groups.stuck.length > 0 && (_jsxs("section", { className: "stuck", "aria-label": "Travadas", children: [_jsxs("h3", { className: "stuck__title", children: ["Travadas ", _jsx("span", { className: "task-group__count", children: groups.stuck.length })] }), groups.stuck.map((task) => {
                                            const reason = stuckReason(task, today);
                                            return (_jsxs("div", { className: "stuck__card", children: [line(task, true), _jsxs("div", { className: "stuck__foot", children: [_jsx("span", { className: "stuck__reason", children: reason ? stuckReasonLabel(reason) : '' }), _jsx(DatePicker, { label: "Dar uma nova data de inten\u00E7\u00E3o", className: "small stuck__date", value: task.intendedDate, min: today, onChange: (date) => handlers.onSetDate(task, date), children: "Nova data" })] })] }, task.id));
                                        })] })), agenda.length > 0 && (_jsxs("section", { className: "agenda", "aria-label": "Pr\u00F3ximos dias", children: [_jsxs("h3", { className: "task-group__title", children: ["Pr\u00F3ximos dias ", _jsx("span", { className: "task-group__count", children: groups.upcoming.length })] }), agenda.map(({ day, tasks }) => {
                                            const date = agendaDate(day, today);
                                            return (_jsxs("div", { className: "agenda__day", children: [_jsxs("span", { className: `agenda__date ${day === today ? 'agenda__date--today' : ''}`, title: formatLongDate(day), children: [_jsx("span", { className: "agenda__date-top", children: date.top }), _jsx("span", { className: "agenda__date-number", children: date.bottom })] }), _jsx("div", { className: "agenda__tasks", children: tasks.map((task) => line(task, true)) })] }, day));
                                        })] })), _jsx(FoldedGroup, { label: "Sem data", count: groups.undated.length, initiallyOpen: true, className: "task-group--undated", children: groups.undated.map((task) => line(task)) }), _jsx(FoldedGroup, { label: "Feitas", count: done.length, initiallyOpen: false, className: "task-group--done", children: done.map((task) => line(task)) })] })) : (_jsx("div", { role: "tabpanel", "aria-label": "Notas", children: view.notes.length === 0 ? (_jsx("p", { className: "muted project-tasks__empty", children: "As notas das se\u00E7\u00F5es deste projeto aparecem aqui depois do checkout." })) : (_jsx("ol", { className: "timeline", children: view.notes.map(({ section, notes }) => (_jsxs("li", { className: `timeline__entry ${section.kind === 'meeting' ? 'timeline__entry--meeting' : ''}`, children: [_jsx("span", { className: "timeline__dot", "aria-hidden": "true" }), _jsxs("p", { className: "timeline__when", children: [formatShortDate(section.day), " \u00B7 ", formatTime(section.createdAt), " \u00B7", ' ', section.kind === 'meeting' ? (_jsxs("span", { className: "timeline__kind", children: ["Reuni\u00E3o", section.participants ? ` com ${section.participants}` : ''] })) : ('Geral'), section.title && section.title !== project.name ? ` · ${section.title}` : ''] }), notes.map((note) => (_jsx("p", { className: "timeline__note", children: _jsx(Linkified, { text: note.text }) }, note.id)))] }, section.id))) })) }))] }), panelShown ? (_jsx(ProjectSidePanel, { view: view, objectives: objectives, resources: resources, pinned: pinned, floating: !docked, onTogglePin: togglePin, onClose: () => setPeek(false) })) : null] }) }));
}
