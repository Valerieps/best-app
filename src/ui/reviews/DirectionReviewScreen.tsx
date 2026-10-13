import { useState } from 'react';
import { createObjectiveFromProject, finishObjective, linkProjectToObjective, updateObjective } from '../../application/objectives';
import { setProjectFinished } from '../../application/projects';
import { loadDirectionReview } from '../../application/reviewQueries';
import { closeReview } from '../../application/reviews';
import type { DayKey } from '../../domain/day';
import type { Objective, Project } from '../../domain/entities';
import { LoadingPage } from '../components/Skeleton';
import { formatShortDate } from '../format';
import { navigate, routeHash } from '../hooks';
import { appContext, reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';
import { Metric, Step } from './ReviewParts';

type View = 'objective' | 'project';

/**
 * "Flow da Revisão de Rumo" (section 4): a dashboard of objectives, projects and habits, with the
 * raio-x since the previous Revisão de Rumo.
 */
export function DirectionReviewScreen({ today }: { today: DayKey }) {
  const view = useLiveQuery(() => loadDirectionReview(reader, today), [today]);
  const [mode, setMode] = useState<View>('objective');
  if (!view) return <LoadingPage title="Revisão de Rumo" />;

  const activeProjects = view.projects.filter((project) => project.status === 'active');
  const withoutObjective = activeProjects.filter((project) => !project.objectiveId);
  const activeObjectives = view.objectives.filter((summary) => summary.objective.status === 'active');
  const objectiveName = (id: string | null | undefined) =>
    view.objectives.find((summary) => summary.objective.id === id)?.objective.goal ?? null;

  const projectRow = (project: Project) => (
    <li className="card-list__item" key={project.id}>
      <a className="list-link" href={routeHash({ name: 'project', id: project.id })}>
        {project.name}
      </a>
      <span className="warmup__actions">
        <select
          className="text-input"
          value={project.objectiveId ?? ''}
          onChange={(event) => void linkProjectToObjective(appContext, project.id, event.target.value || null)}
          aria-label={`Objetivo de ${project.name}`}
        >
          <option value="">sem objetivo</option>
          {activeObjectives.map(({ objective }) => (
            <option key={objective.id} value={objective.id}>
              {objective.goal}
            </option>
          ))}
        </select>
        <button type="button" className="small" onClick={() => void setProjectFinished(appContext, project.id, true)}>
          Finalizar
        </button>
      </span>
    </li>
  );

  return (
    <main className="page page--wide">
      <header className="reflection__header">
        <h1 className="page__title reflection__title">Revisão de Rumo</h1>
      </header>
      <p className="muted">
        {view.since
          ? `Desde a última Revisão de Rumo, em ${formatShortDate(view.since.slice(0, 10))}.`
          : 'Esta é a primeira Revisão de Rumo: ela cobre tudo desde o começo.'}
      </p>

      <Step title="Raio-x do período">
        <div className="metrics">
          <Metric value={`${view.metrics.projectsWithoutObjective} de ${view.metrics.activeProjects}`} label="projetos ativos sem objetivo" />
          <Metric value={view.metrics.habitsWithoutObjective} label="hábitos sem objetivo" />
          <Metric
            value={`${view.metrics.dayPrioritiesInFocusProjects} de ${view.metrics.dayPriorities}`}
            label="prioridades do dia em projetos em foco"
          />
        </div>
        <p className="muted metrics__note">
          Blocos sem projeto e objetivos com pouco engajamento entram quando as perguntas em aberto da spec forem
          respondidas.
        </p>
      </Step>

      {withoutObjective.length > 0 && (
        <Step title="Sugestão de objetivos">
          <p className="muted">Projetos sem objetivo. Crie um objetivo a partir de um deles, ou ligue-o a um objetivo abaixo.</p>
          <ul className="card-list">
            {withoutObjective.map((project) => (
              <li className="card-list__item" key={project.id}>
                <span>{project.name}</span>
                <button
                  type="button"
                  className="small"
                  onClick={async () => {
                    const objective = await createObjectiveFromProject(appContext, project.id);
                    if (objective) navigate({ name: 'objective', id: objective.id });
                  }}
                >
                  Criar objetivo a partir deste projeto
                </button>
              </li>
            ))}
          </ul>
        </Step>
      )}

      {activeObjectives.length > 0 && (
        <Step title="Meta e motivação">
          <p className="muted">Para cada objetivo, releia a meta e a motivação, e decida se ele continua.</p>
          {activeObjectives.map(({ objective }) => (
            <ObjectiveRevisit key={objective.id} objective={objective} />
          ))}
        </Step>
      )}

      <section className="reflection__step">
        <div className="reflection__step-title reflection__views">
          <h2 className="reflection__step-title">Objetivos e projetos</h2>
          <span className="warmup__actions">
            <button type="button" className={`small ${mode === 'objective' ? 'primary' : ''}`} onClick={() => setMode('objective')}>
              Por objetivo
            </button>
            <button type="button" className={`small ${mode === 'project' ? 'primary' : ''}`} onClick={() => setMode('project')}>
              Por projeto
            </button>
          </span>
        </div>
        {mode === 'objective' ? (
          <>
            {activeObjectives.map(({ objective, projects, habits }) => (
              <div className="month__objective" key={objective.id}>
                <a className="list-link" href={routeHash({ name: 'objective', id: objective.id })}>
                  {objective.goal}
                </a>
                <ul className="card-list">
                  {projects.filter((project) => project.status === 'active').map(projectRow)}
                  {habits.map((habit) => (
                    <li className="card-list__item" key={habit.id}>
                      <span className="muted">hábito: {habit.name}</span>
                    </li>
                  ))}
                  {projects.length === 0 && habits.length === 0 && (
                    <li className="card-list__item muted">Nenhum projeto ou hábito ligado.</li>
                  )}
                </ul>
              </div>
            ))}
            {withoutObjective.length > 0 && (
              <div className="month__objective">
                <span className="muted">Sem objetivo</span>
                <ul className="card-list">{withoutObjective.map(projectRow)}</ul>
              </div>
            )}
          </>
        ) : (
          <ul className="card-list">
            {activeProjects.map((project) => (
              <li className="card-list__item card-list__item--stacked" key={project.id}>
                <span className="muted">{objectiveName(project.objectiveId) ? `objetivo: ${objectiveName(project.objectiveId)}` : 'sem objetivo'}</span>
                <ul className="card-list card-list--flat">{projectRow(project)}</ul>
              </li>
            ))}
          </ul>
        )}
        {activeProjects.length === 0 && <p className="muted">Nenhum projeto ativo.</p>}
      </section>

      <Step title="Fechar a revisão">
        <button
          type="button"
          className="primary"
          onClick={async () => {
            await closeReview(appContext, 'direction', view.since, view.metrics);
            navigate({ name: 'day' });
          }}
        >
          Fechar revisão
        </button>
      </Step>
    </main>
  );
}

/** One objective's goal and motivation, edited in place and saved when leaving the field. */
function ObjectiveRevisit({ objective }: { objective: Objective }) {
  const [fields, setFields] = useState({ goal: objective.goal, motivation: objective.motivation });
  const save = () => {
    const goal = fields.goal.trim();
    if (!goal) return setFields({ ...fields, goal: objective.goal });
    if (goal !== objective.goal || fields.motivation !== objective.motivation) {
      void updateObjective(appContext, objective.id, { goal, motivation: fields.motivation });
    }
  };

  return (
    <div className="month__objective reflection__texts">
      <label className="field">
        <span className="field__label">Meta</span>
        <input className="text-input" value={fields.goal} onChange={(event) => setFields({ ...fields, goal: event.target.value })} onBlur={save} />
      </label>
      <label className="field">
        <span className="field__label">Motivação</span>
        <textarea
          className="text-area"
          rows={2}
          value={fields.motivation}
          onChange={(event) => setFields({ ...fields, motivation: event.target.value })}
          onBlur={save}
        />
      </label>
      <span className="warmup__actions">
        <span className="muted">Não continua?</span>
        <button type="button" className="small" onClick={() => void finishObjective(appContext, objective.id, true)}>
          Finalizar: atingi
        </button>
        <button type="button" className="small" onClick={() => void finishObjective(appContext, objective.id, false)}>
          Finalizar: não atingi
        </button>
      </span>
    </div>
  );
}
