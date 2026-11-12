import { Fragment, type ReactNode } from 'react';
import type { DayKey } from '../../domain/day';
import type { Project } from '../../domain/entities';
import { AbandonAction } from '../components/AbandonAction';
import { DatePicker } from '../components/DatePicker';
import { PRIORITY_SHORTCUT } from '../dayNote/priorityShortcut';
import { taskCommands } from './taskCommands';
import { dateLabels, deadlineLabel, doneLabel, intendedDateLabel, type TaskAction, type TaskFields } from './taskSurface';

/**
 * The pieces every task line is made of, shared by all screens (ADR-072). Which actions show
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
    <button type="button" className={`line__star ${on ? 'line__star--on' : ''}`} title={name} aria-label={name} aria-pressed={on} onClick={onToggle}>
      {on ? '★' : '☆'}
    </button>
  );
}

/** Which dates a line shows as chips: those chips change the date, so no hover action repeats them. */
export function shownChips(task: TaskFields, { day = null, hideDate = false }: { day?: DayKey | null; hideDate?: boolean } = {}) {
  return {
    date: !hideDate && task.intendedDate !== null && task.intendedDate !== day,
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
  onDate = (date) => taskCommands.setDate(task.id, date),
}: {
  task: Task;
  today: DayKey;
  chips: { date: boolean; deadline: boolean };
  /** The deadline is shown another way, like the priorities' "prazo hoje" icon. */
  hideDeadline?: boolean;
  /** Replaces the plain date change, as for a priority of the day. */
  onDate?(date: DayKey | null): void;
}) {
  const open = task.status === 'active';
  const dateText = intendedDateLabel(task, today);
  const deadlineText = deadlineLabel(task, today);
  const labels = dateLabels(task);
  return (
    <>
      {chips.date &&
        dateText &&
        (open ? (
          <DatePicker label={labels.change} className="line__chip" value={task.intendedDate} min={today} onChange={onDate} clearLabel={labels.clear}>
            {dateText}
          </DatePicker>
        ) : (
          <span className="muted">{dateText}</span>
        ))}
      {chips.deadline &&
        !hideDeadline &&
        deadlineText &&
        (open ? (
          <DatePicker
            label="Mudar o prazo máximo"
            className="line__chip"
            value={task.deadline ?? null}
            onChange={(date) => taskCommands.setDeadline(task.id, date)}
            clearLabel="Tirar o prazo máximo"
          >
            {deadlineText}
          </DatePicker>
        ) : (
          <span className="chip chip--muted">{deadlineText}</span>
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
  onDate = (date) => taskCommands.setDate(task.id, date),
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
  /** Replaces the plain date change, as for a priority of the day. */
  onDate?(date: DayKey | null): void;
}) {
  const labels = dateLabels(task);
  const buttons: Record<TaskAction, () => ReactNode> = {
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
    date: () =>
      !chips.date && (
        <DatePicker
          label={task.intendedDate ? labels.change : labels.set}
          className="line__action"
          value={task.intendedDate}
          min={today}
          onChange={onDate}
          clearLabel={task.intendedDate ? labels.clear : undefined}
        >
          {labels.button}
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
