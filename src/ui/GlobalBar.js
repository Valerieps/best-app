import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { loadCleanup, loadDueMonthlyReflection, loadDueReflection } from '../application/queries';
import { BackupIndicator } from './backup/BackupIndicator';
import { Dropdown, DropdownItem } from './components/Dropdown';
import { weekdayName, formatShortDate } from './format';
import { navigate } from './hooks';
import { reader } from './services';
import { useLiveQuery } from './useLiveQuery';
function Badge({ count }) {
    return count > 0 ? _jsx("span", { className: "badge", children: count }) : null;
}
/**
 * Level 1 of the navigation (SPEC.md, "Navegação"): the same bar on every screen.
 * ☰ for places, "Hoje", "Rituais" with what is due, and the backup status.
 */
export function GlobalBar({ today, pendingDays, onToday, onOpenMenu, backupState, backup }) {
    const dueWeek = useLiveQuery(() => loadDueReflection(reader, new Date()), [today]) ?? null;
    const dueMonth = useLiveQuery(() => loadDueMonthlyReflection(reader, today), [today]) ?? null;
    const cleanup = useLiveQuery(() => loadCleanup(reader));
    const cleanupCount = cleanup ? cleanup.whiteboards.length + cleanup.duplicates.length : 0;
    const dueCount = pendingDays.length + (dueWeek ? 1 : 0) + (dueMonth ? 1 : 0);
    return (_jsxs("header", { className: "global-bar", children: [_jsx("button", { type: "button", className: "icon-button", onClick: onOpenMenu, "aria-label": "Abrir menu", children: "\u2630" }), _jsx("span", { className: "global-bar__name", children: "Best App" }), _jsx("span", { className: "global-bar__spacer" }), _jsx("button", { type: "button", className: "tertiary", "aria-current": onToday ? 'page' : undefined, onClick: () => navigate({ name: 'day' }), children: "Hoje" }), _jsx(Dropdown, { label: "Rituais", className: "global-bar__rituals", triggerClassName: "tertiary", trigger: _jsxs(_Fragment, { children: ["Rituais ", _jsx(Badge, { count: dueCount })] }), children: (close) => {
                    const go = (action) => () => {
                        close();
                        action();
                    };
                    return (_jsxs(_Fragment, { children: [_jsx(DropdownItem, { onSelect: go(() => navigate({ name: 'checkout', day: today })), children: "Checkout de hoje" }), pendingDays.map((day) => (_jsxs(DropdownItem, { onSelect: go(() => navigate({ name: 'checkout', day })), badge: _jsx("span", { className: "badge badge--warning", children: "pendente" }), children: ["Checkout de ", weekdayName(day), ", ", formatShortDate(day)] }, day))), _jsx("hr", { className: "dropdown__divider" }), _jsx(DropdownItem, { onSelect: go(() => navigate({ name: 'reflection', week: dueWeek?.key })), badge: dueWeek ? _jsx("span", { className: "badge", children: "dispon\u00EDvel" }) : undefined, children: "Reflex\u00E3o semanal" }), _jsx(DropdownItem, { onSelect: go(() => navigate({ name: 'monthReflection', month: dueMonth?.key })), badge: dueMonth ? _jsx("span", { className: "badge", children: "dispon\u00EDvel" }) : undefined, children: "Reflex\u00E3o mensal" }), _jsx(DropdownItem, { onSelect: go(() => navigate({ name: 'cleanup' })), badge: _jsx(Badge, { count: cleanupCount }), children: "Colocar ordem na casa" })] }));
                } }), _jsx(BackupIndicator, { state: backupState, actions: backup })] }));
}
