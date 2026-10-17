import { useEffect, useState, type DragEvent, type MouseEvent } from 'react';
import { applyPlanning, applyTriage } from '../../application/checkout';
import type { TaskListItem } from '../../application/queries';
import { loadPlanning } from '../../application/queries';
import { boardOutcome, rangeBetween, type PlanningColumn } from '../../domain/checkoutSteps';
import { addDays, type DayKey } from '../../domain/day';
import type { Project } from '../../domain/entities';
import type { DayTriage, TaskDecision, TaskRow } from '../../domain/triage';
import { ProjectChip } from '../components/Chips';
import { Icon } from '../components/Icon';
import { IconAction } from '../components/IconAction';
import { Linkified } from '../components/Linkified';
import { SkeletonLines } from '../components/Skeleton';
import { boardDayLabel, plural, relativeDay } from '../format';
import { appContext, reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';
import { noDecisions, StepFooter, StepQuestion, useStepKeys } from './StepParts';

interface Props {
  /** "late": the late tasks; "triage": the tasks of the day, in a first column "Sem data". */
  mode: 'late' | 'triage';
  day: DayKey;
  today: DayKey;
  triage: DayTriage;
  projects: Project[];
  busy: boolean;
  onBack: (() => void) | null;
  /** Saves the board (`apply`) and moves on, or finishes the day on the last step. */
  onNext(apply: () => Promise<void>): void;
  primary: string;
  /** Replaces the question above the board. */
  question?: string;
  /** How many columns of days; three by default. */
  dayColumns?: number;
  /**
   * Saves the board instead of the checkout, which would mark the tasks as triaged on `day`
   * ("Tarefas esquecidas" reuses the board). Untouched cards of the triage keep their suggestion.
   */
  onSave?(decisions: Map<string, TaskDecision>, changes: { taskId: string; date: DayKey | null }[]): Promise<void>;
}

/** A column of a board: the late tasks, the tasks of the day still to triage, or one day. */
type Column = PlanningColumn | { kind: 'inbox' };

/** Where a card can be dropped besides a day: "remover data de intenção" or "abandonar". */
type Zone = 'undate' | 'abandon';

const DRAG_TYPE = 'application/x-vesper-task';

export function taskProjectOf(row: TaskRow): string | null {
  return row.task.projectId ?? row.section?.projectId ?? null;
}

/**
 * A step of "Fechar o dia" as a board where each task is a card with only its text and project.
 * The late board has the late tasks first; the board of the day has its tasks in a first column
 * "Sem data", each with the box to finish it. The other columns are the target day and the days
 * after it, with the tasks already dated for them. A card gets a new date by being dragged to a
 * day, to "remover data de intenção", or to "abandonar" above the board, or in a batch. Nothing
 * is saved until I move on (spec/checkout.md, "Fechamento em etapas").
 */
export function BoardStep({ mode, day, today, triage, projects, busy, onBack, onNext, primary, question: customQuestion, dayColumns, onSave }: Props) {
  const target = triage.nextDay;
  const rowIds = triage.rows.map((row) => row.task.id);
  const view = useLiveQuery(
    () => loadPlanning(reader, target, today, { exclude: new Set(rowIds), late: mode === 'late', columns: dayColumns }),
    [target, today, mode, rowIds.join(' '), dayColumns],
  );
  const [dates, setDates] = useState<Map<string, DayKey | null>>(new Map());
  const [abandoned, setAbandoned] = useState<Set<string>>(new Set());
  const [finished, setFinished] = useState<Set<string>>(new Set());
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<string | null>(null);
  const [batchDate, setBatchDate] = useState<DayKey>(addDays(target, 1));
  const [flash, setFlash] = useState('');
  const [dropOn, setDropOn] = useState<number | Zone | null>(null);

  const label = relativeDay(target, today);
  const Label = label.charAt(0).toUpperCase() + label.slice(1);
  const suggestions = new Map<string, TaskDecision>(mode === 'triage' ? triage.rows.map((row) => [row.task.id, row.suggestion]) : []);
  const rowItems: TaskListItem[] =
    mode === 'triage'
      ? triage.rows.map((row) => ({
          task: row.task,
          origin: row.section,
          project: projects.find((project) => project.id === taskProjectOf(row)) ?? null,
        }))
      : [];
  const columns: Column[] = view ? [...(mode === 'triage' ? [{ kind: 'inbox' as const }] : []), ...view.columns.map(({ column }) => column)] : [];
  const items = view ? [...rowItems, ...view.columns.flatMap((each) => each.items)] : [];

  const isRow = (id: string) => suggestions.has(id);
  const moved = (id: string) => dates.has(id);
  const dateOf = (item: TaskListItem) => (moved(item.task.id) ? (dates.get(item.task.id) ?? null) : item.task.intendedDate);
  const dayIndex = (date: DayKey | null) => {
    if (date === null) return -1;
    if (date < today) return columns.findIndex((column) => column.kind === 'late');
    return columns.findIndex((column) => column.kind === 'day' && column.day === date);
  };
  const homeOf = (item: TaskListItem) => (isRow(item.task.id) ? 0 : dayIndex(item.task.intendedDate));
  // A card moved to a day of the board goes there; one sent off the board stays home, faded.
  const columnOf = (item: TaskListItem) => {
    const id = item.task.id;
    const now = moved(id) && !abandoned.has(id) ? dayIndex(dateOf(item)) : -1;
    return now !== -1 ? now : homeOf(item);
  };
  const awayOf = (item: TaskListItem) => moved(item.task.id) && dayIndex(dateOf(item)) === -1;
  const columnLabel = (column: Column) =>
    column.kind === 'late' ? 'Atrasadas' : column.kind === 'inbox' ? 'Sem data' : boardDayLabel(column.day, today);

  const board = columns.map((column, index) => ({ column, cards: items.filter((item) => columnOf(item) === index) }));
  const ids = board.flatMap(({ cards }) => cards.map((item) => item.task.id));
  const targetCount = items.filter((item) => !abandoned.has(item.task.id) && !finished.has(item.task.id) && dateOf(item) === target).length;

  function without(set: Set<string>, list: Iterable<string>): Set<string> {
    const updated = new Set(set);
    for (const id of list) updated.delete(id);
    return updated;
  }

  /** A new date (null removes it) for these cards, which are no longer abandoned or finished. */
  function moveTo(list: string[], date: DayKey | null) {
    setDates((previous) => {
      const updated = new Map(previous);
      for (const id of list) updated.set(id, date);
      return updated;
    });
    setAbandoned((previous) => without(previous, list));
    setFinished((previous) => without(previous, list));
  }

  function abandon(id: string) {
    setAbandoned((previous) => new Set(previous).add(id));
    setFinished((previous) => without(previous, [id]));
  }

  function toggleFinished(id: string) {
    setFinished((previous) => {
      const updated = new Set(previous);
      if (updated.has(id)) updated.delete(id);
      else updated.add(id);
      return updated;
    });
    setAbandoned((previous) => without(previous, [id]));
  }

  function next() {
    if (busy || !view || selecting) return;
    const cards = items.map((item) => ({ id: item.task.id, date: item.task.intendedDate, suggestion: suggestions.get(item.task.id) }));
    const { decisions, changes } = boardOutcome(cards, { dates, abandoned, finished });
    onNext(async () => {
      if (onSave) return onSave(decisions, changes);
      if (changes.length > 0) await applyPlanning(appContext, day, changes);
      if (decisions.size > 0) await applyTriage(appContext, day, { ...noDecisions(), tasks: decisions });
    });
  }

  function leaveSelection() {
    setSelecting(false);
    setSelected(new Set());
    setAnchor(null);
    setFlash('');
  }

  function pick(id: string, event: MouseEvent) {
    setFlash('');
    if (event.shiftKey && anchor) {
      const range = rangeBetween(ids, anchor, id);
      setSelected((previous) => new Set([...previous, ...range]));
    } else {
      setSelected((previous) => {
        const updated = new Set(previous);
        if (updated.has(id)) updated.delete(id);
        else updated.add(id);
        return updated;
      });
    }
    setAnchor(id);
  }

  function pickColumn(cards: TaskListItem[]) {
    const columnIds = cards.map((item) => item.task.id);
    const all = columnIds.every((id) => selected.has(id));
    setSelected((previous) => {
      const updated = new Set(previous);
      for (const id of columnIds) {
        if (all) updated.delete(id);
        else updated.add(id);
      }
      return updated;
    });
    setFlash('');
  }

  function applyBatch(date: DayKey | null) {
    const count = selected.size;
    moveTo([...selected], date);
    setFlash(`${plural(count, 'tarefa', 'tarefas')} → ${date === null ? 'sem data' : relativeDay(date, today)}`);
    setSelected(new Set());
    setAnchor(null);
  }

  useStepKeys({ onEnter: next });
  useEffect(() => {
    if (!selecting) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') leaveSelection();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selecting]);

  if (!view) return <SkeletonLines />;

  const dropTarget = (key: number | Zone, onDropId: (id: string) => void) =>
    selecting
      ? {}
      : {
          onDragOver: (event: DragEvent) => {
            if (!event.dataTransfer.types.includes(DRAG_TYPE)) return;
            event.preventDefault();
            setDropOn(key);
          },
          onDragLeave: () => setDropOn((current) => (current === key ? null : current)),
          onDrop: (event: DragEvent) => {
            event.preventDefault();
            setDropOn(null);
            const id = event.dataTransfer.getData(DRAG_TYPE);
            if (id) onDropId(id);
          },
        };

  const renderCard = (item: TaskListItem) => {
    const id = item.task.id;
    const text = item.task.text || '(tarefa sem texto)';
    const date = dateOf(item);
    const isAbandoned = abandoned.has(id);
    const isFinished = finished.has(id);
    const away = !isAbandoned && !isFinished && awayOf(item);
    const faded = isAbandoned || isFinished || away;
    const body = (
      <span className="plan-card__text">
        <span className={isFinished ? 'plan-card__done' : undefined}>
          <Linkified text={text} />
        </span>
        <span className="plan-card__meta">
          {item.project && <ProjectChip name={item.project.name} />}
          {isAbandoned && <span className="chip chip--warning">→ abandonar</span>}
          {away && <span className="chip chip--warning">→ {date === null ? 'sem data' : relativeDay(date, today)}</span>}
        </span>
      </span>
    );
    if (selecting) {
      const on = selected.has(id);
      return (
        <li key={id}>
          <button
            type="button"
            className={`plan-card plan-card--select ${on ? 'plan-card--on' : ''} ${faded ? 'plan-card--away' : ''}`}
            aria-pressed={on}
            onClick={(event) => pick(id, event)}
          >
            {body}
          </button>
        </li>
      );
    }
    return (
      <li
        key={id}
        className={`plan-card ${faded ? 'plan-card--away' : ''}`}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData(DRAG_TYPE, id);
          event.dataTransfer.effectAllowed = 'move';
        }}
      >
        <span className="plan-card__row">
          {isRow(id) && (
            <input
              type="checkbox"
              checked={isFinished}
              onChange={() => toggleFinished(id)}
              aria-label={item.task.waiting ? `Concluir "${text}"` : `Finalizar "${text}"`}
            />
          )}
          {body}
        </span>
      </li>
    );
  };

  const question =
    customQuestion ??
    (mode === 'late' ? 'O que fazer com as tarefas atrasadas?' : `Para onde vão as tarefas ${day === today ? 'de hoje' : 'do dia'}?`);

  return (
    <>
      <div className={`card__body checkout-step ${selecting ? 'checkout-step--batch' : ''}`}>
        <StepQuestion focusKey={mode}>{question}</StepQuestion>
        <div className="plan-intro">
          <p className="muted">
            {selecting ? 'Shift + clique seleciona um intervalo.' : 'Arraste um card para outro dia, para remover a data ou para abandonar.'}
          </p>
          <IconAction
            icon="checklist"
            label={selecting ? 'Sair da seleção' : 'Selecionar várias'}
            pressed={selecting}
            onClick={selecting ? leaveSelection : () => setSelecting(true)}
          />
        </div>
        <div className="plan-drops">
          <div
            className={`plan-drop ${dropOn === 'undate' ? 'plan-drop--on' : ''}`}
            {...dropTarget('undate', (id) => moveTo([id], null))}
          >
            <Icon name="calendarOff" /> Remover data de intenção
          </div>
          <div
            className={`plan-drop plan-drop--danger ${dropOn === 'abandon' ? 'plan-drop--on' : ''}`}
            {...dropTarget('abandon', abandon)}
          >
            <Icon name="ban" /> Abandonar tarefa
          </div>
        </div>
        <div className="plan-board" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
          {board.map(({ column, cards }, index) => {
            const all = cards.length > 0 && cards.every((item) => selected.has(item.task.id));
            const key = column.kind === 'day' ? column.day : column.kind;
            return (
              <section
                key={key}
                className={`plan-column ${column.kind === 'late' ? 'plan-column--late' : ''} ${dropOn === index ? 'plan-column--drop' : ''}`}
                aria-label={columnLabel(column)}
                {...(column.kind === 'day' ? dropTarget(index, (id) => moveTo([id], column.day)) : {})}
              >
                <h3 className="plan-column__title">
                  {columnLabel(column)} <span className="muted">({cards.length})</span>
                  {selecting && cards.length > 0 && (
                    <IconAction
                      icon="checklist"
                      label={all ? 'Tirar a seleção da coluna' : 'Selecionar a coluna'}
                      pressed={all}
                      onClick={() => pickColumn(cards)}
                      className="checkout-group__pick"
                    />
                  )}
                </h3>
                <ul className="plan-column__cards">{cards.map(renderCard)}</ul>
                {cards.length === 0 && <p className="muted plan-column__empty">Nenhuma tarefa.</p>}
              </section>
            );
          })}
        </div>
        <p className="plan-total">
          {Label} começa com <b>{plural(targetCount, 'tarefa', 'tarefas')}</b>.
        </p>
      </div>
      <StepFooter onBack={onBack} primary={primary} onPrimary={next} busy={busy} />
      {selecting && (
        <div className="batch-bar" role="region" aria-label="Edição em lote">
          <span className="batch-bar__count">
            {selected.size > 0 ? <b>{plural(selected.size, 'tarefa selecionada', 'tarefas selecionadas')}</b> : flash || 'Nenhuma tarefa selecionada'}
          </span>
          <span className="batch-bar__actions">
            <IconAction icon="arrowRight" label={`Levar para ${label}`} disabled={selected.size === 0} onClick={() => applyBatch(target)} />
            <span className="batch-bar__date">
              <input
                type="date"
                className="date-input"
                min={today}
                value={batchDate}
                onChange={(event) => event.target.value && setBatchDate(event.target.value)}
                aria-label="Data para as tarefas selecionadas"
              />
              <IconAction icon="calendar" label="Levar para esta data" disabled={selected.size === 0} onClick={() => applyBatch(batchDate)} />
            </span>
            <IconAction icon="calendarOff" label="Sem data: vai para a lista de tarefas" disabled={selected.size === 0} onClick={() => applyBatch(null)} />
          </span>
        </div>
      )}
    </>
  );
}
