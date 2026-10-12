import { useState } from 'react';
/**
 * Whether the automatic backup needs a warning: a problem (blocked, error) always does; the
 * setup (no file yet, paused, unsupported browser) only until the first backup is made.
 */
export function backupNoticeLevel(state, hasData, everBackedUp) {
    switch (state.status) {
        case 'blocked':
        case 'error':
            return 'problem';
        case 'noFile':
        case 'unsupported':
            return hasData && !everBackedUp ? 'setup' : null;
        case 'needsPermission':
            return everBackedUp ? null : 'setup';
        default:
            return null;
    }
}
/** The one warning to show, in order: backup problem, pending checkout, backup setup. */
export function pickTopNotice({ backup, pendingCheckout, onDataScreen, snoozed }) {
    if (backup === 'problem')
        return 'backupProblem';
    if (pendingCheckout && !snoozed.has('pendingCheckout'))
        return 'pendingCheckout';
    if (backup === 'setup' && !onDataScreen && !snoozed.has('backupSetup'))
        return 'backupSetup';
    return null;
}
const SNOOZE_KEY = 'best-app:snoozedNotices';
function readSnoozeDays() {
    try {
        const parsed = JSON.parse(localStorage.getItem(SNOOZE_KEY) ?? '{}');
        return parsed && typeof parsed === 'object' ? parsed : {};
    }
    catch {
        return {};
    }
}
/** Warnings snoozed today; they come back the next day. */
export function snoozedOn(days, today) {
    return new Set(Object.keys(days).filter((notice) => days[notice] === today));
}
/** The warnings snoozed for today, and the "Lembrar depois" action. */
export function useSnoozedNotices(today) {
    const [days, setDays] = useState(readSnoozeDays);
    const snooze = (notice) => {
        const next = { ...days, [notice]: today };
        try {
            localStorage.setItem(SNOOZE_KEY, JSON.stringify(next));
        }
        catch {
            // Nothing to do: the warning just comes back when the app is opened again.
        }
        setDays(next);
    };
    return [snoozedOn(days, today), snooze];
}
