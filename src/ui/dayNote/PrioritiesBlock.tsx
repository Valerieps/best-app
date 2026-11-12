import { useState, type ReactNode } from 'react';
import type { DayKey } from '../../domain/day';
import type { DayPriority } from '../../domain/priorities';
import { Icon } from '../components/Icon';
import { Linkified } from '../components/Linkified';
import { relativeDay } from '../format';
import { DatePicker } from './BlockLine';

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
  /** Pinned to the top by the pin in the block's own header. */
  pinned: boolean;
  /** Pins or unpins the block; absent where pinning means nothing (another day, focus mode). */
  onTogglePin?(): void;
  onToggleDone(taskId: string, done: boolean): void;
  onDemote(taskId: string): void;
  onSetDeadline(taskId: string, date: DayKey | null): void;
  /** Ids in the "Fila de execução", and "Adicionar à fila"; absent hides the action. */
  queue?: { ids: ReadonlySet<string>; onAdd(taskId: string): void };
  /** Shown at the right of the header, like the focus mode button. */
  trailing?: ReactNode;
}

/**
 * "Prioridades do dia": up to 3 tasks, highlighted. The deadline changes here too; a task of mine
 * has no intended date any more (ADR-072).
 */
export function PrioritiesBlock({ priorities, today, pinned, onTogglePin, onToggleDone, onDemote, onSetDeadline, queue, trailing }: Props) {
  return (
    <section className={`priorities ${pinned ? 'priorities--pinned' : ''}`} aria-label="Prioridades do dia">
      <div className="priorities__header">
        <h2 className="priorities__title">Prioridades do dia</h2>
        {onTogglePin && (
          <button
            type="button"
            className="icon-button priorities__pin"
            title={pinned ? 'Desafixar as prioridades' : 'Fixar as prioridades no topo'}
            aria-label={pinned ? 'Desafixar as prioridades' : 'Fixar as prioridades no topo'}
            aria-pressed={pinned}
            onClick={onTogglePin}
          >
            <Icon name="pin" size="sm" filled={pinned} />
          </button>
        )}
        {trailing}
      </div>
      {priorities.length === 0 ? (
        <p className="muted priorities__empty">Nenhuma prioridade agora. Promova uma tarefa com ★.</p>
      ) : (
        <ol className="priorities__list">
          {priorities.map(({ task, automatic }) => {
            const deadline = task.deadline ?? null;
            const deadlinePicker = (label: string, className: string, children: string, clearLabel?: string) => (
              <DatePicker label={label} className={className} value={deadline} onChange={(date) => onSetDeadline(task.id, date)} clearLabel={clearLabel}>
                {children}
              </DatePicker>
            );
            return (
            <li key={task.id} className="priorities__item">
              {automatic && deadline === today && (
                // Outside the block, at the left of the task, so it is seen before the text.
                <span className="priorities__due-today" role="img" title="Prazo máximo hoje" aria-label="Prazo máximo hoje">
                  <Icon name="alertCircle" size="sm" />
                </span>
              )}
              <input
                type="checkbox"
                checked={task.status === 'done'}
                onChange={(event) => onToggleDone(task.id, event.target.checked)}
                aria-label={`Finalizar "${task.text}"`}
              />
              <span className="priorities__text">
                <Linkified text={task.text || '(tarefa sem texto)'} />
              </span>
              <span className="line__meta">
                {!(automatic && deadline === today) &&
                  deadline &&
                  deadlinePicker('Mudar o prazo máximo', 'line__chip', `prazo ${relativeDay(deadline, today)}`, 'Tirar o prazo máximo')}
              </span>
              <span className="line__actions">
                {!deadline && deadlinePicker('Prazo máximo', 'line__action', 'Prazo')}
                {queue && !task.waiting && (
                  <button
                    type="button"
                    className="line__action"
                    disabled={queue.ids.has(task.id)}
                    title={queue.ids.has(task.id) ? 'Já está na fila de execução' : 'Adicionar ao fim da fila de execução'}
                    onClick={() => queue.onAdd(task.id)}
                  >
                    {queue.ids.has(task.id) ? 'Na fila' : 'Adicionar à fila'}
                  </button>
                )}
              </span>
              {!automatic && (
                <button
                  type="button"
                  className="line__star line__star--on"
                  onClick={() => onDemote(task.id)}
                  title="Tirar das prioridades"
                  aria-label="Tirar das prioridades"
                  aria-pressed={true}
                >
                  ★
                </button>
              )}
            </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
