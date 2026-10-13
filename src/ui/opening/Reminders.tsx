import { useEffect, useState } from 'react';
import { answerReminder, snoozeReminder } from '../../application/dayOpening';
import { loadDueReminders } from '../../application/queries';
import { askAgainAt } from '../../domain/dayFlow';
import type { Reminder } from '../../domain/entities';
import { appContext, reader } from '../services';
import { useLiveQueryState } from '../useLiveQuery';

/** Due reminders, re-checked every minute since they come due at a set time. */
export function useDueReminders(): Reminder[] {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 60_000);
    return () => clearInterval(timer);
  }, []);
  return useLiveQueryState(() => loadDueReminders(reader, new Date()), [tick]).value ?? [];
}

function laterTime(): string {
  const later = new Date(Date.now() + 60 * 60 * 1000);
  return `${String(later.getHours()).padStart(2, '0')}:${String(later.getMinutes()).padStart(2, '0')}`;
}

function ReminderRow({ reminder }: { reminder: Reminder }) {
  const [snoozing, setSnoozing] = useState(false);
  const [time, setTime] = useState(laterTime);
  return (
    <li className="reminders__item">
      <span>{reminder.text}</span>
      <span className="reminders__actions">
        {snoozing ? (
          <>
            <input type="time" className="date-input" value={time} onChange={(event) => setTime(event.target.value)} aria-label="Voltar às" />
            <button type="button" className="link" onClick={() => void snoozeReminder(appContext, reminder.id, askAgainAt(new Date(), time))}>
              Ok
            </button>
          </>
        ) : (
          <>
            <button type="button" className="link" onClick={() => void answerReminder(appContext, reminder.id, 'done')}>
              Feito
            </button>
            <button type="button" className="link" onClick={() => setSnoozing(true)}>
              Mais tarde
            </button>
            <button type="button" className="link" onClick={() => void answerReminder(appContext, reminder.id, 'dropped')}>
              Largar
            </button>
          </>
        )}
      </span>
    </li>
  );
}

/** "Uma faixa discreta no topo da nota do dia mostra o que voltou." It never covers the text. */
export function RemindersBanner({ reminders }: { reminders: Reminder[] }) {
  if (reminders.length === 0) return null;
  return (
    <div className="banner reminders" role="status" aria-label="Lembretes que voltaram">
      <span className="reminders__title">Voltou:</span>
      <ul className="reminders__list">
        {reminders.map((reminder) => (
          <ReminderRow key={reminder.id} reminder={reminder} />
        ))}
      </ul>
    </div>
  );
}

const ICON_LINK_SELECTOR = 'link[rel="icon"]';

/** Builds the app icon with a dot, as a data URL (allowed by the CSP's img-src). */
function iconWithDot(): string {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#2f5d50"/>' +
    '<path d="M18 33l9 9 19-20" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="52" cy="12" r="11" fill="#e0607e" stroke="#fff" stroke-width="3"/></svg>';
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Passive signals for reminders that came back: a counter in the tab title, a dot on the icon,
 * and the badge of the installed app. No sound, no pop-up, no notification.
 */
export function useReminderSignals(count: number): void {
  useEffect(() => {
    const baseTitle = 'Best App';
    document.title = count > 0 ? `(${count}) ${baseTitle}` : baseTitle;
    const link = document.querySelector<HTMLLinkElement>(ICON_LINK_SELECTOR);
    if (link) {
      if (!link.dataset.original) link.dataset.original = link.href;
      link.href = count > 0 ? iconWithDot() : link.dataset.original;
    }
    const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (count > 0) nav.setAppBadge?.(count).catch(() => {});
    else nav.clearAppBadge?.().catch(() => {});
  }, [count]);
}
