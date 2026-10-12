import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { closeMonth, createObjectiveFromProject, linkProjectToObjective } from '../../application/objectives';
import { setProjectFinished } from '../../application/projects';
import { loadDueMonthlyReflection, loadMonthlyReflection } from '../../application/queries';
import { monthKey, shiftMonth } from '../../domain/month';
import { formatShortDate } from '../format';
import { navigate, routeHash } from '../hooks';
import { appContext, reader } from '../services';
import { LoadingPage } from '../components/Skeleton';
import { useLiveQuery } from '../useLiveQuery';
const MONTH_NAMES = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
];
function monthLabel(key) {
    const [year, month] = key.split('-').map(Number);
    return `${MONTH_NAMES[month - 1]} de ${year}`;
}
/** "Flow de Reflexão Mensal" (section 4): a dashboard of objectives, projects and habits. */
export function MonthlyReflectionScreen({ month, today }) {
    const key = month ?? shiftMonth(monthKey(today), -1);
    const view = useLiveQuery(() => loadMonthlyReflection(reader, key), [key]);
    const [mode, setMode] = useState('objective');
    if (!view)
        return _jsx(LoadingPage, { title: "Reflex\u00E3o mensal" });
    const closed = Boolean(view.reflection?.closedAt);
    const activeProjects = view.projects.filter((project) => project.status === 'active');
    const withoutObjective = activeProjects.filter((project) => !project.objectiveId);
    const activeObjectives = view.objectives.filter((summary) => summary.objective.status === 'active');
    const objectiveName = (id) => view.objectives.find((summary) => summary.objective.id === id)?.objective.goal ?? null;
    const projectRow = (project) => (_jsxs("li", { className: "card-list__item", children: [_jsx("a", { className: "list-link", href: routeHash({ name: 'project', id: project.id }), children: project.name }), _jsxs("span", { className: "warmup__actions", children: [_jsxs("select", { className: "text-input", value: project.objectiveId ?? '', onChange: (event) => void linkProjectToObjective(appContext, project.id, event.target.value || null), "aria-label": `Objetivo de ${project.name}`, children: [_jsx("option", { value: "", children: "sem objetivo" }), activeObjectives.map(({ objective }) => (_jsx("option", { value: objective.id, children: objective.goal }, objective.id)))] }), _jsx("button", { type: "button", className: "small", onClick: () => void setProjectFinished(appContext, project.id, true), children: "Finalizar" })] })] }, project.id));
    return (_jsxs("main", { className: "page page--wide", children: [_jsxs("header", { className: "reflection__header", children: [_jsx("button", { type: "button", className: "icon-button", onClick: () => navigate({ name: 'monthReflection', month: shiftMonth(key, -1) }), "aria-label": "M\u00EAs anterior", children: "\u2039" }), _jsxs("h1", { className: "page__title reflection__title", children: ["Reflex\u00E3o mensal \u00B7 ", monthLabel(key)] }), _jsx("button", { type: "button", className: "icon-button", disabled: key >= monthKey(today), onClick: () => navigate({ name: 'monthReflection', month: shiftMonth(key, 1) }), "aria-label": "Pr\u00F3ximo m\u00EAs", children: "\u203A" })] }), closed && _jsx("p", { className: "muted", children: "Este m\u00EAs j\u00E1 foi fechado. Ainda d\u00E1 para mudar o que quiser." }), _jsxs("section", { className: "reflection__step", children: [_jsx("h2", { className: "reflection__step-title", children: "Raio-x do m\u00EAs" }), _jsxs("div", { className: "metrics", children: [_jsxs("div", { className: "metric", children: [_jsxs("span", { className: "metric__value", children: [view.metrics.projectsWithoutObjective, " de ", view.metrics.activeProjects] }), _jsx("span", { className: "metric__label", children: "projetos ativos sem objetivo" })] }), _jsxs("div", { className: "metric", children: [_jsx("span", { className: "metric__value", children: view.metrics.habitsWithoutObjective }), _jsx("span", { className: "metric__label", children: "h\u00E1bitos sem objetivo" })] }), _jsxs("div", { className: "metric", children: [_jsxs("span", { className: "metric__value", children: [view.metrics.dayPrioritiesInPriorityProjects, " de ", view.metrics.dayPriorities] }), _jsx("span", { className: "metric__label", children: "prioridades do dia em projetos priorit\u00E1rios da semana" })] })] }), _jsx("p", { className: "muted metrics__note", children: "Blocos sem projeto e objetivos com pouco engajamento entram quando as perguntas em aberto da spec forem respondidas." })] }), withoutObjective.length > 0 && (_jsxs("section", { className: "reflection__step", children: [_jsx("h2", { className: "reflection__step-title", children: "Sugest\u00E3o de objetivos" }), _jsx("p", { className: "muted", children: "Projetos sem objetivo. Crie um objetivo a partir de um deles, ou ligue-o a um objetivo abaixo." }), _jsx("ul", { className: "card-list", children: withoutObjective.map((project) => (_jsxs("li", { className: "card-list__item", children: [_jsx("span", { children: project.name }), _jsx("button", { type: "button", className: "small", onClick: async () => {
                                        const objective = await createObjectiveFromProject(appContext, project.id);
                                        if (objective)
                                            navigate({ name: 'objective', id: objective.id });
                                    }, children: "Criar objetivo a partir deste projeto" })] }, project.id))) })] })), _jsxs("section", { className: "reflection__step", children: [_jsxs("div", { className: "reflection__step-title reflection__views", children: [_jsx("h2", { className: "reflection__step-title", children: "Objetivos e projetos" }), _jsxs("span", { className: "warmup__actions", children: [_jsx("button", { type: "button", className: `small ${mode === 'objective' ? 'primary' : ''}`, onClick: () => setMode('objective'), children: "Por objetivo" }), _jsx("button", { type: "button", className: `small ${mode === 'project' ? 'primary' : ''}`, onClick: () => setMode('project'), children: "Por projeto" })] })] }), mode === 'objective' ? (_jsxs(_Fragment, { children: [activeObjectives.map(({ objective, projects, habits }) => (_jsxs("div", { className: "month__objective", children: [_jsx("a", { className: "list-link", href: routeHash({ name: 'objective', id: objective.id }), children: objective.goal }), _jsxs("ul", { className: "card-list", children: [projects.filter((project) => project.status === 'active').map(projectRow), habits.map((habit) => (_jsx("li", { className: "card-list__item", children: _jsxs("span", { className: "muted", children: ["h\u00E1bito: ", habit.name] }) }, habit.id))), projects.length === 0 && habits.length === 0 && (_jsx("li", { className: "card-list__item muted", children: "Nenhum projeto ou h\u00E1bito ligado." }))] })] }, objective.id))), withoutObjective.length > 0 && (_jsxs("div", { className: "month__objective", children: [_jsx("span", { className: "muted", children: "Sem objetivo" }), _jsx("ul", { className: "card-list", children: withoutObjective.map(projectRow) })] }))] })) : (_jsx("ul", { className: "card-list", children: activeProjects.map((project) => (_jsxs("li", { className: "card-list__item card-list__item--stacked", children: [_jsx("span", { className: "muted", children: objectiveName(project.objectiveId) ? `objetivo: ${objectiveName(project.objectiveId)}` : 'sem objetivo' }), _jsx("ul", { className: "card-list card-list--flat", children: projectRow(project) })] }, project.id))) })), activeProjects.length === 0 && _jsx("p", { className: "muted", children: "Nenhum projeto ativo." })] }), _jsxs("section", { className: "reflection__step", children: [_jsx("h2", { className: "reflection__step-title", children: "Fechar o m\u00EAs" }), _jsx("button", { type: "button", className: "primary", disabled: closed, onClick: async () => {
                            await closeMonth(appContext, view.month, view.metrics);
                            navigate({ name: 'day' });
                        }, children: "Fechar m\u00EAs" })] })] }));
}
/** Shows up in the day note when a month ended and its reflection was not closed. */
export function MonthlyReflectionBanner({ today }) {
    const due = useLiveQuery(() => loadDueMonthlyReflection(reader, today), [today]);
    if (!due)
        return null;
    return (_jsxs("div", { className: "banner", role: "status", children: [_jsxs("span", { children: [monthLabel(due.key).replace(/^./, (letter) => letter.toUpperCase()), " terminou (", formatShortDate(due.start), " a", ' ', formatShortDate(due.end), "). A reflex\u00E3o mensal est\u00E1 dispon\u00EDvel."] }), _jsx("button", { type: "button", className: "link", onClick: () => navigate({ name: 'monthReflection', month: due.key }), children: "Fazer agora" })] }));
}
