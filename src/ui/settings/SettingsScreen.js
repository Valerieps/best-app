import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { setWeeklyReflectionSchedule } from '../../application/reflection';
import { setActiveDays, setCleanupLimits, setWarmupItems } from '../../application/settings';
import { ASSISTANT_IDS, limitsFor, withLimit } from '../../domain/cleanupStatus';
import { ALL_DAYS } from '../../domain/dayFlow';
import { ASSISTANT_INFO } from '../cleanup/assistantInfo';
import { appContext, reader } from '../services';
import { LoadingPage } from '../components/Skeleton';
import { useLiveQuery } from '../useLiveQuery';
const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
/** Monday first, as people read a work week. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
/** User settings: weekly reflection (section 2), active days and warm up (section 3). */
export function SettingsScreen() {
    const settings = useLiveQuery(async () => (await reader.settings()) ?? null);
    if (settings === undefined)
        return _jsx(LoadingPage, { title: "Configura\u00E7\u00F5es" });
    const schedule = settings?.weeklyReflection ?? null;
    const activeDays = settings?.activeDays ?? [...ALL_DAYS];
    const updateSchedule = (next) => void setWeeklyReflectionSchedule(appContext, next);
    return (_jsxs("main", { className: "page", children: [_jsx("h1", { className: "page__title", children: "Configura\u00E7\u00F5es" }), _jsxs("section", { className: "panel settings__panel", children: [_jsx("h2", { children: "Warm up" }), _jsx("p", { className: "muted", children: "Com pelo menos um item, o dia passa a abrir com \u201CIniciar Dia\u201D, o warm up e o dashboard. Sem itens, o app abre direto na nota do dia." }), _jsx(WarmupEditor, { items: settings?.warmupItems ?? [] })] }), _jsxs("section", { className: "panel settings__panel", children: [_jsx("h2", { children: "Dias ativos" }), _jsx("p", { className: "muted", children: "No checkout, \u201Cdia seguinte\u201D pula os dias desmarcados: na sexta, o dia seguinte \u00E9 a segunda." }), _jsx("div", { className: "settings__days", children: WEEK_ORDER.map((weekday) => (_jsxs("label", { className: "check-row", children: [_jsx("input", { type: "checkbox", checked: activeDays.includes(weekday), onChange: (event) => {
                                        const next = event.target.checked
                                            ? [...activeDays, weekday]
                                            : activeDays.filter((day) => day !== weekday);
                                        if (next.length > 0)
                                            void setActiveDays(appContext, next);
                                    } }), WEEKDAYS[weekday]] }, weekday))) })] }), _jsxs("section", { className: "panel settings__panel", children: [_jsx("h2", { children: "Reflex\u00E3o semanal" }), _jsx("p", { className: "muted", children: "O app n\u00E3o envia notifica\u00E7\u00F5es: no hor\u00E1rio escolhido, um aviso aparece na nota do dia. A reflex\u00E3o tamb\u00E9m pode ser feita a qualquer hora pelo menu." }), _jsxs("label", { className: "check-row", children: [_jsx("input", { type: "checkbox", checked: schedule !== null, onChange: (event) => updateSchedule(event.target.checked ? { weekday: 5, hour: 17 } : null) }), "Avisar toda semana"] }), schedule && (_jsxs("div", { className: "settings__row", children: [_jsx("select", { className: "text-input", value: schedule.weekday, onChange: (event) => updateSchedule({ ...schedule, weekday: Number(event.target.value) }), "aria-label": "Dia da semana", children: WEEK_ORDER.map((weekday) => (_jsx("option", { value: weekday, children: WEEKDAYS[weekday] }, weekday))) }), _jsx("span", { children: "\u00E0s" }), _jsx("select", { className: "text-input", value: schedule.hour, onChange: (event) => updateSchedule({ ...schedule, hour: Number(event.target.value) }), "aria-label": "Hora", children: Array.from({ length: 24 }, (_, hour) => (_jsxs("option", { value: hour, children: [String(hour).padStart(2, '0'), "h"] }, hour))) })] }))] }), _jsxs("section", { className: "panel settings__panel", children: [_jsx("h2", { children: "Colocar ordem na casa" }), _jsx("p", { className: "muted", children: "A cor de cada assistente depende de quantos itens ele encontrou. Sem nenhum item, o cart\u00E3o fica verde. Escolha a partir de quantos itens ele fica amarelo, laranja e vermelho." }), _jsx(CleanupLimitsEditor, { saved: settings?.cleanupLimits })] })] }));
}
const LIMIT_COLORS = [
    { label: 'Amarelo', status: 1 },
    { label: 'Laranja', status: 2 },
    { label: 'Vermelho', status: 3 },
];
/** Limits of the cleanup dashboard colors, one row per assistant. Saved when leaving a field. */
function CleanupLimitsEditor({ saved }) {
    return (_jsx("div", { className: "limits__wrap", children: _jsxs("table", { className: "limits", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Assistente" }), LIMIT_COLORS.map(({ label, status }) => (_jsxs("th", { children: [_jsx("span", { className: `limits__swatch limits__swatch--${status}`, "aria-hidden": "true" }), label, " a partir de"] }, label))), _jsx("th", {})] }) }), _jsx("tbody", { children: ASSISTANT_IDS.map((id) => (_jsx(CleanupLimitsRow, { id: id, limits: limitsFor(id, saved), custom: saved?.[id] !== undefined }, id))) })] }) }));
}
function CleanupLimitsRow({ id, limits, custom }) {
    const { name, unit } = ASSISTANT_INFO[id];
    const [draft, setDraft] = useState(limits.map(String));
    // Follow saved changes, including the normalization done when saving.
    const savedKey = limits.join();
    useEffect(() => setDraft(savedKey.split(',')), [savedKey]);
    // The edited field wins; the other two move out of its way. An empty field goes back.
    const save = (index) => {
        const typed = draft[index].trim();
        const next = typed === '' ? limits : withLimit(limits, index, Number(typed));
        if (next.join() !== savedKey)
            void setCleanupLimits(appContext, id, next);
        else
            setDraft(savedKey.split(','));
    };
    return (_jsxs("tr", { children: [_jsx("td", { children: name }), LIMIT_COLORS.map(({ label }, index) => (_jsxs("td", { children: [_jsx("input", { type: "number", min: 1, step: 1, className: "text-input limits__input", value: draft[index], onChange: (event) => setDraft(draft.map((value, i) => (i === index ? event.target.value : value))), onBlur: () => save(index), "aria-label": `${name}: ${label.toLowerCase()} a partir de quantos ${unit[1]}` }), ' ', _jsx("span", { className: "muted", children: Number(draft[index]) === 1 ? unit[0] : unit[1] })] }, label))), _jsx("td", { children: custom && (_jsx("button", { type: "button", className: "link", onClick: () => void setCleanupLimits(appContext, id, null), children: "Voltar ao padr\u00E3o" })) })] }));
}
/** Edits the warm-up checklist. Changes are saved when leaving a field or adding/removing items. */
function WarmupEditor({ items }) {
    const [draft, setDraft] = useState(items);
    const [newText, setNewText] = useState('');
    // Follow saved changes (or another tab) by content, not by array identity.
    const savedKey = JSON.stringify(items);
    useEffect(() => setDraft(JSON.parse(savedKey)), [savedKey]);
    const save = (next) => {
        setDraft(next);
        void setWarmupItems(appContext, next);
    };
    const move = (index, offset) => {
        const next = [...draft];
        const [item] = next.splice(index, 1);
        next.splice(index + offset, 0, item);
        save(next);
    };
    return (_jsxs(_Fragment, { children: [draft.length > 0 && (_jsx("ol", { className: "card-list warmup-editor", children: draft.map((item, index) => (_jsxs("li", { className: "card-list__item", children: [_jsx("input", { className: "text-input warmup-editor__text", value: item.text, onChange: (event) => setDraft(draft.map((other) => (other.id === item.id ? { ...other, text: event.target.value } : other))), onBlur: () => save(draft), "aria-label": `Item ${index + 1} do warm up` }), _jsxs("span", { className: "warmup__actions", children: [_jsx("button", { type: "button", className: "small", disabled: index === 0, onClick: () => move(index, -1), "aria-label": "Subir", children: "\u2191" }), _jsx("button", { type: "button", className: "small", disabled: index === draft.length - 1, onClick: () => move(index, 1), "aria-label": "Descer", children: "\u2193" }), _jsx("button", { type: "button", className: "small", onClick: () => save(draft.filter((other) => other.id !== item.id)), "aria-label": "Remover", children: "\u2715" })] })] }, item.id))) })), _jsxs("form", { className: "settings__row", onSubmit: (event) => {
                    event.preventDefault();
                    if (!newText.trim())
                        return;
                    save([...draft, { id: appContext.ids.next(), text: newText.trim() }]);
                    setNewText('');
                }, children: [_jsx("input", { className: "text-input warmup-editor__text", value: newText, placeholder: "Novo item, por exemplo: beber \u00E1gua", onChange: (event) => setNewText(event.target.value), "aria-label": "Novo item do warm up" }), _jsx("button", { type: "submit", children: "Adicionar" })] })] }));
}
