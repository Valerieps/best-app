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

function savePinned(pinned: boolean): void {
  try {
    localStorage.setItem(PIN_KEY, pinned ? '1' : '0');
  } catch {
    // Only a convenience of this browser; nothing to do.
  }
}

interface Props {
  priorities: DayPriority[];
  today: DayKey;
  onToggleDone(taskId: string, done: boolean): void;
  onDemote(taskId: string): void;
}

/** "Prioridades do dia": up to 3 tasks, highlighted. Can be pinned to stay visible on scroll. */
export function PrioritiesBlock({ priorities, today, onToggleDone, onDemote }: Props) {
  const [pinned, setPinned] = useState(readPinned);
  return (
    <section className={`priorities ${pinned ? 'priorities--pinned' : ''}`} aria-label="Prioridades do dia">
      <header className="priorities__header">
        <h2 className="priorities__title">Prioridades do dia</h2>
        <button
          type="button"
          className="link"
          aria-pressed={pinned}
          onClick={() => {
            savePinned(!pinned);
            setPinned(!pinned);
          }}
        >
          {pinned ? 'Desafixar' : 'Fixar no topo'}
        </button>
      </header>
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
