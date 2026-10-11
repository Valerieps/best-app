import { useState } from 'react';
import type { DayKey } from '../../domain/day';
import type { DayPriority } from '../../domain/priorities';
import { Linkified } from '../components/Linkified';

const PIN_KEY = 'best-app:pinPriorities';

function readPinned(): boolean {
  try {
    return localStorage.getItem(PIN_KEY) === '1';
  } catch {
    return false;
  }
}

/** Whether the priorities block stays visible on scroll. A convenience of this browser only. */
export function usePinnedPriorities(): [boolean, (pinned: boolean) => void] {
  const [pinned, setPinned] = useState(readPinned);
  const update = (next: boolean) => {
    try {
      localStorage.setItem(PIN_KEY, next ? '1' : '0');
    } catch {
      // Nothing to do: the choice just won't be remembered.
    }
    setPinned(next);
  };
  return [pinned, update];
}

interface Props {
  priorities: DayPriority[];
  today: DayKey;
  /** Pinned from the "⋯" of the day note's header. */
  pinned: boolean;
  onToggleDone(taskId: string, done: boolean): void;
  onDemote(taskId: string): void;
}

/** "Prioridades do dia": up to 3 tasks, highlighted. */
export function PrioritiesBlock({ priorities, today, pinned, onToggleDone, onDemote }: Props) {
  return (
    <section className={`priorities ${pinned ? 'priorities--pinned' : ''}`} aria-label="Prioridades do dia">
      <h2 className="priorities__title">Prioridades do dia</h2>
      {priorities.length === 0 ? (
        <p className="muted priorities__empty">Nenhuma prioridade agora. Promova uma tarefa com ★.</p>
      ) : (
        <ol className="priorities__list">
          {priorities.map(({ task, automatic }) => (
            <li key={task.id} className="priorities__item">
              <input
                type="checkbox"
                checked={task.status === 'done'}
                onChange={(event) => onToggleDone(task.id, event.target.checked)}
                aria-label={`Finalizar "${task.text}"`}
              />
              <span className="priorities__text">
                <Linkified text={task.text || '(tarefa sem texto)'} />
              </span>
              {automatic && task.deadline === today && <span className="chip chip--whiteboard">prazo máximo hoje</span>}
              {!automatic && (
                <button type="button" className="line__action" onClick={() => onDemote(task.id)} aria-label="Tirar das prioridades">
                  ✕
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
