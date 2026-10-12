import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { pendingDaysSentence } from '../format';
import { navigate } from '../hooks';
import { ClosePendingDaysDialog } from './ClosePendingDaysDialog';
/** Warns about past days without checkout. The day note opens normally: it never blocks. */
export function PendingDaysBanner({ days, today, onSnooze }) {
    const [closing, setClosing] = useState(false);
    if (days.length === 0)
        return null;
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "banner", role: "status", children: [_jsxs("span", { children: [_jsx("span", { "aria-hidden": "true", children: "\u26A0 " }), pendingDaysSentence(days, today)] }), _jsxs("span", { className: "banner__actions", children: [_jsx("button", { type: "button", className: "link", onClick: () => navigate({ name: 'checkout', day: days[0] }), children: "Fazer checkout" }), days.length > 1 && (_jsx("button", { type: "button", className: "link", onClick: () => setClosing(true), children: "Fechar dias pendentes" })), _jsx("button", { type: "button", className: "link", onClick: onSnooze, children: "Lembrar depois" })] })] }), closing && _jsx(ClosePendingDaysDialog, { today: today, onClose: () => setClosing(false) })] }));
}
