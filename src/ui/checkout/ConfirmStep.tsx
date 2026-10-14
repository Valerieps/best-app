import { useState } from 'react';
import { applyTriage, type TriageDecisions } from '../../application/checkout';
import type { Objective } from '../../domain/entities';
import {
  automaticToRow,
  type AutomaticItem,
  type NotesDecision,
  type NotesRow,
  type TaskDecision,
  type TaskRow,
  type TriageRow,
  type WhiteboardDecision,
} from '../../domain/triage';
import { Linkified } from '../components/Linkified';
import { FEATURES } from '../features';
import { plural, relativeDay } from '../format';
import { appContext } from '../services';
import { StepFooter, StepQuestion, useStepKeys, type Resolved, type StepProps } from './StepParts';
import { NotesRowView, rowKey, TaskRowView, WhiteboardRowView, type Decision, type ResourceOwner } from './TriageRows';

function automaticKey(item: AutomaticItem): string {
  return item.type === 'notesToWiki' ? `notes:${item.section.id}` : `task:${item.task.id}`;
}

function sameDecision(a: Decision, b: Decision): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** "Fechar" for the change field; the decision stays. */
function CloseButton({ onClick }: { onClick(): void }) {
  return (
    <button type="button" className="link confirm-item__change" onClick={onClick}>
      fechar
    </button>
  );
}

/**
 * Step "Confirmação do checkout": what happens when confirming, grouped by destination rather
 * than by section. Everything comes decided; changing an item is the exception.
 */
