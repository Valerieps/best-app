import { useState, type DragEvent } from 'react';
import { applyTriage } from '../../application/checkout';
import { loadExecutionQueue, type TaskListItem } from '../../application/queries';
import { boardOutcome } from '../../domain/checkoutSteps';
import type { DayKey } from '../../domain/day';
import type { Project } from '../../domain/entities';
import type { DayTriage, TaskRow } from '../../domain/triage';
import { ProjectChip } from '../components/Chips';
import { Icon } from '../components/Icon';
import { Linkified } from '../components/Linkified';
import { SkeletonLines } from '../components/Skeleton';
import { plural } from '../format';
import { appContext, reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';
import { noDecisions, StepFooter, StepQuestion, useStepKeys } from './StepParts';
import { taskText } from '../tasks/taskSurface';

interface Props {
  day: DayKey;
  today: DayKey;
  triage: DayTriage;
  projects: Project[];
  busy: boolean;
  onBack: (() => void) | null;
  /** Saves the board (`apply`) and moves on, or finishes the day on the last step. */
  onNext(apply: () => Promise<void>): void;
  primary: string;
}

/** Where a card can be dropped: the tasks of the day, the queue, or "abandonar". */
type Target = 'day' | 'queue' | 'abandon';

const DRAG_TYPE = 'application/x-vesper-task';

export function taskProjectOf(row: TaskRow): string | null {
  return row.task.projectId ?? row.section?.projectId ?? null;
}

/**
 * The board of "Fechar o dia" (spec/checkout.md, "Quadro do fechamento"): the tasks of the day
 * on the left, each with the box to finish it, and the "Fila de execução" on the right, with the
 * tasks already in it. I drag a card into the queue, back out of it, or to "abandonar". A card I
 * leave on the left simply stays linked to its project or person. Nothing is saved until I move
 * on. Tasks have no intended date any more (ADR-072).
 */
export function BoardStep({ day, today, triage, projects, busy, onBack, onNext, primary }: Props) {
  const queue = useLiveQuery(() => loadExecutionQueue(reader), []);
  const [queued, setQueued] = useState<string[]>([]);
  const [abandoned, setAbandoned] = useState<Set<string>>(new Set());
  const [finished, setFinished] = useState<Set<string>>(new Set());
  const [dropOn, setDropOn] = useState<Target | null>(null);

  const inQueue = new Set(queue?.items.map((item) => item.task.id) ?? []);
  const rows = triage.rows.filter((row) => !inQueue.has(row.task.id));
  const itemOf = (row: TaskRow): TaskListItem => ({
    task: row.task,
    origin: row.section,
    project: projects.find((project) => project.id === taskProjectOf(row)) ?? null,
  });
  const items = new Map(rows.map((row) => [row.task.id, itemOf(row)]));
  const left = rows.filter((row) => !queued.includes(row.task.id)).map(itemOf);
  const added = queued.flatMap((id) => items.get(id) ?? []);
  const queueSize = (queue?.items.length ?? 0) + added.filter((item) => !abandoned.has(item.task.id) && !finished.has(item.task.id)).length;

  function without(set: Set<string>, id: string): Set<string> {
    const updated = new Set(set);
    updated.delete(id);
    return updated;
  }

  /** A card dropped somewhere: into the queue (never a waiting task), back to the day, or abandoned. */
  function drop(id: string, target: Target) {
    const item = items.get(id);
    if (!item) return;
    if (target === 'abandon') {
      setAbandoned((previous) => new Set(previous).add(id));
      setFinished((previous) => without(previous, id));
      return;
    }
    if (target === 'queue' && item.task.waiting) return;
    setAbandoned((previous) => without(previous, id));
    setQueued((previous) => (target === 'queue' ? (previous.includes(id) ? previous : [...previous, id]) : previous.filter((each) => each !== id)));
  }

  function toggleFinished(id: string) {
    setFinished((previous) => (previous.has(id) ? without(previous, id) : new Set(previous).add(id)));
    setAbandoned((previous) => without(previous, id));
  }

  function next() {
    if (busy || !queue) return;
    const cards = triage.rows.map((row) => ({ id: row.task.id, suggestion: row.suggestion }));
    const decisions = boardOutcome(cards, { queued: new Set(queued), abandoned, finished });
    onNext(async () => {
      if (decisions.size > 0) await applyTriage(appContext, day, { ...noDecisions(), tasks: decisions });
    });
  }

  useStepKeys({ onEnter: next });

  if (!queue) return <SkeletonLines />;

  const dropTarget = (target: Target) => ({
    onDragOver: (event: DragEvent) => {
      if (!event.dataTransfer.types.includes(DRAG_TYPE)) return;
      event.preventDefault();
      setDropOn(target);
    },
    onDragLeave: () => setDropOn((current) => (current === target ? null : current)),
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      setDropOn(null);
      const id = event.dataTransfer.getData(DRAG_TYPE);
      if (id) drop(id, target);
    },
  });

  const body = (item: TaskListItem, done = false, mark: string | null = null) => (
    <span className="plan-card__text">
      <span className={done ? 'plan-card__done' : undefined}>
        <Linkified text={taskText(item.task)} />
      </span>
      <span className="plan-card__meta">
        {item.project && <ProjectChip name={item.project.name} />}
        {item.task.waiting && <span className="chip chip--waiting">aguardando</span>}
        {mark && <span className="chip chip--warning">{mark}</span>}
      </span>
    </span>
  );

  /** A task of the day: draggable, with the box to finish it. */
  const card = (item: TaskListItem) => {
    const id = item.task.id;
    const text = taskText(item.task);
    const isAbandoned = abandoned.has(id);
    const isFinished = finished.has(id);
    return (
      <li
        key={id}
        className={`plan-card ${isAbandoned || isFinished ? 'plan-card--away' : ''}`}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData(DRAG_TYPE, id);
          event.dataTransfer.effectAllowed = 'move';
        }}
      >
        <span className="plan-card__row">
          <input
            type="checkbox"
            checked={isFinished}
            onChange={() => toggleFinished(id)}
            aria-label={item.task.waiting ? `Concluir "${text}"` : `Finalizar "${text}"`}
          />
          {body(item, isFinished, isAbandoned ? '→ abandonar' : null)}
        </span>
      </li>
    );
  };

  /** A task already in the queue: shown for context, changed only on the queue's own screen. */
  const queuedCard = (item: TaskListItem) => (
    <li key={item.task.id} className="plan-card plan-card--fixed">
      {body(item)}
    </li>
  );

  const column = (target: 'day' | 'queue', title: string, count: number, cards: React.ReactNode, empty: string) => (
    <section
      className={`plan-column ${target === 'queue' ? 'plan-column--queue' : ''} ${dropOn === target ? 'plan-column--drop' : ''}`}
      aria-label={title}
      {...dropTarget(target)}
    >
      <h3 className="plan-column__title">
        {title} <span className="muted">({count})</span>
      </h3>
      <ul className="plan-column__cards">{cards}</ul>
      {count === 0 && <p className="muted plan-column__empty">{empty}</p>}
    </section>
  );

  return (
    <>
      <div className="card__body checkout-step checkout-step--board">
        <StepQuestion focusKey="triage">O que vai para a fila de execução?</StepQuestion>
        <div className="plan-intro">
          <p className="muted">
            Arraste para a fila o que você quer fazer, ou para a lixeira para abandonar. O que ficar à esquerda continua no projeto ou com a
            pessoa.
          </p>
        </div>
        <div className="plan-drops">
          <div
            className={`plan-drop plan-drop--danger ${dropOn === 'abandon' ? 'plan-drop--on' : ''}`}
            {...dropTarget('abandon')}
            role="img"
            aria-label="Abandonar tarefa"
            title="Abandonar tarefa"
          >
            <Icon name="trash" />
          </div>
        </div>
        <div className="plan-board">
          {column('day', day === today ? 'Tarefas de hoje' : 'Tarefas do dia', left.length, left.map(card), 'Nenhuma tarefa.')}
          {column(
            'queue',
            'Fila de execução',
            queue.items.length + added.length,
            [...queue.items.map(queuedCard), ...added.map(card)],
            'A fila está vazia.',
          )}
        </div>
        <p className="plan-total">
          A fila fica com <b>{plural(queueSize, 'tarefa', 'tarefas')}</b>.
        </p>
      </div>
      <StepFooter onBack={onBack} primary={primary} onPrimary={next} busy={busy} />
    </>
  );
}
