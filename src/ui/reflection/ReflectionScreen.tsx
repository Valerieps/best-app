import { useEffect, useRef, useState } from 'react';
import { reactivateTask } from '../../application/notebook';
import { setPriorityProjectInReflection } from '../../application/priorityProjects';
import { loadReflection, type ReflectionView } from '../../application/queries';
import { closeWeek, reopenWeek, resolveDeferred, saveReflectionTexts, type DeferredDecisions } from '../../application/reflection';
import { addDays, type DayKey } from '../../domain/day';
import { PRIORITY_PROJECT_LIMIT } from '../../domain/priorityProjects';
import { ProjectIconBadge } from '../projects/ProjectIcon';
import type { NotesDecision, TaskDecision, TriageRow } from '../../domain/triage';
import { defaultReflectionWeek, weekFromKey, weekOf, type WeekRange } from '../../domain/week';
import { Linkified } from '../components/Linkified';
import { NotesRowView, rowKey, TaskRowView, GroupHeader, type Decision } from '../checkout/TriageRows';
import { formatShortDate } from '../format';
import { navigate } from '../hooks';
import { appContext, reader } from '../services';
import { LoadingPage } from '../components/Skeleton';
import { useLiveQuery } from '../useLiveQuery';

interface Props {
  weekKey?: string;
  today: DayKey;
}

