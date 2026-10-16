import { useEffect, useState, type MouseEvent } from 'react';
import { applyTriage, defaultClosingDecisions } from '../../application/checkout';
import { groupByProject, rangeBetween } from '../../domain/checkoutSteps';
import { addDays, type DayKey } from '../../domain/day';
import type { TaskDecision, TaskRow } from '../../domain/triage';
import { Icon } from '../components/Icon';
import { IconAction } from '../components/IconAction';
import { Linkified } from '../components/Linkified';
import { formatShortDate, plural, postponedLabel, relativeDay, weekdayName } from '../format';
import { appContext } from '../services';
import { noDecisions, StepFooter, StepQuestion, useStepKeys, type StepProps } from './StepParts';

type Action = { kind: 'finish' } | { kind: 'next' } | { kind: 'date'; date: DayKey } | { kind: 'undate' } | { kind: 'abandon' };

/** How long the count of what an action did stays on screen. */
const FLASH_MS = 2500;

export function taskProjectOf(row: TaskRow): string | null {
  return row.task.projectId ?? row.section?.projectId ?? null;
}

/**
 * Step "Tarefas": every open task without a future date, and the waiting ones, grouped by
 * project in groups that collapse. Each row has its checkbox to finish it and its own actions on
 * hover; selecting rows applies the same actions in a batch. Each action is saved at once and
 * the tasks leave the list. What is left goes to the task list without a date when I move on
 * (spec/checkout.md, "Fechamento em etapas").
 */
