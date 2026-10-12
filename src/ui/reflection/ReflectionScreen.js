import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { reactivateTask } from '../../application/notebook';
import { setPriorityProjectInReflection } from '../../application/priorityProjects';
import { loadReflection } from '../../application/queries';
import { closeWeek, reopenWeek, resolveDeferred, saveReflectionTexts } from '../../application/reflection';
import { addDays } from '../../domain/day';
import { PRIORITY_PROJECT_LIMIT } from '../../domain/priorityProjects';
import { ProjectIconBadge } from '../projects/ProjectIcon';
import { defaultReflectionWeek, weekFromKey, weekOf } from '../../domain/week';
import { Linkified } from '../components/Linkified';
import { NotesRowView, rowKey, TaskRowView, GroupHeader } from '../checkout/TriageRows';
import { formatShortDate } from '../format';
import { navigate } from '../hooks';
import { appContext, reader } from '../services';
import { LoadingPage } from '../components/Skeleton';
import { useLiveQuery } from '../useLiveQuery';
/** "Flow de Reflexão Semanal" (SPEC.md, section 2). */
export function ReflectionScreen({ weekKey, today }) {
    const week = weekKey ? weekFromKey(weekKey) : defaultReflectionWeek(today);
    const view = useLiveQuery(() => loadReflection(reader, week, today), [week.key, today]);
    const goToWeek = (target) => navigate({ name: 'reflection', week: target.key });
    if (!view)
        return _jsx(LoadingPage, { title: "Reflex\u00E3o semanal" });
    const closed = Boolean(view.reflection?.closedAt);
    const isCurrentOrPast = week.start <= today;
    return (_jsxs("main", { className: "page page--wide", children: [_jsxs("header", { className: "reflection__header", children: [_jsx("button", { type: "button", className: "icon-button", onClick: () => goToWeek(weekOf(addDays(week.start, -7))), "aria-label": "Semana anterior", children: "\u2039" }), _jsxs("h1", { className: "page__title reflection__title", children: ["Reflex\u00E3o semanal \u00B7 ", formatShortDate(week.start), " a ", formatShortDate(week.end)] }), _jsx("button", { type: "button", className: "icon-button", disabled: !isCurrentOrPast || weekOf(today).key === week.key, onClick: () => goToWeek(weekOf(addDays(week.start, 7))), "aria-label": "Pr\u00F3xima semana", children: "\u203A" })] }), closed && (_jsxs("div", { className: "banner banner--inline", role: "status", children: [_jsx("span", { children: "Esta semana j\u00E1 foi fechada." }), _jsx("button", { type: "button", className: "link", onClick: () => void reopenWeek(appContext, week), children: "Reabrir" })] })), _jsx(Step, { number: 1, title: "Triagem do que foi deixado para c\u00E1", children: _jsx(DeferredTriage, { rows: view.deferred, projects: view.projects, today: today }) }), _jsx(Step, { number: 2, title: "Tarefas arquivadas", children: view.archived.length === 0 ? (_jsx("p", { className: "muted", children: "Nenhuma tarefa arquivada." })) : (_jsx("ul", { className: "card-list", children: view.archived.map(({ task }) => (_jsxs("li", { className: "card-list__item", children: [_jsx(Linkified, { text: task.text || '(tarefa sem texto)' }), _jsx("button", { type: "button", className: "small", onClick: () => void reactivateTask(appContext, task.id), children: "Reativar" })] }, task.id))) })) }), _jsx(Step, { number: 3, title: "Agregar tarefas em projetos", children: _jsx("p", { className: "muted", children: "Esta etapa espera uma decis\u00E3o em aberto na spec: se o app prop\u00F5e os grupos ou se voc\u00EA agrupa \u00E0 m\u00E3o. Enquanto isso, vincule tarefas a projetos no checkout ou na triagem acima." }) }), _jsxs(Step, { number: 4, title: "M\u00E9tricas da semana", children: [_jsxs("div", { className: "metrics", children: [_jsx(Metric, { value: view.metrics.finishedTasks, label: "tarefas executadas" }), _jsx(Metric, { value: view.metrics.intentionAccuracy === null ? '—' : `${Math.round(view.metrics.intentionAccuracy * 100)}%`, label: `feitas no dia da intenção (${view.metrics.finishedOnIntendedDay} de ${view.metrics.finishedWithIntention})` }), _jsx(Metric, { value: view.metrics.postponedTasks, label: "tarefas adiadas" })] }), view.habits.length > 0 && (_jsx("ul", { className: "card-list reflection__habits", children: view.habits.map(({ habit, week: weekStats, month }) => (_jsxs("li", { className: "card-list__item", children: [_jsx("span", { children: habit.name }), _jsxs("span", { className: "muted", children: ["semana ", weekStats.completion === null ? '—' : `${Math.round(weekStats.completion * 100)}%`, " \u00B7 m\u00EAs", ' ', month.completion === null ? '—' : `${Math.round(month.completion * 100)}%`, " \u00B7 maior sequ\u00EAncia", ' ', weekStats.longestStreak] })] }, habit.id))) }))] }), _jsx(Step, { number: 5, title: "Melhores momentos e o que pode melhorar", children: _jsx(ReflectionTexts, { week: week, bestMoments: view.reflection?.bestMoments ?? '', improvements: view.reflection?.improvements ?? '' }, week.key) }), _jsxs(Step, { number: 6, title: "Prioridades da pr\u00F3xima semana", children: [_jsx(PriorityProjectsStep, { view: view, today: today }), _jsx("p", { className: "muted reflection__note", children: "As tarefas priorit\u00E1rias da semana esperam uma decis\u00E3o em aberto na spec: quantas prioridades a semana tem." })] }), _jsx(Step, { number: 7, title: "Fechar a semana", children: _jsx("button", { type: "button", className: "primary", disabled: closed, onClick: async () => {
                        await closeWeek(appContext, week, view.metrics);
                        navigate({ name: 'day' });
                    }, children: "Fechar semana" }) })] }));
}
/**
 * Step 6: the priority projects of the week after the evaluated one. Here, and only here, a
 * project can be taken out or swapped; the list starts as the one carried over.
 */
