import { useState } from 'react';
import type { DayKey } from '../domain/day';
import type { AutoBackupState } from '../infrastructure/autoBackup';

/**
 * The warnings at the top of the screen, of which only one shows at a time (SPEC.md,
 * "Navegação"). Reminders that came back are not in this queue: they always show.
 */
export type TopNotice = 'backupProblem' | 'pendingCheckout' | 'backupSetup';

/** Warnings that "Lembrar depois" hides until the next day. A backup problem is never snoozed. */
export type SnoozableNotice = Exclude<TopNotice, 'backupProblem'>;

/**
 * Whether the automatic backup needs a warning: a problem (blocked, error) always does; the
 * setup (no file yet, paused, unsupported browser) only until the first backup is made.
 */
export function backupNoticeLevel(
  state: AutoBackupState,
  hasData: boolean,
  everBackedUp: boolean,
): 'problem' | 'setup' | null {
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

interface NoticeInput {
  backup: 'problem' | 'setup' | null;
  /** Today's day note is open and past days are waiting for checkout. */
  pendingCheckout: boolean;
  /** "Dados e backup" already shows how to set the backup up. */
  onDataScreen: boolean;
  snoozed: ReadonlySet<SnoozableNotice>;
}

/** The one warning to show, in order: backup problem, pending checkout, backup setup. */
export function pickTopNotice({ backup, pendingCheckout, onDataScreen, snoozed }: NoticeInput): TopNotice | null {
  if (backup === 'problem') return 'backupProblem';
  if (pendingCheckout && !snoozed.has('pendingCheckout')) return 'pendingCheckout';
  if (backup === 'setup' && !onDataScreen && !snoozed.has('backupSetup')) return 'backupSetup';
  return null;
}

const SNOOZE_KEY = 'best-app:snoozedNotices';

/** Day each warning was snoozed on. A convenience of this browser only, like the pinned priorities. */
type SnoozeDays = Partial<Record<SnoozableNotice, DayKey>>;

function readSnoozeDays(): SnoozeDays {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SNOOZE_KEY) ?? '{}');
    return parsed && typeof parsed === 'object' ? (parsed as SnoozeDays) : {};
  } catch {
    return {};
  }
}

/** Warnings snoozed today; they come back the next day. */
export function snoozedOn(days: SnoozeDays, today: DayKey): Set<SnoozableNotice> {
  return new Set((Object.keys(days) as SnoozableNotice[]).filter((notice) => days[notice] === today));
}

/** The warnings snoozed for today, and the "Lembrar depois" action. */
export function useSnoozedNotices(today: DayKey): [Set<SnoozableNotice>, (notice: SnoozableNotice) => void] {
  const [days, setDays] = useState(readSnoozeDays);
  const snooze = (notice: SnoozableNotice) => {
    const next = { ...days, [notice]: today };
    try {
      localStorage.setItem(SNOOZE_KEY, JSON.stringify(next));
    } catch {
      // Nothing to do: the warning just comes back when the app is opened again.
    }
    setDays(next);
  };
  return [snoozedOn(days, today), snooze];
}
