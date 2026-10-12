import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { answerWarmupItem, registerThoughts, startDay, startExecution } from '../../application/dayOpening';
import { loadHabits } from '../../application/queries';
import { HabitToggle } from '../habits/HabitsScreen';
import { reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';
import { askAgainAt } from '../../domain/dayFlow';
import { formatLongDate, pendingDaysSentence } from '../format';
import { navigate } from '../hooks';
import { appContext } from '../services';
/** A simple line drawing of a sun, in the theme's colors. */
function Sun() {
    const rays = [0, 45, 90, 135, 180, 225, 270, 315];
    return (_jsxs("svg", { className: "opening__sun", width: "120", height: "120", viewBox: "0 0 120 120", "aria-hidden": "true", children: [_jsx("circle", { cx: "60", cy: "60", r: "20" }), rays.map((angle) => (_jsx("line", { x1: "60", y1: "16", x2: "60", y2: "28", transform: `rotate(${angle} 60 60)` }, angle)))] }));
}
/** "Uma tela branca" with a sun and the "Iniciar Dia" button, and nothing else (SPEC.md, "Navegação"). */
export function StartDayScreen() {
    return (_jsxs("main", { className: "opening", children: [_jsx(Sun, {}), _jsx("button", { type: "button", className: "primary opening__start", onClick: () => void startDay(appContext), children: "Iniciar Dia" })] }));
}
/** A time about two hours ahead, rounded to the half hour, as the default "perguntar de novo às". */
function defaultLaterTime() {
    const later = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const minutes = later.getMinutes() < 30 ? '00' : '30';
    return `${String(later.getHours()).padStart(2, '0')}:${minutes}`;
}
function WarmupRow({ item, answered }) {
    const [time, setTime] = useState(defaultLaterTime);
    const [askingLater, setAskingLater] = useState(false);
    const labels = { done: 'feito', skipped: 'pulado hoje', later: 'volta mais tarde' };
    return (_jsxs("li", { className: "card-list__item", children: [_jsx("span", { className: answered ? 'muted' : '', children: item.text }), answered ? (_jsx("span", { className: "muted", children: labels[answered] })) : askingLater ? (_jsxs("span", { className: "warmup__actions", children: [_jsx("input", { type: "time", className: "date-input", value: time, onChange: (event) => setTime(event.target.value), "aria-label": "Hor\u00E1rio" }), _jsx("button", { type: "button", className: "small", onClick: () => void answerWarmupItem(appContext, item, 'later', askAgainAt(new Date(), time)), children: "Ok" }), _jsx("button", { type: "button", className: "link", onClick: () => setAskingLater(false), children: "Cancelar" })] })) : (_jsxs("span", { className: "warmup__actions", children: [_jsx("button", { type: "button", className: "small primary", onClick: () => void answerWarmupItem(appContext, item, 'done'), children: "Feito" }), _jsx("button", { type: "button", className: "small", onClick: () => void answerWarmupItem(appContext, item, 'skipped'), children: "Pular hoje" }), _jsx("button", { type: "button", className: "small", onClick: () => setAskingLater(true), children: "Perguntar de novo \u00E0s\u2026" })] }))] }));
}
/** The warm-up checklist. When every item has an answer, the app goes on to the dashboard. */
export function WarmupScreen({ view }) {
    const answers = view.record?.warmup ?? {};
    return (_jsxs("main", { className: "page", children: [_jsx("h1", { className: "page__title", children: "Warm up" }), _jsx("ul", { className: "card-list", children: view.warmupItems.map((item) => (_jsx(WarmupRow, { item: item, answered: answers[item.id] }, item.id))) })] }));
}
function greeting(hour) {
    if (hour >= 5 && hour < 12)
        return 'Bom dia';
    if (hour >= 12 && hour < 18)
        return 'Boa tarde';
    return 'Boa noite';
}
/** The welcome screen after the warm up (section 3). */
export function DashboardScreen({ view, today }) {
    const [thoughts, setThoughts] = useState('');
    const [writing, setWriting] = useState(false);
    const [saved, setSaved] = useState(false);
    const [loggingHabits, setLoggingHabits] = useState(false);
    const habits = (useLiveQuery(() => loadHabits(reader, today), [today]) ?? []).filter((habit) => habit.habit.status === 'active' && habit.expectedToday);
    return (_jsxs("main", { className: "page dashboard", children: [_jsxs("h1", { className: "page__title", children: [greeting(new Date().getHours()), ". ", formatLongDate(today), "."] }), _jsx("button", { type: "button", className: "primary dashboard__start", onClick: () => void startExecution(appContext), children: "Iniciar o Flow de Execu\u00E7\u00E3o" }), _jsxs("div", { className: "dashboard__actions", children: [!writing && (_jsx("button", { type: "button", onClick: () => setWriting(true), children: "Registrar pensamentos" })), habits.length > 0 && !loggingHabits && (_jsx("button", { type: "button", onClick: () => setLoggingHabits(true), children: "Registrar h\u00E1bitos" })), view.pendingDays.length > 0 && (_jsx("button", { type: "button", onClick: () => navigate({ name: 'checkout', day: view.pendingDays[0] }), children: "Fazer checkout pendente" }))] }), loggingHabits && (_jsx("ul", { className: "card-list dashboard__thoughts", children: habits.map((habit) => (_jsxs("li", { className: "card-list__item", children: [_jsx("span", { children: habit.habit.name }), _jsx(HabitToggle, { view: habit, today: today })] }, habit.habit.id))) })), view.pendingDays.length > 0 && _jsxs("p", { className: "muted", children: [pendingDaysSentence(view.pendingDays, today), ". O dia pode come\u00E7ar mesmo assim."] }), writing && (_jsxs("div", { className: "panel dashboard__thoughts", children: [_jsxs("label", { className: "field", children: [_jsx("span", { className: "field__label", children: "Pensamentos (entram numa se\u00E7\u00E3o geral da nota do dia)" }), _jsx("textarea", { className: "text-area", rows: 4, value: thoughts, onChange: (event) => setThoughts(event.target.value), autoFocus: true })] }), _jsx("div", { className: "assistant__actions", children: _jsx("button", { type: "button", className: "primary", disabled: !thoughts.trim(), onClick: async () => {
                                await registerThoughts(appContext, thoughts);
                                setThoughts('');
                                setWriting(false);
                                setSaved(true);
                            }, children: "Salvar" }) })] })), saved && _jsx("p", { className: "muted", children: "Pensamentos salvos na nota do dia." })] }));
}
