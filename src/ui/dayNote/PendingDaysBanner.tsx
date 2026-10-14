import { useState } from 'react';
import { addDays, type DayKey } from '../../domain/day';
import { pendingDaysSentence } from '../format';
import { navigate } from '../hooks';
import { ClosePendingDaysDialog } from './ClosePendingDaysDialog';

interface Props {
  days: DayKey[];
  today: DayKey;
  /** "Lembrar depois": hides the band until tomorrow; "Rituais" keeps counting the days. */
  onSnooze(): void;
}

/**
 * Warns about past days not closed yet. The day note opens normally: it never blocks. Only
 * yesterday pending is not late, so it shows without the warning sign (spec/checkout.md).
 */
export function PendingDaysBanner({ days, today, onSnooze }: Props) {
  const [closing, setClosing] = useState(false);
  if (days.length === 0) return null;
  return (
    <>
      <div className="banner" role="status">
        <span>
          {(days.length > 1 || days[0] < addDays(today, -1)) && <span aria-hidden="true">⚠ </span>}
          {pendingDaysSentence(days, today)}
        </span>
        <span className="banner__actions">
          <button type="button" className="link" onClick={() => navigate({ name: 'checkout', day: days[0] })}>
            Fechar o dia
          </button>
          {days.length > 1 && (
            <button type="button" className="link" onClick={() => setClosing(true)}>
              Fechar dias pendentes
            </button>
          )}
          <button type="button" className="link" onClick={onSnooze}>
            Lembrar depois
          </button>
        </span>
      </div>
      {closing && <ClosePendingDaysDialog today={today} onClose={() => setClosing(false)} />}
    </>
  );
}
