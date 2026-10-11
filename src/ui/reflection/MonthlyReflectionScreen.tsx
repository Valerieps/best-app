import { useState } from 'react';
import { closeMonth, createObjectiveFromProject, linkProjectToObjective, setMonthPriority } from '../../application/objectives';
import { setProjectFinished } from '../../application/projects';
import { loadDueMonthlyReflection, loadMonthlyReflection } from '../../application/queries';
import type { DayKey } from '../../domain/day';
import type { Project } from '../../domain/entities';
import { monthKey, shiftMonth } from '../../domain/month';
import { formatShortDate } from '../format';
import { navigate, routeHash } from '../hooks';
import { appContext, reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';

const MONTH_NAMES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return `${MONTH_NAMES[month - 1]} de ${year}`;
}

type View = 'objective' | 'project';

/** "Flow de Reflexão Mensal" (section 4): a dashboard of objectives, projects and habits. */
export function MonthlyReflectionScreen({ month, today }: { month?: string; today: DayKey }) {
  const key = month ?? shiftMonth(monthKey(today), -1);
  const view = useLiveQuery(() => loadMonthlyReflection(reader, key), [key]);
  const [mode, setMode] = useState<View>('objective');
  if (!view) return null;

  const closed = Boolean(view.reflection?.closedAt);
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
        <label className="check-row">
          <input
            type="checkbox"
            checked={view.monthPriorityIds.includes(project.id)}
            onChange={(event) => void setMonthPriority(appContext, monthKey(today), project.id, event.target.checked)}
          />
          prioridade do mês
        </label>
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
        <button type="button" className="icon-button" onClick={() => navigate({ name: 'monthReflection', month: shiftMonth(key, -1) })} aria-label="Mês anterior">
          ‹
        </button>
        <h1 className="page__title reflection__title">Reflexão mensal · {monthLabel(key)}</h1>
        <button
          type="button"
          className="icon-button"
          disabled={key >= monthKey(today)}
          onClick={() => navigate({ name: 'monthReflection', month: shiftMonth(key, 1) })}
          aria-label="Próximo mês"
        >
          ›
        </button>
      </header>
      {closed && <p className="muted">Este mês já foi fechado. Ainda dá para mudar o que quiser.</p>}

      <section className="reflection__step">
        <h2 className="reflection__step-title">Raio-x do mês</h2>
        <div className="metrics">
          <div className="metric">
            <span className="metric__value">
              {view.metrics.projectsWithoutObjective} de {view.metrics.activeProjects}
            </span>
            <span className="metric__label">projetos ativos sem objetivo</span>
          </div>
          <div className="metric">
            <span className="metric__value">{view.metrics.habitsWithoutObjective}</span>
            <span className="metric__label">hábitos sem objetivo</span>
          </div>
          <div className="metric">
            <span className="metric__value">
              {view.metrics.dayPrioritiesInMonthProjects} de {view.metrics.dayPriorities}
            </span>
            <span className="metric__label">prioridades do dia em projetos prioritários do mês</span>
          </div>
        </div>
        <p className="muted metrics__note">
          Blocos sem projeto e objetivos com pouco engajamento entram quando as perguntas em aberto da spec forem
          respondidas.
        </p>
      </section>

      {withoutObjective.length > 0 && (
        <section className="reflection__step">
          <h2 className="reflection__step-title">Sugestão de objetivos</h2>
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
        </section>
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

      <section className="reflection__step">
        <h2 className="reflection__step-title">Fechar o mês</h2>
        <button
          type="button"
          className="primary"
          disabled={closed}
          onClick={async () => {
            await closeMonth(appContext, view.month, view.metrics);
            navigate({ name: 'day' });
          }}
        >
          Fechar mês
        </button>
      </section>
    </main>
  );
}

/** Shows up in the day note when a month ended and its reflection was not closed. */
export function MonthlyReflectionBanner({ today }: { today: DayKey }) {
  const due = useLiveQuery(() => loadDueMonthlyReflection(reader, today), [today]);
  if (!due) return null;
  return (
    <div className="banner" role="status">
      <span>
        {monthLabel(due.key).replace(/^./, (letter) => letter.toUpperCase())} terminou ({formatShortDate(due.start)} a{' '}
        {formatShortDate(due.end)}). A reflexão mensal está disponível.
      </span>
      <button type="button" className="link" onClick={() => navigate({ name: 'monthReflection', month: due.key })}>
        Fazer agora
      </button>
    </div>
  );
}
