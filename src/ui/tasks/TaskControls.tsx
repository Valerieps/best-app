import { Fragment, type ReactNode } from 'react';
import type { DayKey } from '../../domain/day';
import type { Project } from '../../domain/entities';
import { AbandonAction } from '../components/AbandonAction';
import { DatePicker } from '../components/DatePicker';
import { PRIORITY_SHORTCUT } from '../dayNote/priorityShortcut';
import { openTaskDetails } from '../taskDetails/taskDetailsStore';
import { taskCommands } from './taskCommands';
import { deadlineLabel, doneLabel, followUpLabel, type TaskAction, type TaskFields } from './taskSurface';
import { cx } from '../classNames';

/**
 * The pieces every task line is made of, shared by all screens (ADR-073). Which actions show
 * comes from `taskActions`; what they do comes from `taskCommands`.
 */

type Task = TaskFields & { id: string };

/** Finishes the task, or reopens a finished one. */
export function TaskCheckbox({ task, className, disabled }: { task: Task; className?: string; disabled?: boolean }) {
  return (
    <input
      type="checkbox"
      className={className}
      checked={task.status === 'done'}
      disabled={disabled}
      onChange={(event) => taskCommands.setDone(task.id, event.target.checked)}
      aria-label={doneLabel(task)}
    />
  );
}

/** ★ for a priority of the day, ☆ to promote one. */
export function PriorityStar({ on, onToggle, label }: { on: boolean; onToggle(): void; label?: string }) {
  const name = label ?? `${on ? 'Tirar das prioridades do dia' : 'Promover a prioridade do dia'} (${PRIORITY_SHORTCUT})`;
  return (
    <button type="button" className={cx('line__star', on && 'line__star--on')} title={name} aria-label={name} aria-pressed={on} onClick={onToggle}>
      {on ? '★' : '☆'}
    </button>
  );
}

/** Which dates a line shows as chips: those chips change the date, so no hover action repeats them. */
export function shownChips(task: TaskFields, day: DayKey | null = null) {
  return {
    // Only a waiting task has a date: the day to follow up, not repeated on that day's note.
    date: Boolean(task.waiting) && task.intendedDate !== null && task.intendedDate !== day,
    deadline: Boolean(task.deadline),
  };
}

/**
 * The dates already set, as chips. On an open task a chip changes its date; on a closed one it
 * is only text.
 */
export function TaskDateChips({
  task,
  today,
  chips,
  hideDeadline = false,
}: {
  task: Task;
  today: DayKey;
  chips: { date: boolean; deadline: boolean };
  /** The deadline is shown another way, like the priorities' "prazo hoje" icon. */
  hideDeadline?: boolean;
}) {
  const open = task.status === 'active';
  const followUp = followUpLabel(task, today);
  const deadline = deadlineLabel(task, today);
  return (
    <>
      {chips.date &&
        followUp &&
        (open ? (
          <DatePicker
            label="Mudar a data para cobrar"
            className="line__chip"
            value={task.intendedDate}
            min={today}
            onChange={(date) => taskCommands.setDate(task.id, date)}
            clearLabel="Tirar a data para cobrar"
          >
            {followUp}
          </DatePicker>
        ) : (
          <span className="muted">{followUp}</span>
        ))}
      {chips.deadline &&
        !hideDeadline &&
        deadline &&
        (open ? (
          <DatePicker
            label="Mudar o prazo máximo"
            className="line__chip"
            value={task.deadline ?? null}
            onChange={(date) => taskCommands.setDeadline(task.id, date)}
            clearLabel="Tirar o prazo máximo"
          >
            {deadline}
          </DatePicker>
        ) : (
          <span className="chip chip--muted">{deadline}</span>
        ))}
    </>
  );
}

/**
 * The hover actions of a task, in the order of `taskActions`. The caller wraps them in its own
 * container, which decides when they show.
 */
export function TaskActionButtons({
  task,
  today,
  actions,
  isPriority = false,
  isQueued = false,
  chips = { date: false, deadline: false },
  projects = [],
}: {
  task: Task;
  today: DayKey;
  actions: ReadonlySet<TaskAction>;
  isPriority?: boolean;
  isQueued?: boolean;
  /** Dates shown as chips on the line: the chip changes them, so there is no action for them. */
  chips?: { date: boolean; deadline: boolean };
  /** The projects "Projeto" can link the task to. */
  projects?: readonly Project[];
}) {
  const buttons: Record<TaskAction, () => ReactNode> = {
    details: () => (
      <button type="button" className="line__action" title="Ver e editar todos os detalhes da tarefa" onClick={() => openTaskDetails(task.id)}>
        Detalhes
      </button>
    ),
    // A priority's ★ stays visible on the line, outside the hover actions.
    priority: () => !isPriority && <PriorityStar on={false} onToggle={() => taskCommands.setPriority(task.id, true)} />,
    queue: () => (
      <button
        type="button"
        className="line__action"
        disabled={isQueued}
        title={isQueued ? 'Já está na fila de execução' : 'Adicionar ao fim da fila de execução'}
        onClick={() => taskCommands.addToQueue(task.id)}
      >
        {isQueued ? 'Na fila' : 'Adicionar à fila'}
      </button>
    ),
    project: () => (
      <select
        className="line__action active-tasks__project"
        value=""
        onChange={(event) => event.target.value && taskCommands.linkProject(task.id, event.target.value)}
        aria-label={`Vincular "${task.text}" a um projeto`}
        title="Vincular a um projeto"
      >
        <option value="">Projeto</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
    ),
    followUp: () =>
      !chips.date && (
        <DatePicker
          label="Data para cobrar"
          className="line__action"
          value={task.intendedDate}
          min={today}
          onChange={(date) => taskCommands.setDate(task.id, date)}
          clearLabel={task.intendedDate ? 'Tirar a data para cobrar' : undefined}
        >
          Cobrar
        </DatePicker>
      ),
    deadline: () =>
      !chips.deadline && (
        <DatePicker
          label={task.deadline ? 'Mudar o prazo máximo' : 'Prazo máximo'}
          className="line__action"
          value={task.deadline ?? null}
          onChange={(date) => taskCommands.setDeadline(task.id, date)}
          clearLabel={task.deadline ? 'Tirar o prazo máximo' : undefined}
        >
          Prazo
        </DatePicker>
      ),
    waiting: () => (
      <button
        type="button"
        className="line__action"
        title={task.waiting ? 'Voltar a ser uma tarefa minha' : 'Marcar como algo que alguém me deve'}
        onClick={() => taskCommands.setWaiting(task.id, !task.waiting)}
      >
        {task.waiting ? 'Não é aguardando' : 'Aguardando'}
      </button>
    ),
    abandon: () => <AbandonAction onAbandon={() => taskCommands.abandon(task.id)} />,
  };
  return (
    <>
      {[...actions].map((action) => (
        <Fragment key={action}>{buttons[action]()}</Fragment>
      ))}
    </>
  );
}
