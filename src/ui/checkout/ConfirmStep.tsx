import { useState } from 'react';
import { applyTriage, defaultClosingDecisions } from '../../application/checkout';
import { automaticTaskDecision, automaticToRow, type TaskAutomaticItem, type TaskDecision, type TaskRow } from '../../domain/triage';
import { Linkified } from '../components/Linkified';
import { plural, relativeDay } from '../format';
import { appContext } from '../services';
import { StepFooter, StepQuestion, useStepKeys, type Resolved, type StepProps } from './StepParts';
import { TaskRowView } from './TriageRows';

function sameDecision(a: TaskDecision, b: TaskDecision): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Step "Confirmação do fechamento": what happens when confirming. The tasks rolling over on their
 * own sit in a collapsed group, with their number; opening it lets me finish or change any of
 * them. Notes and whiteboards only show as a line: they no longer pass through the closing.
 */
export function ConfirmStep({ day, today, triage, projects, resolved, busy, onBack, onNext }: StepProps & { resolved: Resolved }) {
  const [choices, setChoices] = useState<Map<string, TaskDecision>>(new Map());
  const [taskProjects, setTaskProjects] = useState<Map<string, string | null>>(new Map());
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [undone, setUndone] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);

  const nextDay = triage.nextDay;
  const nextLabel = relativeDay(nextDay, today);
  const rolled = triage.automatic.filter((item): item is TaskAutomaticItem & { type: 'rolledOver' } => item.type === 'rolledOver');
  const settledDuringDay = triage.automatic.filter(
    (item): item is TaskAutomaticItem => item.type === 'finishedDuringDay' || item.type === 'scheduledDuringDay',
  );
  const reopened = settledDuringDay.filter((item) => undone.has(item.task.id)).map((item) => automaticToRow(item, nextDay));
  const kept = settledDuringDay.filter((item) => !undone.has(item.task.id));
  const whiteboards = triage.automatic.filter((item) => item.type === 'whiteboardUnlinked').length;
  // Rows left from the attention step, if any, and the automatic decisions reopened here.
  const rows: TaskRow[] = [...triage.rows, ...reopened];

  const decisionOf = (id: string, fallback: TaskDecision) => choices.get(id) ?? fallback;
  const setDecision = (id: string, decision: TaskDecision) => setChoices((previous) => new Map(previous).set(id, decision));
  const projectOf = (row: TaskRow) => (taskProjects.has(row.task.id) ? taskProjects.get(row.task.id) : row.task.projectId);
  const toggle = (id: string) =>
    setOpen((previous) => {
      const updated = new Set(previous);
      if (updated.has(id)) updated.delete(id);
      else updated.add(id);
      return updated;
    });
  const projectName = (id: string | null | undefined) => projects.find((project) => project.id === id)?.name;
  const stillRolling = rolled.filter((item) => {
    const decision = decisionOf(item.task.id, automaticTaskDecision(item, nextDay));
    return decision.kind === 'schedule' && decision.date === nextDay;
  }).length;

  function destination(decision: TaskDecision): string {
    switch (decision.kind) {
      case 'schedule':
        return relativeDay(decision.date, today);
      case 'finish':
        return 'finalizar';
      case 'undate':
        return 'sem data';
      case 'abandon':
        return 'abandonar';
      case 'reflection':
        return 'Revisão de Foco';
      case 'habit':
        return 'virar hábito';
      case 'keep':
        return 'deixar como está';
    }
  }

  const renderTask = (row: TaskRow) => {
    const id = row.task.id;
    const decision = decisionOf(id, row.suggestion);
    const projectId = projectOf(row);
    if (open.has(id)) {
      return (
        <li className="confirm-item confirm-item--open" key={id}>
          <TaskRowView
            row={row}
            decision={decision}
            onChange={(value) => setDecision(id, value)}
            nextDay={nextDay}
            today={today}
            projects={projects}
            projectId={projectId}
            onProjectChange={(value) => setTaskProjects((previous) => new Map(previous).set(id, value))}
          />
          <button type="button" className="link confirm-item__change" onClick={() => toggle(id)}>
            fechar
          </button>
        </li>
      );
    }
    const changed = !sameDecision(decision, row.suggestion) || projectId !== row.task.projectId;
    const from = [row.section ? (row.section.title ?? 'Sem título') : 'De outros dias', projectName(projectId)].filter(Boolean).join(' · ');
    const isNext = decision.kind === 'schedule' && decision.date === nextDay;
    return (
      <li className="confirm-item" key={id}>
        <span className="task-box" aria-hidden="true" />
        <span className="confirm-item__text">
          <Linkified text={row.task.text || '(tarefa sem texto)'} />
          <span className="confirm-item__from">{from}</span>
        </span>
        {!isNext && <span className="confirm-item__dest">→ {destination(decision)}</span>}
        {changed && <span className="chip chip--warning">mudou</span>}
        <button type="button" className="link confirm-item__change" onClick={() => toggle(id)}>
          mudar
        </button>
      </li>
    );
  };

  const resolvedLines = [
    resolved.doneNow > 0 && `${plural(resolved.doneNow, 'tarefa marcada como feita', 'tarefas marcadas como feitas')} agora`,
    resolved.attention > 0 && plural(resolved.attention, 'tarefa que pedia decisão decidida', 'tarefas que pediam decisão decididas'),
    resolved.reminders > 0 && plural(resolved.reminders, 'lembrete respondido', 'lembretes respondidos'),
    whiteboards > 0 &&
      `${plural(whiteboards, 'seção em quadro branco fica', 'seções em quadro branco ficam')} sem projeto; o assistente “Seções soltas” cuida delas depois`,
  ].filter((line): line is string => Boolean(line));
  const empty = rolled.length === 0 && rows.length === 0 && kept.length === 0 && resolvedLines.length === 0;

  function confirm() {
    if (busy) return;
    const decisions = defaultClosingDecisions(triage);
    for (const item of reopened) decisions.tasks.set(item.task.id, item.suggestion);
    for (const [id, decision] of choices) decisions.tasks.set(id, decision);
    const nothing = decisions.tasks.size + decisions.notes.size + decisions.whiteboards.size + taskProjects.size === 0;
    onNext(nothing ? undefined : () => applyTriage(appContext, day, { ...decisions, taskProjects }));
  }
  useStepKeys({ onEnter: confirm });

  return (
    <>
      <div className="card__body checkout-step">
        <StepQuestion focusKey="confirm" eyebrow="Confirmação do fechamento">
          Isto acontece quando você confirmar
        </StepQuestion>
        <p className="muted">
          {empty ? 'Nada mais para decidir neste dia.' : 'Não há nada para responder aqui. Para mudar algum item, clique em “mudar” ao lado dele.'}
        </p>

        {rolled.length > 0 && (
          <section className="confirm-group">
            <h3 className="checkout-group__title">
              {plural(stillRolling, 'tarefa vai sozinha', 'tarefas vão sozinhas')} para {nextLabel}
              <button type="button" className="link checkout-group__pick" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
                {expanded ? 'recolher' : 'ver e mudar'}
              </button>
            </h3>
            {expanded && <ul className="confirm-list">{rolled.map((item) => renderTask(automaticToRow(item, nextDay)))}</ul>}
          </section>
        )}

        {rows.length > 0 && (
          <section className="confirm-group">
            <h3 className="checkout-group__title">Desfeitas ou ainda sem decisão</h3>
            <ul className="confirm-list">{rows.map(renderTask)}</ul>
          </section>
        )}

        {(kept.length > 0 || resolvedLines.length > 0) && (
          <section className="confirm-group">
            <h3 className="checkout-group__title">Já resolvido</h3>
            <ul className="confirm-resolved">
              {resolvedLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
              {kept.map((item) => (
                <li key={item.task.id}>
                  “{item.task.text || 'tarefa sem texto'}”{' '}
                  {item.type === 'scheduledDuringDay' && item.task.intendedDate
                    ? `já tem data (${relativeDay(item.task.intendedDate, today)})`
                    : 'foi finalizada durante o dia'}{' '}
                  <button
                    type="button"
                    className="link confirm-item__change"
                    onClick={() => {
                      setUndone((previous) => new Set(previous).add(item.task.id));
                      setOpen((previous) => new Set(previous).add(item.task.id));
                    }}
                  >
                    desfazer
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <StepFooter onBack={onBack} primary={empty ? 'Seguir' : 'Confirmar'} onPrimary={confirm} busy={busy} />
    </>
  );
}