export function TriageStep({
  day,
  today,
  triage,
  projects,
  busy,
  onBack,
  onNext,
  onApply,
}: StepProps & { onApply(apply: () => Promise<void>): Promise<void> }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string | null>>(new Set());
  const [batchDate, setBatchDate] = useState<DayKey>(addDays(triage.nextDay, 1));
  /** The row whose date field is open, from its calendar action. */
  const [dating, setDating] = useState<string | null>(null);
  const [flash, setFlash] = useState('');
  const nextLabel = relativeDay(triage.nextDay, today);
  const groups = groupByProject(triage.rows, taskProjectOf);
  const ids = groups.filter((group) => !collapsed.has(group.projectId)).flatMap((group) => group.items.map((row) => row.task.id));
  const finishedDuringDay = triage.automatic.filter((item) => item.type === 'finishedDuringDay').length;

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(''), FLASH_MS);
    return () => clearTimeout(timer);
  }, [flash]);

  function pick(id: string, event: MouseEvent) {
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

  function pickGroup(groupIds: string[]) {
    const all = groupIds.every((id) => selected.has(id));
    setSelected((previous) => {
      const updated = new Set(previous);
      for (const id of groupIds) {
        if (all) updated.delete(id);
        else updated.add(id);
      }
      return updated;
    });
  }

  function toggleGroup(projectId: string | null) {
    setCollapsed((previous) => {
      const updated = new Set(previous);
      if (updated.has(projectId)) updated.delete(projectId);
      else updated.add(projectId);
      return updated;
    });
  }

  function decisionFor(action: Action, row: TaskRow): TaskDecision {
    switch (action.kind) {
      case 'finish':
        return { kind: 'finish' };
      case 'next':
        return { kind: 'schedule', date: triage.nextDay };
      case 'date':
        return { kind: 'schedule', date: action.date };
      case 'undate':
        // Something a person owes me stays as it is, waiting, without a date to follow up.
        return row.task.waiting ? { kind: 'keep' } : { kind: 'undate' };
      case 'abandon':
        return { kind: 'abandon' };
    }
  }

  function flashText(action: Action, count: number): string {
    switch (action.kind) {
      case 'finish':
        return plural(count, 'tarefa finalizada', 'tarefas finalizadas');
      case 'next':
        return `${plural(count, 'tarefa', 'tarefas')} → ${nextLabel}`;
      case 'date':
        return `${plural(count, 'tarefa', 'tarefas')} → ${weekdayName(action.date).slice(0, 3)}, ${formatShortDate(action.date)}`;
      case 'undate':
        return `${plural(count, 'tarefa', 'tarefas')} sem data`;
      case 'abandon':
        return plural(count, 'tarefa abandonada', 'tarefas abandonadas');
    }
  }

  async function act(action: Action, chosen: TaskRow[]) {
    if (busy || chosen.length === 0) return;
    const tasks = new Map(chosen.map((row) => [row.task.id, decisionFor(action, row)]));
    await onApply(() => applyTriage(appContext, day, { ...noDecisions(), tasks }));
    setFlash(flashText(action, chosen.length));
    setSelected((previous) => {
      const updated = new Set(previous);
      for (const row of chosen) updated.delete(row.task.id);
      return updated;
    });
    setDating(null);
  }
  const actOnSelection = (action: Action) => act(action, triage.rows.filter((row) => selected.has(row.task.id)));

  function next() {
    if (busy) return;
    // What is left goes to the task list without a date, and the notes and whiteboards are settled.
    onNext(() => applyTriage(appContext, day, defaultClosingDecisions(triage)));
  }
  useStepKeys({ onEnter: next });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setSelected(new Set());
      setDating(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const projectName = (id: string | null) => (id ? (projects.find((project) => project.id === id)?.name ?? 'Projeto') : 'Sem projeto');
  const none = selected.size === 0;

  const renderRow = (row: TaskRow) => {
    const id = row.task.id;
    const on = selected.has(id);
    const postponed = postponedLabel(row.task.postponeCount);
    const deadline = row.task.deadline;
    const text = row.task.text || '(tarefa sem texto)';
    return (
      <li key={id} className={`checkout-task ${on ? 'checkout-task--on' : ''}`}>
        <input
          type="checkbox"
          checked={false}
          disabled={busy}
          onChange={() => act({ kind: 'finish' }, [row])}
          aria-label={row.task.waiting ? `Concluir "${text}"` : `Finalizar "${text}"`}
        />
        <button type="button" className={`plan-row plan-row--select ${on ? 'plan-row--on' : ''}`} aria-pressed={on} onClick={(event) => pick(id, event)}>
          <span className="plan-row__text">
            <Linkified text={text} />
            {row.task.waiting && <span className="chip chip--muted">aguardando</span>}
            {deadline && <span className={`chip ${row.attention ? 'chip--warning' : 'chip--muted'}`}>prazo: {relativeDay(deadline, today)}</span>}
            {postponed && <span className="muted">{postponed}</span>}
          </span>
          <span className="muted">{row.section ? (row.section.title ?? 'Sem título') : 'De outros dias'}</span>
        </button>
        <span className={`checkout-task__actions ${dating === id ? 'checkout-task__actions--open' : ''}`}>
          <IconAction icon="arrowRight" label={`Levar para ${nextLabel}`} disabled={busy} onClick={() => act({ kind: 'next' }, [row])} />
          {dating === id ? (
            <input
              type="date"
              className="date-input"
              min={today}
              autoFocus
              aria-label={`Data para "${text}"`}
              onChange={(event) => event.target.value && act({ kind: 'date', date: event.target.value }, [row])}
            />
          ) : (
            <IconAction icon="calendar" label="Escolher uma data" disabled={busy} onClick={() => setDating(id)} />
          )}
          <IconAction icon="calendarOff" label="Sem data: vai para a lista de tarefas" disabled={busy} onClick={() => act({ kind: 'undate' }, [row])} />
          <IconAction icon="ban" label="Abandonar" disabled={busy} onClick={() => act({ kind: 'abandon' }, [row])} />
        </span>
      </li>
    );
  };

  return (
    <>
      <div className="card__body checkout-step checkout-step--batch">
        <StepQuestion focusKey="triage">O que fazer com estas tarefas?</StepQuestion>
        <p className="muted">
          Marque as que você fez, use as ações de cada linha ou selecione várias (Shift + clique seleciona um intervalo) e
          escolha na barra. As que ficarem aqui vão para a lista de tarefas, sem data.
        </p>
        {groups.map((group) => {
          const groupIds = group.items.map((row) => row.task.id);
          const all = groupIds.every((id) => selected.has(id));
          const open = !collapsed.has(group.projectId);
          const name = projectName(group.projectId);
          return (
            <section className="checkout-group" key={group.projectId ?? 'none'}>
              <h3 className="checkout-group__title">
                <button
                  type="button"
                  className="icon-button icon-button--sm checkout-group__toggle"
                  aria-expanded={open}
                  aria-label={open ? `Recolher ${name}` : `Abrir ${name}`}
                  onClick={() => toggleGroup(group.projectId)}
                >
                  <Icon name={open ? 'chevronDown' : 'chevronRight'} size="sm" />
                </button>
                {name} <span className="muted">({group.items.length})</span>
                {open && (
                  <IconAction
                    icon="checklist"
                    label={all ? 'Tirar a seleção do grupo' : 'Selecionar o grupo'}
                    pressed={all}
                    onClick={() => pickGroup(groupIds)}
                    className="checkout-group__pick"
                  />
                )}
              </h3>
              {open && <ul className="plan-list">{group.items.map(renderRow)}</ul>}
            </section>
          );
        })}
        {triage.rows.length === 0 && <p className="muted">Nenhuma tarefa para decidir.</p>}
        {finishedDuringDay > 0 && (
          <p className="muted checkout-step__note">
            {plural(finishedDuringDay, 'tarefa finalizada', 'tarefas finalizadas')} durante o dia já{' '}
            {finishedDuringDay === 1 ? 'saiu' : 'saíram'} da triagem.
          </p>
        )}
      </div>
      <StepFooter onBack={onBack} primary="Seguir" onPrimary={next} busy={busy} />
      <div className="batch-bar" role="region" aria-label="Ações nas tarefas selecionadas">
        <span className="batch-bar__count" aria-live="polite">
          {!none ? <b>{plural(selected.size, 'tarefa selecionada', 'tarefas selecionadas')}</b> : flash ? <b className="batch-bar__flash">{flash}</b> : 'Nenhuma tarefa selecionada'}
        </span>
        <span className="batch-bar__actions">
          <IconAction icon="check" label="Finalizar" disabled={none || busy} onClick={() => actOnSelection({ kind: 'finish' })} />
          <IconAction icon="arrowRight" label={`Levar para ${nextLabel}`} disabled={none || busy} onClick={() => actOnSelection({ kind: 'next' })} />
          <span className="batch-bar__date">
            <input
              type="date"
              className="date-input"
              min={today}
              value={batchDate}
              onChange={(event) => event.target.value && setBatchDate(event.target.value)}
              aria-label="Data para as tarefas selecionadas"
            />
            <IconAction icon="calendar" label="Levar para esta data" disabled={none || busy} onClick={() => actOnSelection({ kind: 'date', date: batchDate })} />
          </span>
          <IconAction icon="calendarOff" label="Sem data: vai para a lista de tarefas" disabled={none || busy} onClick={() => actOnSelection({ kind: 'undate' })} />
          <IconAction icon="ban" label="Abandonar" disabled={none || busy} onClick={() => actOnSelection({ kind: 'abandon' })} />
        </span>
      </div>
    </>
  );
}
