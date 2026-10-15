import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { DayKey } from '../../domain/day';
import type { DayPriority } from '../../domain/priorities';
import { Icon } from '../components/Icon';
import { Linkified } from '../components/Linkified';
import { relativeDay } from '../format';
import { DatePicker } from './BlockLine';
import { MOVE_COUNTDOWN_MS, PendingMoves, type PendingMove } from './pendingMoves';

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
  /** Moves the task to another intended date, out of today's priorities; called after the countdown. */
  onMoveDate(taskId: string, date: DayKey | null): void;
  onSetDeadline(taskId: string, date: DayKey | null): void;
  /** Shown at the right of the header, like the focus mode button. */
  trailing?: ReactNode;
}

/** Where a moving priority goes, for the countdown's text. */
function destination(date: DayKey | null, today: DayKey): string {
  return date ? `Vai para ${relativeDay(date, today)}` : 'Vai ficar sem data';
}

/**
 * "Prioridades do dia": up to 3 tasks, highlighted. Their dates change here too: a new intended
 * date waits a short countdown, which I can cancel, before the task goes to that day.
 */
export function PrioritiesBlock({ priorities, today, pinned, onTogglePin, onToggleDone, onDemote, onMoveDate, onSetDeadline, trailing }: Props) {
  const [waiting, setWaiting] = useState<PendingMove[]>([]);
  const commit = useRef(onMoveDate);
  commit.current = onMoveDate;
  const moves = useRef<PendingMoves | null>(null);
  moves.current ??= new PendingMoves((move) => commit.current(move.taskId, move.date), setWaiting);
  // Leaving the screen never loses a date I picked.
  useEffect(() => () => moves.current?.flush(), []);

  const pickDate = (taskId: string, current: DayKey | null, date: DayKey | null) => {
    if (date === current) return;
    // Today keeps the task here, so there is nothing to wait for.
    if (date === today) onMoveDate(taskId, date);
    else moves.current?.start({ taskId, date });
  };

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
            const moving = waiting.find((move) => move.taskId === task.id);
            const deadline = task.deadline ?? null;
            const showDate = task.intendedDate !== null && task.intendedDate !== today;
            const datePicker = (label: string, className: string, children: string, clearLabel?: string) => (
              <DatePicker
                label={label}
                className={className}
                value={task.intendedDate}
                min={today}
                onChange={(date) => pickDate(task.id, task.intendedDate, date)}
                clearLabel={clearLabel}
              >
                {children}
              </DatePicker>
            );
            const deadlinePicker = (label: string, className: string, children: string, clearLabel?: string) => (
              <DatePicker label={label} className={className} value={deadline} onChange={(date) => onSetDeadline(task.id, date)} clearLabel={clearLabel}>
                {children}
              </DatePicker>
            );
            return (
            <li key={task.id} className={`priorities__item ${moving ? 'priorities__item--moving' : ''}`}>
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
              {moving ? (
                <span className="priorities__moving" role="status">
                  <span>{destination(moving.date, today)}</span>
                  <span className="countdown" aria-hidden="true">
                    <span
                      key={`${moving.taskId}:${moving.date}`}
                      className="countdown__fill"
                      style={{ animationDuration: `${MOVE_COUNTDOWN_MS}ms` }}
                    />
                  </span>
                  <button type="button" className="tertiary" onClick={() => moves.current?.cancel(task.id)}>
                    Cancelar
                  </button>
                </span>
              ) : (
                <>
                  <span className="line__meta">
                    {showDate && datePicker('Mudar a data de intenção', 'line__chip', relativeDay(task.intendedDate!, today), 'Tirar a data de intenção')}
                    {!(automatic && deadline === today) &&
                      deadline &&
                      deadlinePicker('Mudar o prazo máximo', 'line__chip', `prazo ${relativeDay(deadline, today)}`, 'Tirar o prazo máximo')}
                  </span>
                  <span className="line__actions">
                    {!showDate && datePicker('Mudar a data de intenção', 'line__action', 'Data')}
                    {!deadline && deadlinePicker('Prazo máximo', 'line__action', 'Prazo')}
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
                </>
              )}
            </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
