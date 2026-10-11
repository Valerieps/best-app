import { useState } from 'react';
import type { DayKey } from '../../domain/day';
import { pendingDaysSentence } from '../format';
import { navigate } from '../hooks';
import { ClosePendingDaysDialog } from './ClosePendingDaysDialog';

/** Warns about past days without checkout. The day note opens normally: it never blocks. */
export function PendingDaysBanner({ days, today }: { days: DayKey[]; today: DayKey }) {
  const [closing, setClosing] = useState(false);
  if (days.length === 0) return null;
  return (
    <>
      <div className="banner" role="status">
        <span>
          <span aria-hidden="true">⚠ </span>
          {pendingDaysSentence(days, today)}
        </span>
        <span className="banner__actions">
          <button type="button" className="link" onClick={() => navigate({ name: 'checkout', day: days[0] })}>
            Fazer checkout
          </button>
          {days.length > 1 && (
            <button type="button" className="link" onClick={() => setClosing(true)}>
              Fechar dias pendentes
            </button>
          )}
        </span>
      </div>
      {closing && <ClosePendingDaysDialog today={today} onClose={() => setClosing(false)} />}
    </>
  );
}
