import { useState } from 'react';
import { answerWarmupItem, registerThoughts, startDay, startExecution } from '../../application/dayOpening';
import { loadHabits, type DayOpeningView } from '../../application/queries';
import { HabitToggle } from '../habits/HabitsScreen';
import { reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';
import { askAgainAt } from '../../domain/dayFlow';
import type { DayKey } from '../../domain/day';
import type { WarmupItem } from '../../domain/entities';
import { formatLongDate, pendingDaysSentence } from '../format';
import { navigate } from '../hooks';
import { appContext } from '../services';

/** A simple line drawing of a sun, in the theme's colors. */
function Sun() {
  const rays = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <svg className="opening__sun" width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="20" />
      {rays.map((angle) => (
        <line key={angle} x1="60" y1="16" x2="60" y2="28" transform={`rotate(${angle} 60 60)`} />
      ))}
    </svg>
  );
}

/** "Uma tela branca" with a sun and the "Iniciar Dia" button, and nothing else (SPEC.md, "Navegação"). */
export function StartDayScreen() {
  return (
    <main className="opening">
      <Sun />
      <button type="button" className="primary opening__start" onClick={() => void startDay(appContext)}>
        Iniciar Dia
      </button>
    </main>
  );
}

/** A time about two hours ahead, rounded to the half hour, as the default "perguntar de novo às". */
function defaultLaterTime(): string {
  const later = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const minutes = later.getMinutes() < 30 ? '00' : '30';
  return `${String(later.getHours()).padStart(2, '0')}:${minutes}`;
}

function WarmupRow({ item, answered }: { item: WarmupItem; answered: string | undefined }) {
  const [time, setTime] = useState(defaultLaterTime);
  const [askingLater, setAskingLater] = useState(false);
  const labels: Record<string, string> = { done: 'feito', skipped: 'pulado hoje', later: 'volta mais tarde' };

  return (
    <li className="card-list__item">
      <span className={answered ? 'muted' : ''}>{item.text}</span>
      {answered ? (
        <span className="muted">{labels[answered]}</span>
      ) : askingLater ? (
        <span className="warmup__actions">
          <input type="time" className="date-input" value={time} onChange={(event) => setTime(event.target.value)} aria-label="Horário" />
          <button type="button" className="small" onClick={() => void answerWarmupItem(appContext, item, 'later', askAgainAt(new Date(), time))}>
            Ok
          </button>
          <button type="button" className="link" onClick={() => setAskingLater(false)}>
            Cancelar
          </button>
        </span>
      ) : (
        <span className="warmup__actions">
          <button type="button" className="small primary" onClick={() => void answerWarmupItem(appContext, item, 'done')}>
            Feito
          </button>
          <button type="button" className="small" onClick={() => void answerWarmupItem(appContext, item, 'skipped')}>
            Pular hoje
          </button>
          <button type="button" className="small" onClick={() => setAskingLater(true)}>
            Perguntar de novo às…
          </button>
        </span>
      )}
    </li>
  );
}

/** The warm-up checklist. When every item has an answer, the app goes on to the dashboard. */
export function WarmupScreen({ view }: { view: DayOpeningView }) {
  const answers = view.record?.warmup ?? {};
  return (
    <main className="page">
      <h1 className="page__title">Warm up</h1>
      <ul className="card-list">
        {view.warmupItems.map((item) => (
          <WarmupRow key={item.id} item={item} answered={answers[item.id]} />
        ))}
      </ul>
    </main>
  );
}

function greeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** The welcome screen after the warm up (section 3). */
export function DashboardScreen({ view, today }: { view: DayOpeningView; today: DayKey }) {
  const [thoughts, setThoughts] = useState('');
  const [writing, setWriting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loggingHabits, setLoggingHabits] = useState(false);
  const habits = (useLiveQuery(() => loadHabits(reader, today), [today]) ?? []).filter(
    (habit) => habit.habit.status === 'active' && habit.expectedToday,
  );

  return (
    <main className="page dashboard">
      <h1 className="page__title">
        {greeting(new Date().getHours())}. {formatLongDate(today)}.
      </h1>
      <button type="button" className="primary dashboard__start" onClick={() => void startExecution(appContext)}>
        Iniciar o Flow de Execução
      </button>

      <div className="dashboard__actions">
        {!writing && (
          <button type="button" onClick={() => setWriting(true)}>
            Registrar pensamentos
          </button>
        )}
        {habits.length > 0 && !loggingHabits && (
          <button type="button" onClick={() => setLoggingHabits(true)}>
            Registrar hábitos
          </button>
        )}
        {view.pendingDays.length > 0 && (
          <button type="button" onClick={() => navigate({ name: 'checkout', day: view.pendingDays[0] })}>
            Fazer checkout pendente
          </button>
        )}
      </div>
      {loggingHabits && (
        <ul className="card-list dashboard__thoughts">
          {habits.map((habit) => (
            <li className="card-list__item" key={habit.habit.id}>
              <span>{habit.habit.name}</span>
              <HabitToggle view={habit} today={today} />
            </li>
          ))}
        </ul>
      )}
      {view.pendingDays.length > 0 && <p className="muted">{pendingDaysSentence(view.pendingDays, today)}. O dia pode começar mesmo assim.</p>}

      {writing && (
        <div className="panel dashboard__thoughts">
          <label className="field">
            <span className="field__label">Pensamentos (entram numa seção geral da nota do dia)</span>
            <textarea className="text-area" rows={4} value={thoughts} onChange={(event) => setThoughts(event.target.value)} autoFocus />
          </label>
          <div className="assistant__actions">
            <button
              type="button"
              className="primary"
              disabled={!thoughts.trim()}
              onClick={async () => {
                await registerThoughts(appContext, thoughts);
                setThoughts('');
                setWriting(false);
                setSaved(true);
              }}
            >
              Salvar
            </button>
          </div>
        </div>
      )}
      {saved && <p className="muted">Pensamentos salvos na nota do dia.</p>}
    </main>
  );
}
