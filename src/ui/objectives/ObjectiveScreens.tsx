import { useEffect, useState } from 'react';
import {
  createObjective,
  finishObjective,
  linkProjectToObjective,
  reopenObjective,
  updateObjective,
} from '../../application/objectives';
import { loadObjective, loadObjectives } from '../../application/queries';
import { plural } from '../format';
import { navigate, routeHash } from '../hooks';
import { appContext, reader } from '../services';
import { ScreenHeader } from '../components/ScreenHeader';
import { LoadingPage } from '../components/Skeleton';
import { useLiveQuery } from '../useLiveQuery';
import { Resources } from './Resources';

/** Section 4: objectives — a goal, a motivation, projects and resources. */
export function ObjectivesScreen() {
  const summaries = useLiveQuery(() => loadObjectives(reader));
  const [goal, setGoal] = useState('');
  const [motivation, setMotivation] = useState('');
  const [showFinished, setShowFinished] = useState(false);
  if (!summaries) return <LoadingPage title="Objetivos" />;
  const active = summaries.filter((summary) => summary.objective.status === 'active');
  const finished = summaries.filter((summary) => summary.objective.status === 'finished');

  const list = (items: typeof summaries) => (
    <ul className="card-list">
      {items.map(({ objective, projects, habits }) => (
        <li className="card-list__item" key={objective.id}>
          <a className="list-link" href={routeHash({ name: 'objective', id: objective.id })}>
            {objective.goal}
          </a>
          <span className="muted">
            {plural(projects.length, 'projeto', 'projetos')} · {plural(habits.length, 'hábito', 'hábitos')}
            {objective.status === 'finished' && (objective.achieved ? ' · atingido' : ' · não atingido')}
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <main className="page">
      <ScreenHeader title="Objetivos" />
      {active.length === 0 ? <p className="muted">Nenhum objetivo ativo.</p> : list(active)}
      {finished.length > 0 && (
        <>
          <button type="button" className="link projects__toggle" onClick={() => setShowFinished(!showFinished)}>
            {showFinished ? 'Esconder' : 'Mostrar'} {plural(finished.length, 'objetivo finalizado', 'objetivos finalizados')}
          </button>
          {showFinished && list(finished)}
        </>
      )}

      <form
        className="panel settings__panel objective__new"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!goal.trim()) return;
          const objective = await createObjective(appContext, goal, motivation);
          setGoal('');
          setMotivation('');
          navigate({ name: 'objective', id: objective.id });
        }}
      >
        <h2>Novo objetivo</h2>
        <label className="field">
          <span className="field__label">Meta: uma frase que você vai decidir se atingiu ou não</span>
          <input className="text-input" value={goal} onChange={(event) => setGoal(event.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">Motivação: o que faz você querer engajar com isso</span>
          <textarea className="text-area" rows={2} value={motivation} onChange={(event) => setMotivation(event.target.value)} />
        </label>
        <div className="assistant__actions">
          <button type="submit" className="primary" disabled={!goal.trim()}>
            Criar objetivo
          </button>
        </div>
      </form>
    </main>
  );
}

export function ObjectiveScreen({ id }: { id: string }) {
  const view = useLiveQuery(() => loadObjective(reader, id), [id]);
  const [goal, setGoal] = useState('');
  const [motivation, setMotivation] = useState('');
  useEffect(() => {
    if (!view) return;
    setGoal(view.objective.goal);
    setMotivation(view.objective.motivation);
  }, [view?.objective.goal, view?.objective.motivation]);

  if (view === undefined) return <LoadingPage />;
  if (view === null) {
    return (
      <main className="page">
        <p className="muted">Objetivo não encontrado.</p>
      </main>
    );
  }
  const { objective } = view;
  const save = () => void updateObjective(appContext, objective.id, { goal, motivation });

  return (
    <main className="page">
      <button type="button" className="link" onClick={() => navigate({ name: 'objectives' })}>
        ← Objetivos
      </button>
      <div className="project__header">
        <input className="project__name" value={goal} onChange={(event) => setGoal(event.target.value)} onBlur={save} aria-label="Meta" />
      </div>
      <label className="field">
        <span className="field__label">Motivação</span>
        <textarea className="text-area" rows={2} value={motivation} onChange={(event) => setMotivation(event.target.value)} onBlur={save} />
      </label>

      <div className="objective__status">
        {objective.status === 'active' ? (
          <>
            <span className="muted">Finalizar:</span>
            <button type="button" onClick={() => void finishObjective(appContext, objective.id, true)}>
              Atingi a meta
            </button>
            <button type="button" onClick={() => void finishObjective(appContext, objective.id, false)}>
              Não atingi
            </button>
          </>
        ) : (
          <>
            <span className="muted">Finalizado · {objective.achieved ? 'meta atingida' : 'meta não atingida'}</span>
            <button type="button" onClick={() => void reopenObjective(appContext, objective.id)}>
              Reabrir
            </button>
          </>
        )}
      </div>

      <h2 className="section-title">Projetos</h2>
      {view.projects.length === 0 ? (
        <p className="muted">Nenhum projeto ligado a este objetivo.</p>
      ) : (
        <ul className="card-list">
          {view.projects.map((project) => (
            <li className="card-list__item" key={project.id}>
              <a className="list-link" href={routeHash({ name: 'project', id: project.id })}>
                {project.name}
              </a>
              <button type="button" className="line__action" onClick={() => void linkProjectToObjective(appContext, project.id, null)}>
                Desvincular
              </button>
            </li>
          ))}
        </ul>
      )}
      {view.unlinkedProjects.length > 0 && (
        <select
          className="text-input objective__link"
          value=""
          onChange={(event) => event.target.value && void linkProjectToObjective(appContext, event.target.value, objective.id)}
          aria-label="Ligar um projeto"
        >
          <option value="">Ligar um projeto sem objetivo…</option>
          {view.unlinkedProjects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      )}

      <h2 className="section-title">Hábitos</h2>
      {view.habits.length === 0 ? (
        <p className="muted">
          Nenhum hábito. Ligue hábitos a este objetivo em <a href={routeHash({ name: 'habits' })}>Hábitos</a>.
        </p>
      ) : (
        <ul className="card-list">
          {view.habits.map((habit) => (
            <li className="card-list__item" key={habit.id}>
              {habit.name}
            </li>
          ))}
        </ul>
      )}

      <h2 className="section-title">Recursos</h2>
      <Resources owner={{ ownerType: 'objective', ownerId: objective.id }} resources={view.resources} />
    </main>
  );
}
