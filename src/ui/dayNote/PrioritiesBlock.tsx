import { useState, type ReactNode } from 'react';
import type { DayKey } from '../../domain/day';
import type { DayPriority } from '../../domain/priorities';
import { Icon } from '../components/Icon';
import { TaskText } from '../taskDetails/TaskText';
import { taskCommands } from '../tasks/taskCommands';
import { PriorityStar, shownChips, TaskActionButtons, TaskCheckbox, TaskDateChips } from '../tasks/TaskControls';
import { taskActions } from '../tasks/taskSurface';

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

/**
 * "Prioridades do dia": up to 3 tasks, highlighted. The deadline changes here too; a task of mine
 * has no intended date any more (ADR-072).
 */
export function PrioritiesBlock({ priorities, today, pinned, onTogglePin, queueIds, trailing }: Props) {
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
            // A deadline of today that made the task a priority shows as the icon instead of a chip.
            const dueToday = automatic && deadline === today;
            const chips = shownChips(task, today);
            return (
            <li key={task.id} className="priorities__item">
              {dueToday && (
                // Outside the block, at the left of the task, so it is seen before the text.
                <span className="priorities__due-today" role="img" title="Prazo máximo hoje" aria-label="Prazo máximo hoje">
                  <Icon name="alertCircle" size="sm" />
                </span>
              )}
              <TaskCheckbox task={task} />
              <span className="priorities__text">
                <TaskText taskId={task.id} text={task.text} />
              </span>
              <span className="line__meta">
                <TaskDateChips task={task} today={today} chips={chips} hideDeadline={dueToday} />
              </span>
              <span className="line__actions">
                <TaskActionButtons task={task} today={today} actions={taskActions(task, 'priorities')} isQueued={queueIds.has(task.id)} chips={chips} />
              </span>
              {!automatic && <PriorityStar on label="Tirar das prioridades" onToggle={() => taskCommands.setPriority(task.id, false)} />}
            </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
