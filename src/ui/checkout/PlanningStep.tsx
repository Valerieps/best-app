import { useCallback, useEffect, useState, type DragEvent, type MouseEvent } from 'react';
import { applyPlanning, applyTriage, completeCheckout, defaultClosingDecisions, type PlanningChange } from '../../application/checkout';
import type { TaskListItem } from '../../application/queries';
import { loadDayTriage, loadPlanning } from '../../application/queries';
import { planningColumnOf, rangeBetween, type PlanningColumn } from '../../domain/checkoutSteps';
import { addDays, type DayKey } from '../../domain/day';
import { Fireworks, playPlim } from '../components/Celebration';
import { ProjectChip } from '../components/Chips';
import { IconAction } from '../components/IconAction';
import { Linkified } from '../components/Linkified';
import { SkeletonLines } from '../components/Skeleton';
import { formatShortDate, plural, postponedLabel, relativeDay, weekdayName } from '../format';
import { appContext, reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';
import { StepFooter, StepQuestion, useStepKeys } from './StepParts';

interface Props {
  day: DayKey;
  target: DayKey;
  today: DayKey;
  onBack: (() => void) | null;
  /** After the fireworks: back to where the closing started. */
  onDone(): void;
}

/** What a card's date field shows: one of the board's days, another date, no date, or still late. */
type When = DayKey | 'other' | 'none' | 'late';

const DRAG_TYPE = 'application/x-vesper-task';

/**
 * Step "Amanhã", as a board of three columns where each task is a card: the late tasks all
 * together first, when there are any, then today when it has tasks, and the target day with the
 * days after it. Each card can get a new date from its field, by being dragged to another day,
 * or in a batch; nothing is finished here, and the dates are saved at "Finalizar meu dia"
 * (spec/checkout.md, "Planejamento do dia seguinte").
 */
export function PlanningStep({ day, target, today, onBack, onDone }: Props) {
  const view = useLiveQuery(() => loadPlanning(reader, target, today), [target, today]);
  const [dates, setDates] = useState<Map<string, DayKey | null>>(new Map());
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<string | null>(null);
  const [batchDate, setBatchDate] = useState<DayKey>(addDays(target, 1));
  const [flash, setFlash] = useState('');
  const [dropOn, setDropOn] = useState<number | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [busy, setBusy] = useState(false);
  const finish = useCallback(() => onDone(), [onDone]);

  const label = relativeDay(target, today);
  const Label = label.charAt(0).toUpperCase() + label.slice(1);
  const columns: PlanningColumn[] = view ? view.columns.map(({ column }) => column) : [];
  const items = view ? view.columns.flatMap((each) => each.items) : [];
  const dateOf = (item: TaskListItem) => (dates.has(item.task.id) ? (dates.get(item.task.id) ?? null) : item.task.intendedDate);
  const changed = (item: TaskListItem) => dateOf(item) !== item.task.intendedDate;
  const dayLabel = (date: DayKey) => {
    if (date === today || date === addDays(today, 1)) {
      const relative = relativeDay(date, today);
      return relative.charAt(0).toUpperCase() + relative.slice(1);
    }
    return `${weekdayName(date).slice(0, 3)}, ${formatShortDate(date)}`;
  };
  const dateLabel = (date: DayKey | null) => (date === null ? 'Sem data' : dayLabel(date));
  const columnLabel = (column: PlanningColumn) => (column.kind === 'late' ? 'Atrasadas' : dayLabel(column.day));
  const setDate = (id: string, date: DayKey | null) => setDates((previous) => new Map(previous).set(id, date));

  // A changed card moves to its new day; one sent off the board stays where it was, marked.
  const columnOf = (item: TaskListItem) => {
    const now = planningColumnOf(dateOf(item), columns, today);
    return now !== -1 ? now : planningColumnOf(item.task.intendedDate, columns, today);
  };
  const board = columns.map((column, index) => ({ column, cards: items.filter((item) => columnOf(item) === index) }));
  const ids = board.flatMap(({ cards }) => cards.map((item) => item.task.id));
  const targetCount = items.filter((item) => dateOf(item) === target).length;

  async function finalize() {
    if (busy || !view) return;
    setBusy(true);
    const changes: PlanningChange[] = items.filter(changed).map((item) => ({ taskId: item.task.id, date: dateOf(item) }));
    await applyPlanning(appContext, day, changes);
    // Whatever is still open (a task added meanwhile, or notes when there were no tasks) is settled.
    await applyTriage(appContext, day, defaultClosingDecisions(await loadDayTriage(reader, day, today)));
    await completeCheckout(appContext, day);
    playPlim();
    setCelebrating(true);
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
    setDates((previous) => {
      const updated = new Map(previous);
      for (const id of selected) updated.set(id, date);
      return updated;
    });
    setFlash(`${plural(count, 'tarefa', 'tarefas')} → ${dateLabel(date).toLowerCase()}`);
    setSelected(new Set());
    setAnchor(null);
  }

  useStepKeys({ onEnter: selecting ? undefined : finalize });
  useEffect(() => {
    if (!selecting) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') leaveSelection();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selecting]);

  if (!view) return <SkeletonLines />;

  const dayColumns = columns.filter((column): column is { kind: 'day'; day: DayKey } => column.kind === 'day');
  const whenOf = (item: TaskListItem): When => {
    const date = dateOf(item);
    if (date === null) return 'none';
    if (date < today) return 'late';
    return dayColumns.some((column) => column.day === date) ? date : 'other';
  };

  function onDrop(event: DragEvent, column: PlanningColumn) {
    event.preventDefault();
    setDropOn(null);
    const id = event.dataTransfer.getData(DRAG_TYPE);
    if (id && column.kind === 'day') setDate(id, column.day);
  }

  const renderCard = (item: TaskListItem) => {
    const id = item.task.id;
    const date = dateOf(item);
    const when = whenOf(item);
    const postponed = postponedLabel(item.task.postponeCount);
    const late = item.task.intendedDate !== null && item.task.intendedDate < today && !changed(item);
    // Sent off the board (no date, or a date after the last column): it stays here, marked.
    const away = changed(item) && planningColumnOf(date, columns, today) === -1;
    const body = (
      <span className="plan-card__text">
        <Linkified text={item.task.text || '(tarefa sem texto)'} />
        <span className="plan-card__meta">
          {item.project && <ProjectChip name={item.project.name} />}
          {postponed && <span className="muted">{postponed}</span>}
          {late && item.task.intendedDate && <span className="muted">intenção: {relativeDay(item.task.intendedDate, today)}</span>}
          {away && <span className="chip chip--warning">→ {dateLabel(date).toLowerCase()}</span>}
          {changed(item) && !away && <span className="chip chip--warning">mudou</span>}
        </span>
      </span>
    );
    if (selecting) {
      const on = selected.has(id);
      return (
        <li key={id}>
          <button type="button" className={`plan-card plan-card--select ${on ? 'plan-card--on' : ''}`} aria-pressed={on} onClick={(event) => pick(id, event)}>
            {body}
          </button>
        </li>
      );
    }
    return (
      <li
        key={id}
        className={`plan-card ${away ? 'plan-card--away' : ''}`}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData(DRAG_TYPE, id);
          event.dataTransfer.effectAllowed = 'move';
        }}
      >
        {body}
        <span className="plan-card__when">
          <select
            className={`text-input when-select ${when === target ? 'when-select--target' : when === 'none' ? 'when-select--none' : ''}`}
            value={when}
            onChange={(event) => {
              const value = event.target.value as When;
              if (value === 'none') setDate(id, null);
              else if (value === 'other') setDate(id, date !== null && date > target ? date : addDays(target, 1));
              else if (value !== 'late') setDate(id, value);
            }}
            aria-label={`Data de intenção de "${item.task.text}"`}
          >
            {dayColumns.map((column) => (
              <option key={column.day} value={column.day}>
                {dayLabel(column.day)}
              </option>
            ))}
            <option value="other">Outra data</option>
            <option value="none">Sem data</option>
            {when === 'late' && <option value="late">Atrasada</option>}
          </select>
          {when === 'other' && date && (
            <input
              type="date"
              className="date-input"
              min={today}
              value={date}
              onChange={(event) => event.target.value && setDate(id, event.target.value)}
              aria-label="Data"
            />
          )}
        </span>
      </li>
    );
  };

  return (
    <>
      <div className={`card__body checkout-step ${selecting ? 'checkout-step--batch' : ''}`}>
        <StepQuestion focusKey="planning">O que entra na nota de {label}?</StepQuestion>
        <div className="plan-intro">
          <p className="muted">
            {selecting ? 'Shift + clique seleciona um intervalo.' : 'Arraste um card para outro dia, ou mude a data no próprio card.'}
          </p>
          <IconAction
            icon="checklist"
            label={selecting ? 'Sair da seleção' : 'Selecionar várias'}
            pressed={selecting}
            onClick={selecting ? leaveSelection : () => setSelecting(true)}
          />
        </div>
        <div className="plan-board">
          {board.map(({ column, cards }, index) => {
            const all = cards.length > 0 && cards.every((item) => selected.has(item.task.id));
            const droppable = column.kind === 'day' && !selecting;
            return (
              <section
                key={column.kind === 'late' ? 'late' : column.day}
                className={`plan-column ${column.kind === 'late' ? 'plan-column--late' : ''} ${dropOn === index ? 'plan-column--drop' : ''}`}
                aria-label={columnLabel(column)}
                onDragOver={
                  droppable
                    ? (event) => {
                        if (!event.dataTransfer.types.includes(DRAG_TYPE)) return;
                        event.preventDefault();
                        setDropOn(index);
                      }
                    : undefined
                }
                onDragLeave={droppable ? () => setDropOn((current) => (current === index ? null : current)) : undefined}
                onDrop={droppable ? (event) => onDrop(event, column) : undefined}
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
      <StepFooter onBack={onBack} primary="Finalizar meu dia ✦" onPrimary={finalize} busy={busy} />
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
      {celebrating && <Fireworks onDone={finish} />}
    </>
  );
}
