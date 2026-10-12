import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { createHabit, logHabit, setHabitArchived, updateHabit } from '../../application/habits';
import { loadHabits } from '../../application/queries';
import { appContext, reader } from '../services';
import { LoadingPage } from '../components/Skeleton';
import { useLiveQuery } from '../useLiveQuery';
const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
function percent(value) {
    return value === null ? '—' : `${Math.round(value * 100)}%`;
}
/** Yes/no answer for today (section 6). */
export function HabitToggle({ view, today }) {
    return (_jsxs("span", { className: "warmup__actions", children: [_jsx("button", { type: "button", className: `small ${view.doneToday === true ? 'primary' : ''}`, "aria-pressed": view.doneToday === true, onClick: () => void logHabit(appContext, view.habit.id, today, true), children: "Sim" }), _jsx("button", { type: "button", className: `small ${view.doneToday === false ? 'primary' : ''}`, "aria-pressed": view.doneToday === false, onClick: () => void logHabit(appContext, view.habit.id, today, false), children: "N\u00E3o" })] }));
}
function HabitForm({ initial, objectives, onSave, onCancel, }) {
    const [fields, setFields] = useState(initial);
    return (_jsxs("form", { className: "habit-form", onSubmit: (event) => {
            event.preventDefault();
            if (fields.name.trim())
                onSave(fields);
        }, children: [_jsx("input", { className: "text-input", value: fields.name, placeholder: "H\u00E1bito, por exemplo: ler 10 p\u00E1ginas", onChange: (event) => setFields({ ...fields, name: event.target.value }), "aria-label": "Nome do h\u00E1bito" }), _jsx("input", { className: "text-input", value: fields.criterion, placeholder: "Crit\u00E9rio de feito (opcional)", onChange: (event) => setFields({ ...fields, criterion: event.target.value }), "aria-label": "Crit\u00E9rio de feito" }), _jsx("span", { className: "settings__days", children: WEEK_ORDER.map((weekday) => (_jsxs("label", { className: "check-row", children: [_jsx("input", { type: "checkbox", checked: fields.weekdays.includes(weekday), onChange: (event) => setFields({
                                ...fields,
                                weekdays: event.target.checked ? [...fields.weekdays, weekday] : fields.weekdays.filter((day) => day !== weekday),
                            }) }), WEEKDAYS[weekday]] }, weekday))) }), _jsxs("select", { className: "text-input", value: fields.objectiveId ?? '', onChange: (event) => setFields({ ...fields, objectiveId: event.target.value || null }), "aria-label": "Objetivo", children: [_jsx("option", { value: "", children: "sem objetivo" }), objectives
                        .filter((objective) => objective.status === 'active')
                        .map((objective) => (_jsx("option", { value: objective.id, children: objective.goal }, objective.id)))] }), _jsxs("span", { className: "warmup__actions", children: [_jsx("button", { type: "submit", className: "primary", disabled: !fields.name.trim(), children: "Salvar" }), onCancel && (_jsx("button", { type: "button", onClick: onCancel, children: "Cancelar" }))] })] }));
}
const ALL_WEEK = [0, 1, 2, 3, 4, 5, 6];
/** Section 6: habits, logged as yes or no, with streak and completion. */
export function HabitsScreen({ today }) {
    const views = useLiveQuery(() => loadHabits(reader, today), [today]);
    const objectives = useLiveQuery(() => reader.objectives()) ?? [];
    const [editing, setEditing] = useState(null);
    const [creating, setCreating] = useState(false);
    if (!views)
        return _jsx(LoadingPage, { title: "H\u00E1bitos" });
    const active = views.filter((view) => view.habit.status === 'active');
    const archived = views.filter((view) => view.habit.status === 'archived');
    const fieldsOf = (habit) => ({
        name: habit.name,
        criterion: habit.criterion,
        weekdays: habit.weekdays,
        objectiveId: habit.objectiveId,
    });
    return (_jsxs("main", { className: "page", children: [_jsx("h1", { className: "page__title", children: "H\u00E1bitos" }), active.length === 0 && !creating && _jsx("p", { className: "muted", children: "Nenhum h\u00E1bito. No checkout, uma tarefa tamb\u00E9m pode virar h\u00E1bito." }), active.length > 0 && (_jsx("ul", { className: "card-list", children: active.map((view) => (_jsx("li", { className: "card-list__item card-list__item--stacked", children: editing === view.habit.id ? (_jsx(HabitForm, { initial: fieldsOf(view.habit), objectives: objectives, onCancel: () => setEditing(null), onSave: (fields) => {
                            void updateHabit(appContext, view.habit.id, fields);
                            setEditing(null);
                        } })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "task-row", children: [_jsxs("span", { className: "task-row__text", children: [view.habit.name, view.habit.criterion && _jsxs("span", { className: "muted", children: [" \u00B7 ", view.habit.criterion] })] }), view.expectedToday ? _jsx(HabitToggle, { view: view, today: today }) : _jsx("span", { className: "muted", children: "hoje n\u00E3o" })] }), _jsxs("span", { className: "muted habit__stats", children: ["Semana: ", percent(view.week.completion), " \u00B7 M\u00EAs: ", percent(view.month.completion), " \u00B7 Maior sequ\u00EAncia no m\u00EAs:", ' ', view.month.longestStreak, ' · ', _jsx("button", { type: "button", className: "link", onClick: () => setEditing(view.habit.id), children: "editar" }), ' · ', _jsx("button", { type: "button", className: "link", onClick: () => void setHabitArchived(appContext, view.habit.id, true), children: "arquivar" })] })] })) }, view.habit.id))) })), creating ? (_jsx("div", { className: "panel settings__panel", children: _jsx(HabitForm, { initial: { name: '', criterion: '', weekdays: ALL_WEEK, objectiveId: null }, objectives: objectives, onCancel: () => setCreating(false), onSave: (fields) => {
                        void createHabit(appContext, fields);
                        setCreating(false);
                    } }) })) : (_jsx("div", { className: "assistant__actions", children: _jsx("button", { type: "button", className: "primary", onClick: () => setCreating(true), children: "Novo h\u00E1bito" }) })), archived.length > 0 && (_jsxs(_Fragment, { children: [_jsx("h2", { className: "card__subtitle", children: "Arquivados" }), _jsx("ul", { className: "card-list", children: archived.map((view) => (_jsxs("li", { className: "card-list__item", children: [_jsx("span", { className: "muted", children: view.habit.name }), _jsx("button", { type: "button", className: "small", onClick: () => void setHabitArchived(appContext, view.habit.id, false), children: "Reativar" })] }, view.habit.id))) })] }))] }));
}