function PriorityProjectsStep({ view, today }) {
    const { nextWeek, nextWeekPriorityIds: chosen } = view;
    const active = view.projects.filter((project) => project.status === 'active');
    // A week already over keeps the list it had.
    const past = nextWeek.end < today;
    const full = chosen.length >= PRIORITY_PROJECT_LIMIT;
    const ordered = [...chosen.map((id) => active.find((project) => project.id === id)).filter(Boolean), ...active.filter((project) => !chosen.includes(project.id))];
    return (_jsxs("div", { className: "priority-step", children: [_jsxs("p", { className: "muted", children: ["Projetos priorit\u00E1rios da semana de ", formatShortDate(nextWeek.start), " a ", formatShortDate(nextWeek.end), ": at\u00E9 ", PRIORITY_PROJECT_LIMIT, ".", ' ', past ? 'Essa semana já passou, então a lista fica como estava.' : `${chosen.length} de ${PRIORITY_PROJECT_LIMIT} escolhidos.`] }), active.length === 0 ? (_jsx("p", { className: "muted", children: "Nenhum projeto ativo." })) : (_jsx("ul", { className: "card-list", children: ordered.map((project) => {
                    const on = chosen.includes(project.id);
                    return (_jsx("li", { className: "card-list__item", children: _jsxs("label", { className: "check-row", children: [_jsx("input", { type: "checkbox", checked: on, disabled: past || (!on && full), onChange: (event) => void setPriorityProjectInReflection(appContext, nextWeek.key, project.id, event.target.checked) }), _jsx(ProjectIconBadge, { project: project, size: "sm" }), project.name] }) }, project.id));
                }) }))] }));
}
function Step({ number, title, children }) {
    return (_jsxs("section", { className: "reflection__step", "aria-labelledby": `step-${number}`, children: [_jsxs("h2", { className: "reflection__step-title", id: `step-${number}`, children: [_jsx("span", { className: "reflection__step-number", children: number }), " ", title] }), children] }));
}
function Metric({ value, label }) {
    return (_jsxs("div", { className: "metric", children: [_jsx("span", { className: "metric__value", children: value }), _jsx("span", { className: "metric__label", children: label })] }));
}
function DeferredTriage({ rows, projects, today }) {
    const [choices, setChoices] = useState(new Map());
    const [taskProjects, setTaskProjects] = useState(new Map());
    const [busy, setBusy] = useState(false);
    const tomorrow = addDays(today, 1);
    if (rows.length === 0)
        return _jsx("p", { className: "muted", children: "Nada foi deixado para a reflex\u00E3o." });
    const decisionOf = (row) => choices.get(rowKey(row)) ?? row.suggestion;
    async function accept() {
        const decisions = { tasks: new Map(), notes: new Map(), taskProjects };
        for (const row of rows) {
            const decision = decisionOf(row);
            if (row.type === 'task')
                decisions.tasks.set(row.task.id, decision);
            if (row.type === 'notes')
                decisions.notes.set(row.section.id, decision);
        }
        setBusy(true);
        try {
            await resolveDeferred(appContext, decisions);
            setChoices(new Map());
            setTaskProjects(new Map());
        }
        finally {
            setBusy(false);
        }
    }
    return (_jsxs(_Fragment, { children: [rows.map((row) => (_jsxs("div", { className: "triage-group", children: [_jsx(GroupHeader, { row: row }), row.type === 'task' ? (_jsx(TaskRowView, { row: row, decision: decisionOf(row), onChange: (decision) => setChoices((previous) => new Map(previous).set(rowKey(row), decision)), nextDay: tomorrow, today: today, projects: projects, projectId: taskProjects.has(row.task.id) ? taskProjects.get(row.task.id) : row.task.projectId, onProjectChange: (projectId) => setTaskProjects((previous) => new Map(previous).set(row.task.id, projectId)), allowReflection: false })) : (_jsx(NotesRowView, { row: row, decision: decisionOf(row), onChange: (decision) => setChoices((previous) => new Map(previous).set(rowKey(row), decision)), allowReflection: false }))] }, rowKey(row)))), _jsx("div", { className: "assistant__actions", children: _jsx("button", { type: "button", className: "primary", onClick: accept, disabled: busy, children: "Confirmar decis\u00F5es" }) })] }));
}
function ReflectionTexts({ week, bestMoments, improvements }) {
    const [texts, setTexts] = useState({ bestMoments, improvements });
    const timer = useRef(null);
    const latest = useRef(texts);
    latest.current = texts;
    // Save what is pending when leaving the screen.
    useEffect(() => () => {
        if (timer.current) {
            clearTimeout(timer.current);
            void saveReflectionTexts(appContext, week, latest.current);
        }
    }, [week]);
    const change = (field, value) => {
        const next = { ...latest.current, [field]: value };
        setTexts(next);
        if (timer.current)
            clearTimeout(timer.current);
        timer.current = setTimeout(() => {
            timer.current = null;
            void saveReflectionTexts(appContext, week, next);
        }, 600);
    };
    return (_jsxs("div", { className: "reflection__texts", children: [_jsxs("label", { className: "field", children: [_jsx("span", { className: "field__label", children: "Melhores momentos" }), _jsx("textarea", { className: "text-area", rows: 3, value: texts.bestMoments, onChange: (event) => change('bestMoments', event.target.value) })] }), _jsxs("label", { className: "field", children: [_jsx("span", { className: "field__label", children: "O que pode melhorar" }), _jsx("textarea", { className: "text-area", rows: 3, value: texts.improvements, onChange: (event) => change('improvements', event.target.value) })] })] }));
}