/** "Flow de Reflexão Semanal" (SPEC.md, section 2). */
export function ReflectionScreen({ weekKey, today }: Props) {
  const week = weekKey ? weekFromKey(weekKey) : defaultReflectionWeek(today);
  const view = useLiveQuery(() => loadReflection(reader, week, today), [week.key, today]);
  const goToWeek = (target: WeekRange) => navigate({ name: 'reflection', week: target.key });

  if (!view) return <LoadingPage title="Reflexão semanal" />;
  const closed = Boolean(view.reflection?.closedAt);
  const isCurrentOrPast = week.start <= today;

  return (
    <main className="page page--wide">
      <header className="reflection__header">
        <button type="button" className="icon-button" onClick={() => goToWeek(weekOf(addDays(week.start, -7)))} aria-label="Semana anterior">
          ‹
        </button>
        <h1 className="page__title reflection__title">
          Reflexão semanal · {formatShortDate(week.start)} a {formatShortDate(week.end)}
        </h1>
        <button
          type="button"
          className="icon-button"
          disabled={!isCurrentOrPast || weekOf(today).key === week.key}
          onClick={() => goToWeek(weekOf(addDays(week.start, 7)))}
          aria-label="Próxima semana"
        >
          ›
        </button>
      </header>
      {closed && (
        <div className="banner banner--inline" role="status">
          <span>Esta semana já foi fechada.</span>
          <button type="button" className="link" onClick={() => void reopenWeek(appContext, week)}>
            Reabrir
          </button>
        </div>
      )}

      <Step number={1} title="Triagem do que foi deixado para cá">
        <DeferredTriage rows={view.deferred} projects={view.projects} today={today} />
      </Step>

      <Step number={2} title="Tarefas arquivadas">
        {view.archived.length === 0 ? (
          <p className="muted">Nenhuma tarefa arquivada.</p>
        ) : (
          <ul className="card-list">
            {view.archived.map(({ task }) => (
              <li className="card-list__item" key={task.id}>
                <Linkified text={task.text || '(tarefa sem texto)'} />
                <button type="button" className="small" onClick={() => void reactivateTask(appContext, task.id)}>
                  Reativar
                </button>
              </li>
            ))}
          </ul>
        )}
      </Step>

      <Step number={3} title="Agregar tarefas em projetos">
        <p className="muted">
          Esta etapa espera uma decisão em aberto na spec: se o app propõe os grupos ou se você agrupa à mão. Enquanto
          isso, vincule tarefas a projetos no checkout ou na triagem acima.
        </p>
      </Step>

      <Step number={4} title="Métricas da semana">
        <div className="metrics">
          <Metric value={view.metrics.finishedTasks} label="tarefas executadas" />
          <Metric
            value={view.metrics.intentionAccuracy === null ? '—' : `${Math.round(view.metrics.intentionAccuracy * 100)}%`}
            label={`feitas no dia da intenção (${view.metrics.finishedOnIntendedDay} de ${view.metrics.finishedWithIntention})`}
          />
          <Metric value={view.metrics.postponedTasks} label="tarefas adiadas" />
        </div>
        {view.habits.length > 0 && (
          <ul className="card-list reflection__habits">
            {view.habits.map(({ habit, week: weekStats, month }) => (
              <li className="card-list__item" key={habit.id}>
                <span>{habit.name}</span>
                <span className="muted">
                  semana {weekStats.completion === null ? '—' : `${Math.round(weekStats.completion * 100)}%`} · mês{' '}
                  {month.completion === null ? '—' : `${Math.round(month.completion * 100)}%`} · maior sequência{' '}
                  {weekStats.longestStreak}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Step>

      <Step number={5} title="Melhores momentos e o que pode melhorar">
        <ReflectionTexts
          key={week.key}
          week={week}
          bestMoments={view.reflection?.bestMoments ?? ''}
          improvements={view.reflection?.improvements ?? ''}
        />
      </Step>

      <Step number={6} title="Prioridades da próxima semana">
        <PriorityProjectsStep view={view} today={today} />
        <p className="muted reflection__note">
          As tarefas prioritárias da semana esperam uma decisão em aberto na spec: quantas prioridades a semana tem.
        </p>
      </Step>

      <Step number={7} title="Fechar a semana">
        <button
          type="button"
          className="primary"
          disabled={closed}
          onClick={async () => {
            await closeWeek(appContext, week, view.metrics);
            navigate({ name: 'day' });
          }}
        >
          Fechar semana
        </button>
      </Step>
    </main>
  );
}

/**
 * Step 6: the priority projects of the week after the evaluated one. Here, and only here, a
 * project can be taken out or swapped; the list starts as the one carried over.
 */
function PriorityProjectsStep({ view, today }: { view: ReflectionView; today: DayKey }) {
  const { nextWeek, nextWeekPriorityIds: chosen } = view;
  const active = view.projects.filter((project) => project.status === 'active');
  // A week already over keeps the list it had.
  const past = nextWeek.end < today;
  const full = chosen.length >= PRIORITY_PROJECT_LIMIT;
  const ordered = [...chosen.map((id) => active.find((project) => project.id === id)!).filter(Boolean), ...active.filter((project) => !chosen.includes(project.id))];

  return (
    <div className="priority-step">
      <p className="muted">
        Projetos prioritários da semana de {formatShortDate(nextWeek.start)} a {formatShortDate(nextWeek.end)}: até {PRIORITY_PROJECT_LIMIT}.
        {' '}
        {past ? 'Essa semana já passou, então a lista fica como estava.' : `${chosen.length} de ${PRIORITY_PROJECT_LIMIT} escolhidos.`}
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
                    disabled={past || (!on && full)}
                    onChange={(event) => void setPriorityProjectInReflection(appContext, nextWeek.key, project.id, event.target.checked)}
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

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <section className="reflection__step" aria-labelledby={`step-${number}`}>
      <h2 className="reflection__step-title" id={`step-${number}`}>
        <span className="reflection__step-number">{number}</span> {title}
      </h2>
      {children}
    </section>
  );
}

function Metric({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="metric">
      <span className="metric__value">{value}</span>
      <span className="metric__label">{label}</span>
    </div>
  );
}

function DeferredTriage({ rows, projects, today }: { rows: TriageRow[]; projects: Parameters<typeof TaskRowView>[0]['projects']; today: DayKey }) {
  const [choices, setChoices] = useState<Map<string, Decision>>(new Map());
  const [taskProjects, setTaskProjects] = useState<Map<string, string | null>>(new Map());
  const [busy, setBusy] = useState(false);
  const tomorrow = addDays(today, 1);

  if (rows.length === 0) return <p className="muted">Nada foi deixado para a reflexão.</p>;
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

function ReflectionTexts({ week, bestMoments, improvements }: { week: WeekRange; bestMoments: string; improvements: string }) {
  const [texts, setTexts] = useState({ bestMoments, improvements });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(texts);
  latest.current = texts;

  // Save what is pending when leaving the screen.
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        void saveReflectionTexts(appContext, week, latest.current);
      }
    },
    [week],
  );

  const change = (field: 'bestMoments' | 'improvements', value: string) => {
    const next = { ...latest.current, [field]: value };
    setTexts(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void saveReflectionTexts(appContext, week, next);
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
