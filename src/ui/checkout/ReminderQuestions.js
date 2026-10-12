import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Segmented } from '../components/Segmented';
/**
 * Section 3: a reminder ignored during the day becomes a question at the checkout: manter,
 * mudar ou largar. "Manter" is the default, since dropping takes it out of circulation.
 */
export function ReminderQuestions({ reminders, choices, onChange }) {
    if (reminders.length === 0)
        return null;
    return (_jsxs(_Fragment, { children: [_jsx("h2", { className: "card__subtitle", children: "Lembretes que ficaram sem resposta" }), _jsx("div", { className: "triage-group", children: reminders.map((reminder) => {
                    const choice = choices.get(reminder.id) ?? { kind: 'keep' };
                    return (_jsxs("div", { className: "triage-row", children: [_jsx("span", { className: "triage-row__label", children: reminder.text }), _jsxs("span", { className: "triage-row__controls", children: [_jsx(Segmented, { label: `O que fazer com "${reminder.text}"`, value: choice.kind, options: [
                                            { value: 'keep', label: 'Manter' },
                                            { value: 'change', label: 'Mudar' },
                                            { value: 'drop', label: 'Largar' },
                                        ], onChange: (kind) => onChange(reminder.id, kind === 'change' ? { kind, time: '09:00' } : { kind }) }), choice.kind === 'change' && (_jsx("input", { type: "time", className: "date-input", value: choice.time, onChange: (event) => onChange(reminder.id, { kind: 'change', time: event.target.value }), "aria-label": "Novo hor\u00E1rio" }))] })] }, reminder.id));
                }) })] }));
}
