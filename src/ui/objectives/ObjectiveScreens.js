import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { createObjective, finishObjective, linkProjectToObjective, reopenObjective, updateObjective, } from '../../application/objectives';
import { loadObjective, loadObjectives } from '../../application/queries';
import { plural } from '../format';
import { navigate, routeHash } from '../hooks';
import { appContext, reader } from '../services';
import { LoadingPage } from '../components/Skeleton';
import { useLiveQuery } from '../useLiveQuery';
import { Resources } from './Resources';
/** Section 4: objectives — a goal, a motivation, projects and resources. */
export function ObjectivesScreen() {
    const summaries = useLiveQuery(() => loadObjectives(reader));
    const [goal, setGoal] = useState('');
    const [motivation, setMotivation] = useState('');
    const [showFinished, setShowFinished] = useState(false);
    if (!summaries)
        return _jsx(LoadingPage, { title: "Objetivos" });
    const active = summaries.filter((summary) => summary.objective.status === 'active');
    const finished = summaries.filter((summary) => summary.objective.status === 'finished');
    const list = (items) => (_jsx("ul", { className: "card-list", children: items.map(({ objective, projects, habits }) => (_jsxs("li", { className: "card-list__item", children: [_jsx("a", { className: "list-link", href: routeHash({ name: 'objective', id: objective.id }), children: objective.goal }), _jsxs("span", { className: "muted", children: [plural(projects.length, 'projeto', 'projetos'), " \u00B7 ", plural(habits.length, 'hábito', 'hábitos'), objective.status === 'finished' && (objective.achieved ? ' · atingido' : ' · não atingido')] })] }, objective.id))) }));
    return (_jsxs("main", { className: "page", children: [_jsx("h1", { className: "page__title", children: "Objetivos" }), active.length === 0 ? _jsx("p", { className: "muted", children: "Nenhum objetivo ativo. A reflex\u00E3o mensal sugere objetivos a partir dos projetos." }) : list(active), finished.length > 0 && (_jsxs(_Fragment, { children: [_jsxs("button", { type: "button", className: "link projects__toggle", onClick: () => setShowFinished(!showFinished), children: [showFinished ? 'Esconder' : 'Mostrar', " ", plural(finished.length, 'objetivo finalizado', 'objetivos finalizados')] }), showFinished && list(finished)] })), _jsxs("form", { className: "panel settings__panel objective__new", onSubmit: async (event) => {
                    event.preventDefault();
                    if (!goal.trim())
                        return;
                    const objective = await createObjective(appContext, goal, motivation);
                    setGoal('');
                    setMotivation('');
                    navigate({ name: 'objective', id: objective.id });
                }, children: [_jsx("h2", { children: "Novo objetivo" }), _jsxs("label", { className: "field", children: [_jsx("span", { className: "field__label", children: "Meta: uma frase que voc\u00EA vai decidir se atingiu ou n\u00E3o" }), _jsx("input", { className: "text-input", value: goal, onChange: (event) => setGoal(event.target.value) })] }), _jsxs("label", { className: "field", children: [_jsx("span", { className: "field__label", children: "Motiva\u00E7\u00E3o: o que faz voc\u00EA querer engajar com isso" }), _jsx("textarea", { className: "text-area", rows: 2, value: motivation, onChange: (event) => setMotivation(event.target.value) })] }), _jsx("div", { className: "assistant__actions", children: _jsx("button", { type: "submit", className: "primary", disabled: !goal.trim(), children: "Criar objetivo" }) })] })] }));
}
export function ObjectiveScreen({ id }) {
    const view = useLiveQuery(() => loadObjective(reader, id), [id]);
    const [goal, setGoal] = useState('');
    const [motivation, setMotivation] = useState('');
    useEffect(() => {
        if (!view)
            return;
        setGoal(view.objective.goal);
        setMotivation(view.objective.motivation);
    }, [view?.objective.goal, view?.objective.motivation]);
    if (view === undefined)
        return _jsx(LoadingPage, {});
    if (view === null) {
        return (_jsx("main", { className: "page", children: _jsx("p", { className: "muted", children: "Objetivo n\u00E3o encontrado." }) }));
    }
    const { objective } = view;
    const save = () => void updateObjective(appContext, objective.id, { goal, motivation });
    return (_jsxs("main", { className: "page", children: [_jsx("button", { type: "button", className: "link", onClick: () => navigate({ name: 'objectives' }), children: "\u2190 Objetivos" }), _jsx("div", { className: "project__header", children: _jsx("input", { className: "project__name", value: goal, onChange: (event) => setGoal(event.target.value), onBlur: save, "aria-label": "Meta" }) }), _jsxs("label", { className: "field", children: [_jsx("span", { className: "field__label", children: "Motiva\u00E7\u00E3o" }), _jsx("textarea", { className: "text-area", rows: 2, value: motivation, onChange: (event) => setMotivation(event.target.value), onBlur: save })] }), _jsx("div", { className: "objective__status", children: objective.status === 'active' ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "muted", children: "Finalizar:" }), _jsx("button", { type: "button", onClick: () => void finishObjective(appContext, objective.id, true), children: "Atingi a meta" }), _jsx("button", { type: "button", onClick: () => void finishObjective(appContext, objective.id, false), children: "N\u00E3o atingi" })] })) : (_jsxs(_Fragment, { children: [_jsxs("span", { className: "muted", children: ["Finalizado \u00B7 ", objective.achieved ? 'meta atingida' : 'meta não atingida'] }), _jsx("button", { type: "button", onClick: () => void reopenObjective(appContext, objective.id), children: "Reabrir" })] })) }), _jsx("h2", { className: "card__subtitle", children: "Projetos" }), view.projects.length === 0 ? (_jsx("p", { className: "muted", children: "Nenhum projeto ligado a este objetivo." })) : (_jsx("ul", { className: "card-list", children: view.projects.map((project) => (_jsxs("li", { className: "card-list__item", children: [_jsx("a", { className: "list-link", href: routeHash({ name: 'project', id: project.id }), children: project.name }), _jsx("button", { type: "button", className: "line__action", onClick: () => void linkProjectToObjective(appContext, project.id, null), children: "Desvincular" })] }, project.id))) })), view.unlinkedProjects.length > 0 && (_jsxs("select", { className: "text-input objective__link", value: "", onChange: (event) => event.target.value && void linkProjectToObjective(appContext, event.target.value, objective.id), "aria-label": "Ligar um projeto", children: [_jsx("option", { value: "", children: "Ligar um projeto sem objetivo\u2026" }), view.unlinkedProjects.map((project) => (_jsx("option", { value: project.id, children: project.name }, project.id)))] })), _jsx("h2", { className: "card__subtitle", children: "H\u00E1bitos" }), view.habits.length === 0 ? (_jsxs("p", { className: "muted", children: ["Nenhum h\u00E1bito. Ligue h\u00E1bitos a este objetivo em ", _jsx("a", { href: routeHash({ name: 'habits' }), children: "H\u00E1bitos" }), "."] })) : (_jsx("ul", { className: "card-list", children: view.habits.map((habit) => (_jsx("li", { className: "card-list__item", children: habit.name }, habit.id))) })), _jsx("h2", { className: "card__subtitle", children: "Recursos" }), _jsx(Resources, { owner: { ownerType: 'objective', ownerId: objective.id }, resources: view.resources })] }));
}
