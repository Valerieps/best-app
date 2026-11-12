import { useEffect, useRef, useState } from 'react';
import { setDeadline, setIntendedDate, setTaskProject } from '../../application/dayTools';
import { addToQueue, removeFromQueue } from '../../application/executionQueue';
import { abandonTask, setTaskDone, setTaskWaiting, updateBlockText } from '../../application/notebook';
import { loadTaskDetails, type TaskDetails } from '../../application/queries';
import type { DayKey } from '../../domain/day';
import { AbandonAction } from '../components/AbandonAction';
import { relativeDay } from '../format';
import { appContext, reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';
import { closeTaskDetails, useOpenTaskId } from './taskDetailsStore';

/**
 * "Detalhes da tarefa": a window over the app with every field of a task, editable. Mounted once
 * in the shell, so a task opens the same way on any screen.
 */
export function TaskDetailsHost({ today }: { today: DayKey }) {
  const taskId = useOpenTaskId();
  if (!taskId) return null;
  return <TaskDetailsLoader key={taskId} taskId={taskId} today={today} />;
}

function TaskDetailsLoader({ taskId, today }: { taskId: string; today: DayKey }) {
  const details = useLiveQuery(() => loadTaskDetails(reader, taskId), [taskId]);
  // The task is gone (deleted, or a backup was imported): nothing to show.
  useEffect(() => {
    if (details === null) closeTaskDetails();
  }, [details]);
  if (!details) return null;
  return <TaskDetailsDialog details={details} today={today} />;
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Por fazer',
  done: 'Concluída',
  abandoned: 'Abandonada',
  converted: 'Convertida',
};

function formatMoment(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' });
}

function TaskDetailsDialog({ details, today }: { details: TaskDetails; today: DayKey }) {
  const { item, activeProjects, queueIds } = details;
  const { task, origin, project } = item;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState(task.text);
  const savedText = useRef(task.text);
  const active = task.status === 'active';
  const inQueue = queueIds.includes(task.id);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  // Another place changed the text (and this field is not being edited): follow it.
  useEffect(() => {
    if (task.text !== savedText.current) {
      savedText.current = task.text;
      setText(task.text);
    }
  }, [task.text]);

  function saveText() {
    if (text === savedText.current) return;
    savedText.current = text;
    void updateBlockText(appContext, task.id, text);
  }

  function close() {
    saveText();
    closeTaskDetails();
  }

  // A linked project that is no longer active is kept as an option, so the select shows it.
  const projectOptions = project && !activeProjects.some((candidate) => candidate.id === project.id) ? [project, ...activeProjects] : activeProjects;

  return (
    <dialog
      ref={dialogRef}
      className="dialog task-details"
      aria-labelledby="task-details-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onMouseDown={(event) => {
        // A click on the backdrop (the dialog itself) closes it.
        if (event.target === event.currentTarget) close();
      }}
    >
      <h2 id="task-details-title">Detalhes da tarefa</h2>

      <label className="task-details__field">
        <span className="task-details__label">Tarefa</span>
        <textarea
          className="text-input task-details__text"
          rows={3}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onBlur={saveText}
          spellCheck
        />
      </label>

      <label className="task-details__field task-details__field--inline">
        <input
          type="checkbox"
          checked={task.status === 'done'}
          disabled={task.status !== 'active' && task.status !== 'done'}
          onChange={(event) => void setTaskDone(appContext, task.id, event.target.checked)}
        />
        <span>Concluída</span>
      </label>

      <label className="task-details__field">
        <span className="task-details__label">Projeto</span>
        <select
          className="text-input"
          value={task.projectId ?? ''}
          disabled={!active}
          onChange={(event) => void setTaskProject(appContext, task.id, event.target.value || null)}
        >
          <option value="">Sem projeto</option>
          {projectOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </label>

      <div className="task-details__row">
        {/* Only a waiting task has a date besides the deadline: the day to follow up (ADR-072). */}
        {task.waiting && (
          <label className="task-details__field">
            <span className="task-details__label">Data para cobrar</span>
            <input
              type="date"
              className="date-input"
              disabled={!active}
              value={task.intendedDate ?? ''}
              onChange={(event) => void setIntendedDate(appContext, task.id, event.target.value || null)}
            />
          </label>
        )}
        <label className="task-details__field">
          <span className="task-details__label">Prazo máximo</span>
          <input
            type="date"
            className="date-input"
            disabled={!active}
            value={task.deadline ?? ''}
            onChange={(event) => void setDeadline(appContext, task.id, event.target.value || null)}
          />
        </label>
      </div>

      {active && (
        <div className="task-details__row">
          <label className="task-details__field task-details__field--inline">
            <input type="checkbox" checked={Boolean(task.waiting)} onChange={(event) => void setTaskWaiting(appContext, task.id, event.target.checked)} />
            <span>Aguardando (alguém me deve)</span>
          </label>
          {!task.waiting && (
            <button
              type="button"
              className="small"
              onClick={() => void (inQueue ? removeFromQueue(appContext, task.id) : addToQueue(appContext, task.id))}
            >
              {inQueue ? 'Tirar da fila de execução' : 'Adicionar à fila de execução'}
            </button>
          )}
        </div>
      )}

      <dl className="task-details__facts">
        <dt>Situação</dt>
        <dd>{STATUS_LABELS[task.status ?? 'active'] ?? task.status}</dd>
        <dt>Criada em</dt>
        <dd>{formatMoment(task.createdAt)}</dd>
        {origin && (
          <>
            <dt>Escrita em</dt>
            <dd>
              {origin.title ? `${origin.title}, ` : ''}
              {relativeDay(origin.day, today)}
            </dd>
          </>
        )}
        <dt>Adiamentos</dt>
        <dd>{task.postponeCount}</dd>
        {task.closedAt && (
          <>
            <dt>{task.status === 'done' ? 'Concluída em' : 'Encerrada em'}</dt>
            <dd>{formatMoment(task.closedAt)}</dd>
          </>
        )}
      </dl>

      <div className="dialog__actions task-details__actions">
        {active && (
          <AbandonAction
            onAbandon={() => {
              void abandonTask(appContext, task.id);
              closeTaskDetails();
            }}
          />
        )}
        <button type="button" className="primary" onClick={close} autoFocus>
          Fechar
        </button>
      </div>
    </dialog>
  );
}
