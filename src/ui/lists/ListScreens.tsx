import { useState } from 'react';
import { reactivateTask, setTaskDone } from '../../application/notebook';
import { loadActiveTasks, loadArchivedTasks, type TaskListItem } from '../../application/queries';
import type { DayKey } from '../../domain/day';
import type { Section } from '../../domain/entities';
import { ProjectChip } from '../components/Chips';
import { Linkified } from '../components/Linkified';
import { LoadingPage } from '../components/Skeleton';
import { formatShortDate, formatTime, postponedLabel, relativeDay } from '../format';
import { routeHash } from '../hooks';
import { appContext, reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';

function originLabel(section: Section | null): string {
  if (!section) return 'Origem desconhecida';
  if (section.projectPage) return `Veio da página do projeto · ${formatShortDate(section.day)}`;
  const kind = section.kind === 'meeting' ? 'Reunião' : 'Geral';
  return `Veio de: ${kind} · ${formatTime(section.createdAt)} · ${section.title ?? 'sem título'} · ${formatShortDate(section.day)}`;
}

function ListPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="page">
      <h1 className="page__title">{title}</h1>
      {children}
    </main>
  );
}

function TaskRow({ item, today, action }: { item: TaskListItem; today: DayKey; action: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { task, project, origin } = item;
  const when = task.intendedDate ? relativeDay(task.intendedDate, today) : 'sem data';
  const meta = [task.status === 'active' ? when : null, postponedLabel(task.postponeCount)].filter(Boolean).join(' · ');
  return (
    <li className="card-list__item card-list__item--stacked">
      <div className="task-row">
        {action}
        <button type="button" className="task-row__text" onClick={() => setOpen(!open)} aria-expanded={open}>
          <Linkified text={task.text || '(tarefa sem texto)'} />
        </button>
        <span className="list-meta">
          {project && <ProjectChip name={project.name} />}
          {meta && <span className="muted">{meta}</span>}
        </span>
      </div>
      {open && (
        <p className="muted task-row__origin">
          {originLabel(origin)}
          {origin?.notesDestination === 'wiki' && (
            <>
              {' · '}
              <a href={routeHash({ name: 'wiki', section: origin.id })}>ver na wiki</a>
            </>
          )}
        </p>
      )}
    </li>
  );
}

export function ActiveTasksScreen({ today }: { today: DayKey }) {
  const items = useLiveQuery(() => loadActiveTasks(reader));
  if (!items) return <LoadingPage title="Tarefas ativas" />;
  return (
    <ListPage title="Tarefas ativas">
      {items.length === 0 ? (
        <p className="muted">Nenhuma tarefa ativa.</p>
      ) : (
        <>
          <ul className="card-list">
            {items.map((item) => (
              <TaskRow
                key={item.task.id}
                item={item}
                today={today}
                action={
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => void setTaskDone(appContext, item.task.id, true)}
                    aria-label={`Finalizar "${item.task.text}"`}
                  />
                }
              />
            ))}
          </ul>
          <p className="muted">Toque numa tarefa para ver de onde ela veio.</p>
        </>
      )}
    </ListPage>
  );
}

export function ArchivedTasksScreen({ today }: { today: DayKey }) {
  const items = useLiveQuery(() => loadArchivedTasks(reader));
  if (!items) return <LoadingPage title="Tarefas arquivadas" />;
  return (
    <ListPage title="Tarefas arquivadas">
      {items.length === 0 ? (
        <p className="muted">Nenhuma tarefa arquivada.</p>
      ) : (
        <ul className="card-list">
          {items.map((item) => (
            <TaskRow
              key={item.task.id}
              item={item}
              today={today}
              action={
                <button type="button" className="small" onClick={() => void reactivateTask(appContext, item.task.id)}>
                  Reativar
                </button>
              }
            />
          ))}
        </ul>
      )}
    </ListPage>
  );
}
