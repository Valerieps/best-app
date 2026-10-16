import { useState } from 'react';
import { loadDaysWithNotes } from '../../application/queries';
import type { DayKey } from '../../domain/day';
import { monthKey, monthRange, shiftMonth } from '../../domain/month';
import { calendarDayState, monthWeeks } from '../../domain/ritualsCalendar';
import { fromDayKey } from '../../domain/day';
import { formatShortDate, weekdayName } from '../format';
import { navigate } from '../hooks';
import { reader } from '../services';
import { useLiveQueryState } from '../useLiveQuery';

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/** "outubro de 2026" */
function monthTitle(day: DayKey): string {
  return fromDayKey(day).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

/**
 * The small month calendar of the "Rituais" screen (spec/assistentes.md, "A tela Rituais"). Days
 * without a closing are highlighted, all in one color; clicking one, or today, opens its closing.
 */
export function RitualsCalendar({ today, pendingDays }: { today: DayKey; pendingDays: DayKey[] }) {
  const currentMonth = monthKey(today);
  const [month, setMonth] = useState(currentMonth);
  // Only marks closed days: if it fails, the calendar still shows the pending ones.
  const daysWithNotes = useLiveQueryState(() => loadDaysWithNotes(reader, month), [month]).value ?? [];
  const pending = new Set(pendingDays);
  const written = new Set(daysWithNotes);

  return (
    <div className="rituals-calendar">
      <div className="rituals-calendar__nav">
        <button
          type="button"
          className="tertiary rituals-calendar__arrow"
          aria-label="Mês anterior"
          onClick={() => setMonth(shiftMonth(month, -1))}
        >
          ‹
        </button>
        <span className="rituals-calendar__month">{monthTitle(monthRange(month).start)}</span>
        <button
          type="button"
          className="tertiary rituals-calendar__arrow"
          aria-label="Próximo mês"
          disabled={month >= currentMonth}
          onClick={() => setMonth(shiftMonth(month, 1))}
        >
          ›
        </button>
      </div>
      <div className="rituals-calendar__grid" role="grid" aria-label={monthTitle(monthRange(month).start)}>
        {WEEKDAYS.map((weekday) => (
          <span key={weekday} className="rituals-calendar__weekday" aria-hidden="true">
            {weekday}
          </span>
        ))}
        {monthWeeks(month)
          .flat()
          .map((day, index) => {
            if (!day) return <span key={`blank-${index}`} />;
            const state = calendarDayState(day, today, pending, written);
            const date = Number(day.slice(8));
            const name = `${weekdayName(day)}, ${formatShortDate(day)}`;
            if (state === 'pending' || state === 'today') {
              const label = state === 'today' ? 'Fechar o dia de hoje' : `Fechar ${name}, sem fechamento`;
              return (
                <button
                  key={day}
                  type="button"
                  className={`rituals-calendar__day rituals-calendar__day--${state}`}
                  title={label}
                  aria-label={label}
                  onClick={() => navigate({ name: 'checkout', day, from: 'rituals' })}
                >
                  {date}
                </button>
              );
            }
            const label = state === 'closed' ? `${name}, fechado` : name;
            return (
              <span key={day} className={`rituals-calendar__day rituals-calendar__day--${state}`} title={label}>
                {date}
              </span>
            );
          })}
      </div>
      <div className="rituals-calendar__legend">
        <span>
          <span className="rituals-calendar__swatch rituals-calendar__swatch--pending" /> sem fechamento
        </span>
        <span>
          <span className="rituals-calendar__swatch rituals-calendar__swatch--today" /> hoje
        </span>
        <span>
          <span className="rituals-calendar__dot" /> fechado
        </span>
      </div>
    </div>
  );
}
