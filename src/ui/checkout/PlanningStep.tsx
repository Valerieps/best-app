import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import { applyPlanning, completeCheckout, type PlanningChange } from '../../application/checkout';
import type { TaskListItem } from '../../application/queries';
import { loadPlanning } from '../../application/queries';
import { rangeBetween } from '../../domain/checkoutSteps';
import { addDays, type DayKey } from '../../domain/day';
import { Fireworks, playPlim } from '../components/Celebration';
import { ProjectChip } from '../components/Chips';
import { Linkified } from '../components/Linkified';
import { SkeletonLines } from '../components/Skeleton';
import { formatShortDate, plural, postponedLabel, relativeDay, weekdayName } from '../format';
import { navigate } from '../hooks';
import { appContext, reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';
import { StepFooter, StepQuestion, useStepKeys } from './StepParts';

interface Props {
  day: DayKey;
  target: DayKey;
  today: DayKey;
  onBack: (() => void) | null;
}

type When = 'target' | 'other' | 'none' | 'past';

/**
 * Step "Amanhã": every task carries a date, and nothing is finished here. Tasks already in the
 * target day's note, the ones scheduled for the next few days, and the other active tasks can
 * each get a new date, one by one or in a batch (spec/checkout.md, "Planejamento do dia seguinte").
 */
export function PlanningStep({ day, target, today, onBack }: Props) {
  const view = useLiveQuery(() => loadPlanning(reader, target), [target]);
  const [dates, setDates] = useState<Map<string, DayKey | null>>(new Map());
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<string | null>(null);
  const [batchDate, setBatchDate] = useState<DayKey>(addDays(target, 1));
  const [flash, setFlash] = useState('');
  const [celebrating, setCelebrating] = useState(false);
  const [busy, setBusy] = useState(false);
  const finish = useCallback(() => navigate({ name: 'day' }), []);

  const label = relativeDay(target, today);
  const Label = label.charAt(0).toUpperCase() + label.slice(1);
  const items = view ? [...view.planned, ...view.soon, ...view.others] : [];
  const ids = items.map((item) => item.task.id);
  const dateOf = (item: TaskListItem) => (dates.has(item.task.id) ? (dates.get(item.task.id) ?? null) : item.task.intendedDate);
  const whenOf = (item: TaskListItem): When => {
    const date = dateOf(item);
    if (date !== null && date < target) return 'past';
    return date === target ? 'target' : date === null ? 'none' : 'other';
  };
  const dateLabel = (date: DayKey | null) =>
    date === null ? 'Sem data' : date === target ? Label : `${weekdayName(date).slice(0, 3)}, ${formatShortDate(date)}`;
  const setDate = (id: string, date: DayKey | null) => setDates((previous) => new Map(previous).set(id, date));
  const targetCount = items.filter((item) => whenOf(item) === 'target').length;

  async function finalize() {
    if (busy || !view) return;
    setBusy(true);
    const changes: PlanningChange[] = items
      .filter((item) => dates.has(item.task.id) && dateOf(item) !== item.task.intendedDate)
      .map((item) => ({ taskId: item.task.id, date: dateOf(item) }));
    await applyPlanning(appContext, day, changes);
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

  function pickGroup(group: TaskListItem[]) {
    const groupIds = group.map((item) => item.task.id);
    const all = groupIds.every((id) => selected.has(id));
    setSelected((previous) => {
      const updated = new Set(previous);
      for (const id of groupIds) {
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

  const renderRow = (item: TaskListItem) => {
    const id = item.task.id;
    const date = dateOf(item);
    const when = whenOf(item);
    const changed = date !== item.task.intendedDate;
    const postponed = postponedLabel(item.task.postponeCount);
    const pastDate = item.task.intendedDate !== null && item.task.intendedDate < target && !changed;
    const text = (
      <span className="plan-row__text">
        <Linkified text={item.task.text || '(tarefa sem texto)'} />
        {item.project && <ProjectChip name={item.project.name} />}
        {postponed && <span className="muted">{postponed}</span>}
        {pastDate && item.task.intendedDate && <span className="muted">intenção: {relativeDay(item.task.intendedDate, today)}</span>}
        {changed && <span className="chip chip--warning">mudou</span>}
      </span>
    );
    if (selecting) {
      const on = selected.has(id);
      return (
        <li key={id}>
          <button type="button" className={`plan-row plan-row--select ${on ? 'plan-row--on' : ''}`} aria-pressed={on} onClick={(event) => pick(id, event)}>
            {text}
            <span className={`when-label when-label--${when}`}>{dateLabel(date)}</span>
          </button>
        </li>
      );
    }
    return (
      <li className="plan-row" key={id}>
        {text}
        <span className="plan-row__when">
          <select
            className={`text-input when-select when-select--${when}`}
            value={when}
            onChange={(event) => {
              const value = event.target.value as When;
              if (value === 'target') setDate(id, target);
              else if (value === 'none') setDate(id, null);
              else if (value === 'other') setDate(id, date !== null && date > target ? date : addDays(target, 1));
            }}
            aria-label={`Data de intenção de "${item.task.text}"`}
          >
            <option value="target">{Label}</option>
            <option value="other">Outra data</option>
            <option value="none">Sem data</option>
            {when === 'past' && <option value="past">Data passada</option>}
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

  const group = (title: string, list: TaskListItem[]) => {
    if (list.length === 0) return null;
    const all = list.every((item) => selected.has(item.task.id));
    return (
      <section className="checkout-group">
        <h3 className="checkout-group__title">
          {title}
          {selecting && (
            <button type="button" className="link checkout-group__pick" onClick={() => pickGroup(list)}>
              {all ? 'tirar seleção do grupo' : 'selecionar grupo'}
            </button>
          )}
        </h3>
        <ul className="plan-list">{list.map(renderRow)}</ul>
      </section>
    );
  };

  return (
    <>
      <div className={`card__body checkout-step ${selecting ? 'checkout-step--batch' : ''}`}>
        <StepQuestion focusKey="planning">O que entra na nota de {label}?</StepQuestion>
        <div className="plan-intro">
          <p className="muted">{selecting ? 'Shift + clique seleciona um intervalo.' : 'Ajuste a data de qualquer tarefa.'}</p>
          <button type="button" className={selecting ? 'primary' : ''} aria-pressed={selecting} onClick={selecting ? leaveSelection : () => setSelecting(true)}>
            {selecting ? 'Pronto' : 'Selecionar várias'}
          </button>
        </div>
        {group(`Já na nota de ${label}`, view.planned)}
        {group('Próximos dias', view.soon)}
        {group('Data já passou', view.others)}
        {items.length === 0 && <p className="muted">Nenhuma tarefa com data.</p>}
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
            <span className="muted">Levar para</span>
            <button type="button" disabled={selected.size === 0} onClick={() => applyBatch(target)}>
              {Label}
            </button>
            <span className="batch-bar__date">
              <input
                type="date"
                className="date-input"
                min={today}
                value={batchDate}
                onChange={(event) => event.target.value && setBatchDate(event.target.value)}
                aria-label="Data para as tarefas selecionadas"
              />
              <button type="button" disabled={selected.size === 0} onClick={() => applyBatch(batchDate)}>
                Nesta data
              </button>
            </span>
            <button type="button" disabled={selected.size === 0} onClick={() => applyBatch(null)}>
              Sem data
            </button>
          </span>
        </div>
      )}
      {celebrating && <Fireworks onDone={finish} />}
    </>
  );
}
