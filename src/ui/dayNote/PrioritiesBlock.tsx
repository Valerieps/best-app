import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { DayKey } from '../../domain/day';
import type { DayPriority } from '../../domain/priorities';
import { Icon } from '../components/Icon';
import { Linkified } from '../components/Linkified';
import { relativeDay } from '../format';
import { taskCommands } from '../tasks/taskCommands';
import { PriorityStar, shownChips, TaskActionButtons, TaskCheckbox, TaskDateChips } from '../tasks/TaskControls';
import { taskActions, taskText } from '../tasks/taskSurface';
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
  /** Ids in the "Fila de execução": their "Adicionar à fila" shows "Na fila". */
  queueIds: ReadonlySet<string>;
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
export function PrioritiesBlock({ priorities, today, pinned, onTogglePin, queueIds, trailing }: Props) {
  const [waiting, setWaiting] = useState<PendingMove[]>([]);
  const moves = useRef<PendingMoves | null>(null);
  moves.current ??= new PendingMoves((move) => taskCommands.movePriority(move.taskId, move.date), setWaiting);
  // Leaving the screen never loses a date I picked.
  useEffect(() => () => moves.current?.flush(), []);

  const pickDate = (taskId: string, current: DayKey | null, date: DayKey | null) => {
    if (date === current) return;
    // Today keeps the task here, so there is nothing to wait for.
    if (date === today) taskCommands.movePriority(taskId, date);
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
            // A deadline of today that made the task a priority shows as the icon instead of a chip.
            const dueToday = automatic && deadline === today;
            const chips = shownChips(task, { day: today });
            const onDate = (date: DayKey | null) => pickDate(task.id, task.intendedDate, date);
            return (
            <li key={task.id} className={`priorities__item ${moving ? 'priorities__item--moving' : ''}`}>
              {dueToday && (
                // Outside the block, at the left of the task, so it is seen before the text.
                <span className="priorities__due-today" role="img" title="Prazo máximo hoje" aria-label="Prazo máximo hoje">
                  <Icon name="alertCircle" size="sm" />
                </span>
              )}
              <TaskCheckbox task={task} />
              <span className="priorities__text">
                <Linkified text={taskText(task)} />
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
                    <TaskDateChips task={task} today={today} chips={chips} hideDeadline={dueToday} onDate={onDate} />
                  </span>
                  <span className="line__actions">
                    <TaskActionButtons
                      task={task}
                      today={today}
                      actions={taskActions(task, 'priorities')}
                      isQueued={queueIds.has(task.id)}
                      chips={chips}
                      onDate={onDate}
                    />
                  </span>
                  {!automatic && <PriorityStar on label="Tirar das prioridades" onToggle={() => taskCommands.setPriority(task.id, false)} />}
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
