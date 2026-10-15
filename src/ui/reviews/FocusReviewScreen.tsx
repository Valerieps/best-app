import { useEffect, useRef, useState } from 'react';
import { setFocusProjectInReview } from '../../application/focusProjects';
import { setProjectFinished } from '../../application/projects';
import { loadFocusReview, type FocusReviewView } from '../../application/reviewQueries';
import { closeReview, resolveDeferred, saveFocusTexts, type DeferredDecisions } from '../../application/reviews';
import { addDays, type DayKey } from '../../domain/day';
import { FOCUS_PROJECT_LIMIT } from '../../domain/focusProjects';
import type { NotesDecision, TaskDecision, TriageRow } from '../../domain/triage';
import { NotesRowView, rowKey, TaskRowView, GroupHeader, type Decision } from '../checkout/TriageRows';
import { LoadingPage } from '../components/Skeleton';
import { formatShortDate } from '../format';
import { navigate, routeHash } from '../hooks';
import { ProjectIconBadge } from '../projects/ProjectIcon';
import { appContext, reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';
import { FEATURES } from '../features';
import { Metric, Step } from './ReviewParts';

/** "Flow da Revisão de Foco" (spec/rituais.md): the review of the projects, since the previous one. */
export function FocusReviewScreen({ today }: { today: DayKey }) {
  const view = useLiveQuery(() => loadFocusReview(reader, today), [today]);
  if (!view) return <LoadingPage title="Revisão de Foco" />;

  return (
    <main className="page page--wide">
      <header className="reflection__header">
        <h1 className="page__title reflection__title">Revisão de Foco</h1>
      </header>
      <p className="muted">
        {view.since
          ? `Desde a última Revisão de Foco, em ${formatShortDate(view.since.slice(0, 10))}.`
          : 'Esta é a primeira Revisão de Foco: ela cobre tudo desde o começo.'}
      </p>

      <Step number={1} title="Triagem do que foi deixado para cá">
        <DeferredTriage rows={view.deferred} projects={view.projects} today={today} />
      </Step>

      <Step number={2} title="Projetos ativos">
        <ActiveProjectsStep view={view} />
      </Step>

      <Step number={3} title="Agregar tarefas em projetos">
        <p className="muted">
          Esta etapa espera uma decisão em aberto na spec: se o app propõe os grupos ou se você agrupa à mão. Enquanto
          isso, vincule tarefas a projetos ao fechar o dia ou na triagem acima.
        </p>
      </Step>

      <Step number={4} title="Métricas do período">
        <div className="metrics">
          <Metric value={view.metrics.finishedTasks} label="tarefas executadas" />
          <Metric
            value={view.metrics.intentionAccuracy === null ? '—' : `${Math.round(view.metrics.intentionAccuracy * 100)}%`}
            label={`feitas no dia da intenção (${view.metrics.finishedOnIntendedDay} de ${view.metrics.finishedWithIntention})`}
          />
          <Metric value={view.metrics.postponedTasks} label="tarefas adiadas" />
        </div>
        {FEATURES.habits && view.habits.length > 0 && (
          <ul className="card-list reflection__habits">
            {view.habits.map(({ habit, stats }) => (
              <li className="card-list__item" key={habit.id}>
                <span>{habit.name}</span>
                <span className="muted">
                  {stats.completion === null ? '—' : `${Math.round(stats.completion * 100)}%`} no período · maior sequência{' '}
                  {stats.longestStreak}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Step>

      <Step number={5} title="Melhores momentos e o que pode melhorar">
        <FocusTexts bestMoments={view.review?.bestMoments ?? ''} improvements={view.review?.improvements ?? ''} />
      </Step>

      <Step number={6} title="Projetos em foco">
        <FocusProjectsStep view={view} />
      </Step>

      <Step number={7} title="Fechar a revisão">
        <button
          type="button"
          className="primary"
          onClick={async () => {
            await closeReview(appContext, 'focus', view.since, view.metrics);
            navigate({ name: 'day' });
          }}
        >
          Fechar revisão
        </button>
      </Step>
    </main>
  );
}

/** Step 3: each active project continues or is finished; the stalled ones come first. */
function ActiveProjectsStep({ view }: { view: FocusReviewView }) {
  if (view.activeProjects.length === 0) return <p className="muted">Nenhum projeto ativo.</p>;
  return (
    <ul className="card-list">
      {view.activeProjects.map(({ project, stalledDays }) => (
        <li className="card-list__item" key={project.id}>
          <a className="list-link" href={routeHash({ name: 'project', id: project.id })}>
            <ProjectIconBadge project={project} size="sm" /> {project.name}
          </a>
          <span className="warmup__actions">
            {stalledDays !== null && <span className="muted">Parado há {stalledDays} dias</span>}
            <button type="button" className="small" onClick={() => void setProjectFinished(appContext, project.id, true)}>
              Finalizar
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Step 7: the projects in focus. Here, and only here, a project can be taken out or swapped. */
function FocusProjectsStep({ view }: { view: FocusReviewView }) {
  const chosen = view.focusIds;
  const active = view.projects.filter((project) => project.status === 'active');
  const full = chosen.length >= FOCUS_PROJECT_LIMIT;
  const ordered = [
    ...chosen.map((id) => active.find((project) => project.id === id)!).filter(Boolean),
    ...active.filter((project) => !chosen.includes(project.id)),
  ];

  return (
    <div className="priority-step">
      <p className="muted">
        Até {FOCUS_PROJECT_LIMIT} projetos, que valem até a próxima Revisão de Foco. {chosen.length} de {FOCUS_PROJECT_LIMIT}{' '}
        escolhidos.
      </p>
      {active.length === 0 ? (
        <p className="muted">Nenhum projeto ativo.</p>
      ) : (
        <ul className="card-list">
          {ordered.map((project) => {
            const on = chosen.includes(project.id);
            return (
              <li className="card-list__item" key={project.id}>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={!on && full}
                    onChange={(event) => void setFocusProjectInReview(appContext, project.id, event.target.checked)}
                  />
                  <ProjectIconBadge project={project} size="sm" />
                  {project.name}
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function DeferredTriage({ rows, projects, today }: { rows: TriageRow[]; projects: Parameters<typeof TaskRowView>[0]['projects']; today: DayKey }) {
  const [choices, setChoices] = useState<Map<string, Decision>>(new Map());
  const [taskProjects, setTaskProjects] = useState<Map<string, string | null>>(new Map());
  const [busy, setBusy] = useState(false);
  const tomorrow = addDays(today, 1);

  if (rows.length === 0) return <p className="muted">Nada foi deixado para a Revisão de Foco.</p>;
  const decisionOf = (row: TriageRow) => choices.get(rowKey(row)) ?? row.suggestion;

  async function accept() {
    const decisions: DeferredDecisions = { tasks: new Map(), notes: new Map(), taskProjects };
    for (const row of rows) {
      const decision = decisionOf(row);
      if (row.type === 'task') (decisions.tasks as Map<string, TaskDecision>).set(row.task.id, decision as TaskDecision);
      if (row.type === 'notes') (decisions.notes as Map<string, NotesDecision>).set(row.section.id, decision as NotesDecision);
    }
    setBusy(true);
    try {
      await resolveDeferred(appContext, decisions as DeferredDecisions);
      setChoices(new Map());
      setTaskProjects(new Map());
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {rows.map((row) => (
        <div className="triage-group" key={rowKey(row)}>
          <GroupHeader row={row} />
          {row.type === 'task' ? (
            <TaskRowView
              row={row}
              decision={decisionOf(row) as TaskDecision}
              onChange={(decision) => setChoices((previous) => new Map(previous).set(rowKey(row), decision))}
              nextDay={tomorrow}
              today={today}
              projects={projects}
              projectId={taskProjects.has(row.task.id) ? taskProjects.get(row.task.id) : row.task.projectId}
              onProjectChange={(projectId) => setTaskProjects((previous) => new Map(previous).set(row.task.id, projectId))}
              allowReflection={false}
            />
          ) : (
            <NotesRowView
              row={row}
              decision={decisionOf(row) as NotesDecision}
              onChange={(decision) => setChoices((previous) => new Map(previous).set(rowKey(row), decision))}
              allowReflection={false}
            />
          )}
        </div>
      ))}
      <div className="assistant__actions">
        <button type="button" className="primary" onClick={accept} disabled={busy}>
          Confirmar decisões
        </button>
      </div>
    </>
  );
}

function FocusTexts({ bestMoments, improvements }: { bestMoments: string; improvements: string }) {
  const [texts, setTexts] = useState({ bestMoments, improvements });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(texts);
  latest.current = texts;

  // Save what is pending when leaving the screen.
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        void saveFocusTexts(appContext, latest.current);
      }
    },
    [],
  );

  const change = (field: 'bestMoments' | 'improvements', value: string) => {
    const next = { ...latest.current, [field]: value };
    setTexts(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void saveFocusTexts(appContext, next);
    }, 600);
  };

  return (
    <div className="reflection__texts">
      <label className="field">
        <span className="field__label">Melhores momentos</span>
        <textarea className="text-area" rows={3} value={texts.bestMoments} onChange={(event) => change('bestMoments', event.target.value)} />
      </label>
      <label className="field">
        <span className="field__label">O que pode melhorar</span>
        <textarea className="text-area" rows={3} value={texts.improvements} onChange={(event) => change('improvements', event.target.value)} />
      </label>
    </div>
  );
}
