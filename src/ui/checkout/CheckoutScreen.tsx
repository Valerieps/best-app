import { useCallback, useEffect, useMemo, useState } from 'react';
import { applyPlanning, applyTriage, completeCheckout, type TriageDecisions } from '../../application/checkout';
import { answerReminder, snoozeReminder } from '../../application/dayOpening';
import { loadDayTriage, loadPlanning, loadReminderQuestions } from '../../application/queries';
import { askAgainAt } from '../../domain/dayFlow';
import { ReminderQuestions, type ReminderChoice } from './ReminderQuestions';
import type { DayKey } from '../../domain/day';
import type { Objective, Project, Reminder } from '../../domain/entities';
import {
  automaticToRow,
  type AutomaticItem,
  type DayTriage,
  type NotesDecision,
  type TaskDecision,
  type TriageRow,
  type WhiteboardDecision,
} from '../../domain/triage';
import { Fireworks, playPlim } from '../components/Celebration';
import { ProjectChip } from '../components/Chips';
import { Linkified } from '../components/Linkified';
import { LoadingPage, SkeletonLines } from '../components/Skeleton';
import { formatLongDate, plural, postponedLabel, relativeDay } from '../format';
import { navigate } from '../hooks';
import { appContext, reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';
import { FEATURES } from '../features';
import {
  GroupHeader,
  NotesRowView,
  rowKey,
  TaskRowView,
  WhiteboardRowView,
  type Decision,
  type ResourceOwner,
} from './TriageRows';

interface Props {
  day: DayKey;
  today: DayKey;
}

/** Turns the `objective:id` / `project:id` keys chosen in the rows into resource owners. */
function resourceDecisions(choices: Map<string, string | null>) {
  const owners = new Map<string, { ownerType: 'objective' | 'project'; ownerId: string }>();
  for (const [sectionId, key] of choices) {
    if (!key) continue;
    const [ownerType, ownerId] = key.split(':') as ['objective' | 'project', string];
    owners.set(sectionId, { ownerType, ownerId });
  }
  return owners;
}

function automaticKey(item: AutomaticItem): string {
  return item.type === 'notesToWiki' ? `notes:${item.section.id}` : `task:${item.task.id}`;
}

function automaticLabel(item: AutomaticItem, today: DayKey): string {
  if (item.type === 'notesToWiki') {
    const name = item.project?.name ?? item.section.title ?? 'sem título';
    return `Notas de “${name}” foram para a wiki, ligadas ao projeto`;
  }
  if (item.type === 'scheduledDuringDay' && item.task.intendedDate) {
    return `“${item.task.text}” já tem data (${relativeDay(item.task.intendedDate, today)}) e saiu da triagem`;
  }
  return `“${item.task.text}” foi finalizada durante o dia e saiu da triagem`;
}

/** Groups consecutive rows that came from the same section. */
function groupRows(rows: TriageRow[]): TriageRow[][] {
  const groups: TriageRow[][] = [];
  for (const row of rows) {
    const last = groups.at(-1);
    if (last && last[0].section?.id === row.section?.id) last.push(row);
    else groups.push([row]);
  }
  return groups;
}

export function CheckoutScreen({ day, today }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [triage, setTriage] = useState<DayTriage | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [undone, setUndone] = useState<Set<string>>(new Set());
  const [choices, setChoices] = useState<Map<string, Decision>>(new Map());
  const [taskProjects, setTaskProjects] = useState<Map<string, string | null>>(new Map());
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [reminderChoices, setReminderChoices] = useState<Map<string, ReminderChoice>>(new Map());
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [noteResources, setNoteResources] = useState<Map<string, string | null>>(new Map());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // A snapshot: the triage does not change under the user's hands while choosing.
    loadDayTriage(reader, day, today).then(setTriage);
    reader.projects().then(setProjects);
    reader.objectives().then(setObjectives);
    loadReminderQuestions(reader, day).then(setReminders);
  }, [day, today]);

  const rows = useMemo(() => {
    if (!triage) return [];
    const reopened = triage.automatic.filter((item) => undone.has(automaticKey(item))).map(automaticToRow);
    return [...triage.rows, ...reopened];
  }, [triage, undone]);

  if (!triage) return <LoadingPage title={`Checkout · ${formatLongDate(day)}`} />;
  const automatic = triage.automatic.filter((item) => !undone.has(automaticKey(item)));
  const attention = rows.filter((row) => row.attention);
  const suggestions = rows.filter((row) => !row.attention);
  const decisionOf = (row: TriageRow) => choices.get(rowKey(row)) ?? row.suggestion;
  const setDecision = (row: TriageRow, decision: Decision) =>
    setChoices((previous) => new Map(previous).set(rowKey(row), decision));
  const resourceOwners: ResourceOwner[] = [
    ...objectives
      .filter((objective) => FEATURES.objectives && objective.status === 'active')
      .map((objective) => ({ ownerType: 'objective' as const, ownerId: objective.id, label: objective.goal })),
    ...projects
      .filter((project) => project.status === 'active')
      .map((project) => ({ ownerType: 'project' as const, ownerId: project.id, label: project.name })),
  ];

  async function accept() {
    if (!triage) return;
    const decisions: TriageDecisions = {
      tasks: new Map(),
      notes: new Map(),
      whiteboards: new Map(),
      taskProjects,
      noteResources: resourceDecisions(noteResources),
    };
    for (const row of rows) {
      const decision = decisionOf(row);
      if (row.type === 'task') (decisions.tasks as Map<string, TaskDecision>).set(row.task.id, decision as TaskDecision);
      if (row.type === 'notes') (decisions.notes as Map<string, NotesDecision>).set(row.section.id, decision as NotesDecision);
      if (row.type === 'whiteboard') {
        const whiteboard = decision as WhiteboardDecision;
        // A conversion without a name falls back to leaving the section unlinked.
        const safe = whiteboard.kind === 'convert' && !whiteboard.name.trim() ? { kind: 'leaveUnlinked' as const } : whiteboard;
        (decisions.whiteboards as Map<string, WhiteboardDecision>).set(row.section.id, safe);
      }
    }
    for (const item of automatic) {
      if (item.type === 'notesToWiki') (decisions.notes as Map<string, NotesDecision>).set(item.section.id, 'wiki');
    }
    setBusy(true);
    try {
      await applyTriage(appContext, day, decisions);
      for (const [id, choice] of reminderChoices) {
        if (choice.kind === 'drop') await answerReminder(appContext, id, 'dropped');
        if (choice.kind === 'change') await snoozeReminder(appContext, id, askAgainAt(new Date(), choice.time));
      }
      setStep(2);
    } finally {
      setBusy(false);
    }
  }

  const renderGroups = (list: TriageRow[]) =>
    groupRows(list).map((group) => (
      <div className="triage-group" key={rowKey(group[0])}>
        <GroupHeader row={group[0]} />
        {group.map((row) => {
          const key = rowKey(row);
          if (row.type === 'task') {
            return (
              <TaskRowView
                key={key}
                row={row}
                decision={decisionOf(row) as TaskDecision}
                onChange={(decision) => setDecision(row, decision)}
                nextDay={triage.nextDay}
                today={today}
                projects={projects}
                projectId={taskProjects.has(row.task.id) ? taskProjects.get(row.task.id) : row.task.projectId}
                onProjectChange={(projectId) => setTaskProjects((previous) => new Map(previous).set(row.task.id, projectId))}
              />
            );
          }
          if (row.type === 'notes') {
            return (
              <NotesRowView
                key={key}
                row={row}
                decision={decisionOf(row) as NotesDecision}
                onChange={(decision) => setDecision(row, decision)}
                owners={resourceOwners}
                resourceOwner={noteResources.get(row.section.id) ?? null}
                onResourceChange={(owner) => setNoteResources((previous) => new Map(previous).set(row.section.id, owner))}
              />
            );
          }
          return (
            <WhiteboardRowView
              key={key}
              row={row}
              decision={decisionOf(row) as WhiteboardDecision}
              onChange={(decision) => setDecision(row, decision)}
              projects={projects}
            />
          );
        })}
      </div>
    ));

  const nextLabel = relativeDay(triage.nextDay, today);

  return (
    <main className="page page--wide">
      <div className="card">
        <header className="card__header">
          <button type="button" className="icon-button" onClick={() => navigate({ name: 'day' })} aria-label="Voltar para a nota do dia">
            ←
          </button>
          <h1 className="card__title">Checkout · {formatLongDate(day)}</h1>
          <ol className="steps">
            <li className={step === 1 ? 'steps__current' : ''}>1 Triagem</li>
            <li aria-hidden="true">›</li>
            <li className={step === 2 ? 'steps__current' : ''}>2 {nextLabel.charAt(0).toUpperCase() + nextLabel.slice(1)}</li>
          </ol>
        </header>

        {step === 1 ? (
          <>
            <div className="card__body">
              {rows.length === 0 && automatic.length === 0 ? (
                <p className="muted">Nada para triar neste dia.</p>
              ) : (
                <p className="muted">
                  {plural(rows.length + automatic.length, 'item', 'itens')} · {plural(suggestions.length, 'com sugestão', 'com sugestão')} ·{' '}
                  {plural(attention.length, 'pede atenção', 'pedem atenção')}
                </p>
              )}
              {attention.length > 0 && (
                <>
                  <h2 className="card__subtitle">Pedem atenção</h2>
                  <div className="triage-attention">{renderGroups(attention)}</div>
                </>
              )}
              {suggestions.length > 0 && (
                <>
                  <h2 className="card__subtitle">Sugestões</h2>
                  {renderGroups(suggestions)}
                </>
              )}
              <ReminderQuestions
                reminders={reminders}
                choices={reminderChoices}
                onChange={(id, choice) => setReminderChoices((previous) => new Map(previous).set(id, choice))}
              />
              {automatic.length > 0 && (
                <>
                  <h2 className="card__subtitle">Já resolvido automaticamente</h2>
                  <ul className="card-list">
                    {automatic.map((item) => (
                      <li className="card-list__item" key={automaticKey(item)}>
                        <span>
                          <span className="check-mark" aria-hidden="true">✓</span> {automaticLabel(item, today)}
                        </span>
                        <button
                          type="button"
                          className="link"
                          onClick={() => setUndone((previous) => new Set(previous).add(automaticKey(item)))}
                        >
                          desfazer
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <footer className="card__footer">
              <span className="muted">
                {attention.length > 0
                  ? `Confira ${plural(attention.length, 'o item destacado', 'os itens destacados')}; o resto já está decidido`
                  : 'Tudo já tem destino sugerido'}
              </span>
              <button type="button" className="primary" onClick={accept} disabled={busy}>
                {rows.length + automatic.length === 0 ? 'Continuar' : 'Confirmar decisões'}
              </button>
            </footer>
          </>
        ) : (
          <PlanningStep
            day={day}
            target={triage.nextDay}
            today={today}
            onBack={() => {
              // The triage was applied; show what is left, if anything.
              setUndone(new Set());
              setChoices(new Map());
              setTaskProjects(new Map());
              loadDayTriage(reader, day, today).then(setTriage);
              setStep(1);
            }}
          />
        )}
      </div>
    </main>
  );
}

interface PlanningProps {
  day: DayKey;
  target: DayKey;
  today: DayKey;
  onBack(): void;
}

/** Step 2: choose, among the active tasks, what goes into the next day's note. */
function PlanningStep({ day, target, today, onBack }: PlanningProps) {
  const view = useLiveQuery(() => loadPlanning(reader, target), [target]);
  const [toggles, setToggles] = useState<Map<string, boolean>>(new Map());
  const [celebrating, setCelebrating] = useState(false);
  const [busy, setBusy] = useState(false);
  const finish = useCallback(() => navigate({ name: 'day' }), []);

  if (!view) return <SkeletonLines />;
  const isChecked = (id: string, planned: boolean) => toggles.get(id) ?? planned;
  const toggle = (id: string, checked: boolean) => setToggles((previous) => new Map(previous).set(id, checked));
  const plannedCount =
    view.planned.filter((item) => isChecked(item.task.id, true)).length +
    view.others.filter((item) => isChecked(item.task.id, false)).length;
  const label = relativeDay(target, today);

  async function finalize() {
    setBusy(true);
    const changes = [...toggles].map(([taskId, include]) => ({ taskId, include }));
    await applyPlanning(appContext, day, target, changes);
    await completeCheckout(appContext, day);
    playPlim();
    setCelebrating(true);
  }

  const renderItem = (item: (typeof view.planned)[number], planned: boolean) => {
    const postponed = postponedLabel(item.task.postponeCount);
    const meta = planned
      ? postponed
      : [item.task.intendedDate ? `intenção: ${relativeDay(item.task.intendedDate, today)}` : 'sem data', postponed]
          .filter(Boolean)
          .join(' · ');
    return (
      <li className="card-list__item" key={item.task.id}>
        <label className="check-row">
          <input
            type="checkbox"
            checked={isChecked(item.task.id, planned)}
            onChange={(event) => toggle(item.task.id, event.target.checked)}
          />
          <Linkified text={item.task.text || '(tarefa sem texto)'} />
        </label>
        <span className="list-meta">
          {item.project && <ProjectChip name={item.project.name} />}
          {meta && <span className="muted">{meta}</span>}
        </span>
      </li>
    );
  };

  return (
    <>
      <div className="card__body">
        <h2 className="card__subtitle">
          Na nota de {label} ({plannedCount})
        </h2>
        {view.planned.length > 0 ? (
          <ul className="card-list">{view.planned.map((item) => renderItem(item, true))}</ul>
        ) : (
          <p className="muted">Nenhuma tarefa ainda. Marque abaixo o que entra na nota de {label}.</p>
        )}
        {view.others.length > 0 && (
          <>
            <h2 className="card__subtitle">Outras tarefas ativas</h2>
            <ul className="card-list">{view.others.map((item) => renderItem(item, false))}</ul>
          </>
        )}
      </div>
      <footer className="card__footer card__footer--end">
        <button type="button" onClick={onBack}>
          Voltar
        </button>
        <button type="button" className="primary" onClick={finalize} disabled={busy}>
          Finalizar meu dia ✦
        </button>
      </footer>
      {celebrating && <Fireworks onDone={finish} />}
    </>
  );
}
