import { useEffect, useState } from 'react';
import { setTaskDone } from '../../application/notebook';
import { renameProject, setProjectFinished } from '../../application/projects';
import { linkProjectToObjective, setMonthPriority } from '../../application/objectives';
import { loadProject, loadProjectResources, loadProjects } from '../../application/queries';
import type { DayKey } from '../../domain/day';
import { monthKey } from '../../domain/month';
import { Resources } from '../objectives/Resources';
import { Linkified } from '../components/Linkified';
import { LoadingPage } from '../components/Skeleton';
import { formatShortDate, formatTime, plural, postponedLabel, relativeDay } from '../format';
import { navigate, routeHash } from '../hooks';
import { appContext, reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';

/** Projects (section 2): a collection of tasks; finished only by hand. */
export function ProjectsScreen() {
  const summaries = useLiveQuery(() => loadProjects(reader));
  const [showFinished, setShowFinished] = useState(false);
  if (!summaries) return <LoadingPage title="Projetos" />;
  const active = summaries.filter((summary) => summary.project.status === 'active');
  const finished = summaries.filter((summary) => summary.project.status === 'finished');

  const list = (items: typeof summaries) => (
    <ul className="card-list">
      {items.map(({ project, activeTasks, doneTasks }) => (
        <li className="card-list__item" key={project.id}>
          <a className="list-link" href={routeHash({ name: 'project', id: project.id })}>
            {project.name}
          </a>
          <span className="muted">
            {plural(activeTasks, 'tarefa ativa', 'tarefas ativas')} · {plural(doneTasks, 'feita', 'feitas')}
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <main className="page">
      <h1 className="page__title">Projetos</h1>
      {active.length === 0 ? (
        <p className="muted">
          Nenhum projeto ativo. Projetos nascem de seções: dê um título à seção e escolha “Criar o projeto”.
        </p>
      ) : (
        list(active)
      )}
      {finished.length > 0 && (
        <>
          <button type="button" className="link projects__toggle" onClick={() => setShowFinished(!showFinished)}>
            {showFinished ? 'Esconder' : 'Mostrar'} {plural(finished.length, 'projeto finalizado', 'projetos finalizados')}
          </button>
          {showFinished && list(finished)}
        </>
      )}
    </main>
  );
}

export function ProjectScreen({ id, today }: { id: string; today: DayKey }) {
  const view = useLiveQuery(() => loadProject(reader, id), [id]);
  const objectives = useLiveQuery(() => reader.objectives()) ?? [];
  const currentMonth = monthKey(today);
  const monthPriorities = useLiveQuery(async () => (await reader.priorityList(`month:${currentMonth}`))?.itemIds ?? [], [currentMonth]) ?? [];
  const resources = useLiveQuery(() => loadProjectResources(reader, id), [id]) ?? [];
  const [name, setName] = useState('');
  useEffect(() => {
    if (view) setName(view.project.name);
  }, [view?.project.name]);

  const back = (
    <button type="button" className="link" onClick={() => navigate({ name: 'projects' })}>
      ← Projetos
    </button>
  );
  if (view === undefined) return <LoadingPage before={back} />;
  if (view === null) {
    return (
      <main className="page">
        <p className="muted">Projeto não encontrado.</p>
      </main>
    );
  }
  const { project } = view;
  const finished = project.status === 'finished';

  return (
    <main className="page">
      {back}
      <div className="project__header">
        <input
          className="project__name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => void renameProject(appContext, project.id, name)}
          aria-label="Nome do projeto"
        />
        <button type="button" onClick={() => void setProjectFinished(appContext, project.id, !finished)}>
          {finished ? 'Reabrir projeto' : 'Finalizar projeto'}
        </button>
      </div>
      {finished && project.finishedAt && (
        <p className="muted">Finalizado em {formatShortDate(project.finishedAt.slice(0, 10))}.</p>
      )}

      <div className="settings__row">
        <select
          className="text-input"
          value={project.objectiveId ?? ''}
          onChange={(event) => void linkProjectToObjective(appContext, project.id, event.target.value || null)}
          aria-label="Objetivo do projeto"
        >
          <option value="">sem objetivo</option>
          {objectives
            .filter((objective) => objective.status === 'active' || objective.id === project.objectiveId)
            .map((objective) => (
              <option key={objective.id} value={objective.id}>
                Objetivo: {objective.goal}
              </option>
            ))}
        </select>
        <label className="check-row">
          <input
            type="checkbox"
            checked={monthPriorities.includes(project.id)}
            onChange={(event) => void setMonthPriority(appContext, currentMonth, project.id, event.target.checked)}
          />
          prioridade do mês
        </label>
      </div>

      <h2 className="card__subtitle">
        Tarefas ativas <span className="muted">({view.activeTasks.length} · {plural(view.doneTasks, 'feita', 'feitas')})</span>
      </h2>
      {view.activeTasks.length === 0 ? (
        <p className="muted">Nenhuma tarefa ativa.</p>
      ) : (
        <ul className="card-list">
          {view.activeTasks.map(({ task }) => (
            <li className="card-list__item" key={task.id}>
              <label className="check-row">
                <input type="checkbox" checked={false} onChange={() => void setTaskDone(appContext, task.id, true)} />
                <Linkified text={task.text || '(tarefa sem texto)'} />
              </label>
              <span className="muted">
                {[task.intendedDate ? relativeDay(task.intendedDate, today) : 'sem data', postponedLabel(task.postponeCount)]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </li>
          ))}
        </ul>
      )}

      <h2 className="card__subtitle">Recursos</h2>
      <Resources owner={{ ownerType: 'project', ownerId: project.id }} resources={resources} />

      <h2 className="card__subtitle">Notas</h2>
      {view.notes.length === 0 ? (
        <p className="muted">As notas de seções deste projeto aparecem aqui depois do checkout.</p>
      ) : (
        <ul className="card-list">
          {view.notes.map(({ section, notes }) => (
            <li className="card-list__item card-list__item--stacked" key={section.id}>
              <span className="muted">
                {formatShortDate(section.day)} · {formatTime(section.createdAt)} · {section.kind === 'meeting' ? 'Reunião' : 'Geral'}
              </span>
              {notes.map((note) => (
                <p className="wiki__note" key={note.id}>
                  <Linkified text={note.text} />
                </p>
              ))}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