export function ConfirmStep({
  day,
  today,
  triage,
  projects,
  objectives,
  resolved,
  busy,
  onBack,
  onNext,
}: StepProps & { objectives: Objective[]; resolved: Resolved }) {
  const [undone, setUndone] = useState<Set<string>>(new Set());
  const [choices, setChoices] = useState<Map<string, Decision>>(new Map());
  const [taskProjects, setTaskProjects] = useState<Map<string, string | null>>(new Map());
  const [noteResources, setNoteResources] = useState<Map<string, string | null>>(new Map());
  const [open, setOpen] = useState<Set<string>>(new Set());

  const reopened = triage.automatic.filter((item) => undone.has(automaticKey(item))).map(automaticToRow);
  const rows: TriageRow[] = [...triage.rows, ...reopened];
  const automatic = triage.automatic.filter((item) => !undone.has(automaticKey(item)));
  const taskRows = rows.filter((row): row is TaskRow => row.type === 'task');
  const noteRows = rows.filter((row): row is NotesRow => row.type === 'notes');
  const leftover = rows.filter((row) => row.type === 'whiteboard');
  const autoNotes = automatic.filter((item) => item.type === 'notesToWiki');
  const autoTasks = automatic.filter((item) => item.type !== 'notesToWiki');

  const decisionOf = (row: TriageRow) => choices.get(rowKey(row)) ?? row.suggestion;
  const setDecision = (row: TriageRow, decision: Decision) => setChoices((previous) => new Map(previous).set(rowKey(row), decision));
  const toggleOpen = (key: string) =>
    setOpen((previous) => {
      const updated = new Set(previous);
      if (updated.has(key)) updated.delete(key);
      else updated.add(key);
      return updated;
    });
  const undo = (item: AutomaticItem) => {
    setUndone((previous) => new Set(previous).add(automaticKey(item)));
    setOpen((previous) => new Set(previous).add(automaticKey(item)));
  };

  const nextDay = triage.nextDay;
  const nextLabel = relativeDay(nextDay, today);
  const isNext = (decision: Decision) => typeof decision === 'object' && decision.kind === 'schedule' && decision.date === nextDay;
  const nextCount = taskRows.filter((row) => isNext(decisionOf(row))).length;
  const projectName = (id: string | null | undefined) => projects.find((project) => project.id === id)?.name;
  const resourceOwners: ResourceOwner[] = [
    ...objectives
      .filter((objective) => FEATURES.objectives && objective.status === 'active')
      .map((objective) => ({ ownerType: 'objective' as const, ownerId: objective.id, label: objective.goal })),
    ...projects
      .filter((project) => project.status === 'active')
      .map((project) => ({ ownerType: 'project' as const, ownerId: project.id, label: project.name })),
  ];

  function taskDestination(decision: TaskDecision): string {
    switch (decision.kind) {
      case 'schedule':
        return relativeDay(decision.date, today);
      case 'finish':
        return 'finalizar';
      case 'archive':
        return 'arquivar';
      case 'abandon':
        return 'abandonar';
      case 'reflection':
        return 'Revisão de Foco';
      case 'habit':
        return 'virar hábito';
    }
  }
  const notesDestination: Record<NotesDecision, string> = { wiki: 'wiki', discarded: 'descartar', weeklyReflection: 'Revisão de Foco' };

  const resolvedLines = [
    resolved.whiteboards > 0 && `${plural(resolved.whiteboards, 'quadro branco decidido', 'quadros brancos decididos')}`,
    resolved.doneNow > 0 && `${plural(resolved.doneNow, 'tarefa marcada como feita', 'tarefas marcadas como feitas')} agora`,
    resolved.attention > 0 && `${plural(resolved.attention, 'tarefa que pedia atenção decidida', 'tarefas que pediam atenção decididas')}`,
    resolved.reminders > 0 && `${plural(resolved.reminders, 'lembrete respondido', 'lembretes respondidos')}`,
  ].filter((line): line is string => Boolean(line));
  const empty = rows.length === 0 && automatic.length === 0;

  function confirm() {
    if (busy) return;
    const decisions: TriageDecisions = {
      tasks: new Map(),
      notes: new Map(),
      whiteboards: new Map(),
      taskProjects,
      noteResources: new Map(
        [...noteResources].flatMap(([sectionId, key]) => {
          if (!key) return [];
          const [ownerType, ownerId] = key.split(':') as ['objective' | 'project', string];
          return [[sectionId, { ownerType, ownerId }] as const];
        }),
      ),
    };
    for (const row of rows) {
      const decision = decisionOf(row);
      if (row.type === 'task') (decisions.tasks as Map<string, TaskDecision>).set(row.task.id, decision as TaskDecision);
      if (row.type === 'notes') (decisions.notes as Map<string, NotesDecision>).set(row.section.id, decision as NotesDecision);
      if (row.type === 'whiteboard') {
        const whiteboard = decision as WhiteboardDecision;
        const safe = whiteboard.kind === 'convert' && !whiteboard.name.trim() ? { kind: 'leaveUnlinked' as const } : whiteboard;
        (decisions.whiteboards as Map<string, WhiteboardDecision>).set(row.section.id, safe);
      }
    }
    for (const item of autoNotes) (decisions.notes as Map<string, NotesDecision>).set(item.section.id, 'wiki');
    onNext(empty ? undefined : () => applyTriage(appContext, day, decisions));
  }
  useStepKeys({ onEnter: confirm });

  return (
    <>
      <div className="card__body checkout-step">
        <StepQuestion focusKey="confirm" eyebrow="Confirmação do checkout">
          Isto acontece quando você confirmar
        </StepQuestion>
        <p className="muted">
          {empty ? 'Nada mais para decidir neste dia.' : 'Não há nada para responder aqui. Para mudar algum item, clique em “mudar” ao lado dele.'}
        </p>

        {taskRows.length > 0 && (
          <section className="confirm-group">
            <h3 className="checkout-group__title">
              {plural(nextCount, 'tarefa vai', 'tarefas vão')} para {nextLabel}
            </h3>
            <ul className="confirm-list">
              {taskRows.map((row) => {
                const key = rowKey(row);
                const decision = decisionOf(row) as TaskDecision;
                const projectId = taskProjects.has(row.task.id) ? taskProjects.get(row.task.id) : row.task.projectId;
                const changed = !sameDecision(decision, row.suggestion) || projectId !== row.task.projectId;
                if (open.has(key)) {
                  return (
                    <li className="confirm-item confirm-item--open" key={key}>
                      <TaskRowView
                        row={row}
                        decision={decision}
                        onChange={(value) => setDecision(row, value)}
                        nextDay={nextDay}
                        today={today}
                        projects={projects}
                        projectId={projectId}
                        onProjectChange={(id) => setTaskProjects((previous) => new Map(previous).set(row.task.id, id))}
                      />
                      <CloseButton onClick={() => toggleOpen(key)} />
                    </li>
                  );
                }
                const from = [row.section ? (row.section.title ?? 'Sem título') : 'De outros dias', projectName(projectId)]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <li className="confirm-item" key={key}>
                    <span className="task-box" aria-hidden="true" />
                    <span className="confirm-item__text">
                      <Linkified text={row.task.text || '(tarefa sem texto)'} />
                      <span className="confirm-item__from">{from}</span>
                    </span>
                    {!isNext(decision) && <span className="confirm-item__dest">→ {taskDestination(decision)}</span>}
                    {changed && <span className="chip chip--warning">mudou</span>}
                    <button type="button" className="link confirm-item__change" onClick={() => toggleOpen(key)}>
                      mudar
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {(noteRows.length > 0 || autoNotes.length > 0) && (
          <section className="confirm-group">
            <h3 className="checkout-group__title">As notas vão para a wiki</h3>
            <ul className="confirm-list">
              {autoNotes.map((item) => (
                <li className="confirm-item" key={automaticKey(item)}>
                  <span className="confirm-item__text">
                    <span>
                      {plural(item.noteCount, 'nota', 'notas')} de <b>{item.section.title ?? 'Sem título'}</b>
                    </span>
                    <span className="confirm-item__from">ligadas a {item.project?.name ?? 'um projeto'} · automático</span>
                  </span>
                  <button type="button" className="link confirm-item__change" onClick={() => undo(item)}>
                    mudar
                  </button>
                </li>
              ))}
              {noteRows.map((row) => {
                const key = rowKey(row);
                const decision = decisionOf(row) as NotesDecision;
                const resource = noteResources.get(row.section.id) ?? null;
                if (open.has(key)) {
                  return (
                    <li className="confirm-item confirm-item--open" key={key}>
                      <span className="confirm-item__text">
                        <b>{row.section.title ?? 'Sem título'}</b>
                      </span>
                      <NotesRowView
                        row={row}
                        decision={decision}
                        onChange={(value) => setDecision(row, value)}
                        owners={resourceOwners}
                        resourceOwner={resource}
                        onResourceChange={(owner) => setNoteResources((previous) => new Map(previous).set(row.section.id, owner))}
                      />
                      <CloseButton onClick={() => toggleOpen(key)} />
                    </li>
                  );
                }
                const project = row.section.projectId ? projectName(row.section.projectId) : null;
                return (
                  <li className="confirm-item" key={key}>
                    <span className="confirm-item__text">
                      <span>
                        {plural(row.noteCount, 'nota', 'notas')} de <b>{row.section.title ?? 'Sem título'}</b>
                      </span>
                      <span className="confirm-item__from">{project ? `ligadas a ${project}` : 'sem projeto'}</span>
                    </span>
                    {decision !== 'wiki' && <span className="confirm-item__dest">→ {notesDestination[decision]}</span>}
                    {(decision !== row.suggestion || resource) && <span className="chip chip--warning">mudou</span>}
                    <button type="button" className="link confirm-item__change" onClick={() => toggleOpen(key)}>
                      mudar
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {leftover.length > 0 && (
          <section className="confirm-group">
            <h3 className="checkout-group__title">Quadros brancos ainda sem decisão</h3>
            <ul className="confirm-list">
              {leftover.map((row) => (
                <li className="confirm-item confirm-item--open" key={rowKey(row)}>
                  <span className="confirm-item__text">
                    <b>{row.section?.title ?? 'Sem título'}</b>
                  </span>
                  <WhiteboardRowView
                    row={row}
                    decision={decisionOf(row) as WhiteboardDecision}
                    onChange={(value) => setDecision(row, value)}
                    projects={projects}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        {(autoTasks.length > 0 || resolvedLines.length > 0) && (
          <section className="confirm-group">
            <h3 className="checkout-group__title">Já resolvido</h3>
            <ul className="confirm-resolved">
              {resolvedLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
              {autoTasks.map((item) => (
                <li key={automaticKey(item)}>
                  “{item.task.text || 'tarefa sem texto'}”{' '}
                  {item.type === 'scheduledDuringDay' && item.task.intendedDate
                    ? `já tem data (${relativeDay(item.task.intendedDate, today)})`
                    : 'foi finalizada durante o dia'}{' '}
                  <button type="button" className="link confirm-item__change" onClick={() => undo(item)}>
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
