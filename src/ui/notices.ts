import { useState } from 'react';
import type { DayKey } from '../domain/day';
import type { AutoBackupState } from '../infrastructure/autoBackup';

/**
 * The warnings at the top of the screen, of which only one shows at a time
 * (spec/navegacao.md). Reminders that came back are not in this queue: they always show.
 */
export type TopNotice = 'backupProblem' | 'pendingCheckout' | 'backupSetup' | 'reviewAvailable';

/**
 * Warnings that "Lembrar depois" hides until the next day. A backup problem is never snoozed; an
 * available review is snoozed until the next checkout (`useReviewSnooze`).
 */
export type SnoozableNotice = 'pendingCheckout' | 'backupSetup';

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
  /** Today's day note is open and a review is available, not snoozed. Absent means no. */
  reviewAvailable?: boolean;
}

/** The one warning to show, in order: backup problem, pending checkout, backup setup, available review. */
export function pickTopNotice({ backup, pendingCheckout, onDataScreen, snoozed, reviewAvailable = false }: NoticeInput): TopNotice | null {
  if (backup === 'problem') return 'backupProblem';
  if (pendingCheckout && !snoozed.has('pendingCheckout')) return 'pendingCheckout';
  if (backup === 'setup' && !onDataScreen && !snoozed.has('backupSetup')) return 'backupSetup';
  if (reviewAvailable) return 'reviewAvailable';
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

const REVIEW_SNOOZE_KEY = 'best-app:reviewSnoozedAt';

/**
 * When the available review was snoozed, and the "Lembrar depois" action. Like the other
 * snoozes, a convenience of this browser only; the notice comes back after the next checkout.
 */
export function useReviewSnooze(): [string | null, () => void] {
  const [snoozedAt, setSnoozedAt] = useState<string | null>(() => {
    try {
      return localStorage.getItem(REVIEW_SNOOZE_KEY);
    } catch {
      return null;
    }
  });
  const snooze = () => {
    const now = new Date().toISOString();
    try {
      localStorage.setItem(REVIEW_SNOOZE_KEY, now);
    } catch {
      // Nothing to do: the notice just comes back when the app is opened again.
    }
    setSnoozedAt(now);
  };
  return [snoozedAt, snooze];
}
