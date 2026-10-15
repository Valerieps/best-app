import { useState } from 'react';
import { setDeadline, setIntendedDate } from '../../application/dayTools';
import { abandonTask, reactivateTask, setTaskDone } from '../../application/notebook';
import { loadActiveTasks, loadArchivedTasks, type TaskListItem } from '../../application/queries';
import type { DayKey } from '../../domain/day';
import type { Section } from '../../domain/entities';
import { TASK_LIST_KEYS, groupTasks, type TaskGroupBy, type TaskListKey } from '../../domain/taskList';
import { ProjectChip } from '../components/Chips';
import { Icon } from '../components/Icon';
import { DatePicker } from '../dayNote/BlockLine';
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

function TaskRow({
  item,
  today,
  action,
  extra,
}: {
  item: TaskListItem;
  today: DayKey;
  action: React.ReactNode;
  /** Shown on hover, after the meta. */
  extra?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { task, project, origin } = item;
  const when = task.intendedDate ? relativeDay(task.intendedDate, today) : 'sem data';
  const active = task.status === 'active';
  const deadline = active && task.deadline ? `prazo ${relativeDay(task.deadline, today)}` : null;
  const meta = [active ? when : null, deadline, postponedLabel(task.postponeCount)].filter(Boolean).join(' · ');
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
        {extra}
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

const KEY_LABELS: Record<TaskListKey, string> = {
  project: 'projeto',
  intendedDate: 'data de intenção',
  createdDate: 'data de criação',
  postponeCount: 'adiamentos',
};

const VIEW_KEY = 'best-app:activeTasksView';

interface TaskListView {
  groupBy: TaskGroupBy;
  sortBy: TaskListKey;
}

const DEFAULT_VIEW: TaskListView = { groupBy: 'none', sortBy: 'intendedDate' };

function isKey(value: unknown): value is TaskListKey {
  return TASK_LIST_KEYS.includes(value as TaskListKey);
}

function readView(): TaskListView {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(VIEW_KEY) ?? '{}');
    const saved = (parsed ?? {}) as Partial<Record<keyof TaskListView, unknown>>;
    return {
      groupBy: saved.groupBy === 'none' || isKey(saved.groupBy) ? saved.groupBy : DEFAULT_VIEW.groupBy,
      sortBy: isKey(saved.sortBy) ? saved.sortBy : DEFAULT_VIEW.sortBy,
    };
  } catch {
    return DEFAULT_VIEW;
  }
}

/** How the active tasks are grouped and sorted. A convenience of this browser only. */
function useTaskListView(): [TaskListView, (view: TaskListView) => void] {
  const [view, setView] = useState(readView);
  const update = (next: TaskListView) => {
    try {
      localStorage.setItem(VIEW_KEY, JSON.stringify(next));
    } catch {
      // Nothing to do: the choice just won't be remembered.
    }
    setView(next);
  };
  return [view, update];
}

function groupTitle(groupBy: TaskListKey, key: string | null, items: TaskListItem[], today: DayKey): string {
  if (groupBy === 'project') return items[0]?.project?.name ?? 'Sem projeto';
  if (groupBy === 'postponeCount') {
    const count = Number(key);
    return count === 0 ? 'Nunca adiada' : `Adiada ${count} ${count === 1 ? 'vez' : 'vezes'}`;
  }
  if (key === null) return 'Sem data';
  const day = relativeDay(key, today);
  return day.charAt(0).toUpperCase() + day.slice(1);
}

function TaskGroupSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="active-tasks__group">
      <button type="button" className="active-tasks__toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon name={open ? 'chevronDown' : 'chevronRight'} size="sm" />
        <span className="active-tasks__group-title">{title}</span>
        <span className="badge" aria-label={`${count} ${count === 1 ? 'tarefa' : 'tarefas'}`}>
          {count}
        </span>
      </button>
      {open && children}
    </section>
  );
}

/** On hover: change the two dates, or abandon the task, with a second click to confirm. */
function ActiveTaskActions({ item, today }: { item: TaskListItem; today: DayKey }) {
  const [confirming, setConfirming] = useState(false);
  const { task } = item;
  return (
    <span className="active-tasks__actions">
      <DatePicker
        label="Mudar a data de intenção"
        className="line__action"
        value={task.intendedDate}
        min={today}
        onChange={(date) => void setIntendedDate(appContext, task.id, date)}
        clearLabel={task.intendedDate ? 'Tirar a data de intenção' : undefined}
      >
        Data
      </DatePicker>
      <DatePicker
        label="Mudar o prazo máximo"
        className="line__action"
        value={task.deadline ?? null}
        onChange={(date) => void setDeadline(appContext, task.id, date)}
        clearLabel={task.deadline ? 'Tirar o prazo máximo' : undefined}
      >
        Prazo
      </DatePicker>
      <button
        type="button"
        className={`line__action ${confirming ? 'active-tasks__abandon--confirm' : ''}`}
        onClick={() => (confirming ? void abandonTask(appContext, task.id) : setConfirming(true))}
        onBlur={() => setConfirming(false)}
        title="Tirar a tarefa de circulação sem fazer. O histórico guarda o abandono."
      >
        {confirming ? 'Confirmar abandono' : 'Abandonar'}
      </button>
    </span>
  );
}

function TaskListControls({ view, onChange }: { view: TaskListView; onChange(view: TaskListView): void }) {
  return (
    <div className="active-tasks__controls">
      <label>
        Agrupar por{' '}
        <select
          className="text-input"
          value={view.groupBy}
          onChange={(event) => onChange({ ...view, groupBy: event.target.value as TaskGroupBy })}
        >
          <option value="none">nada</option>
          {TASK_LIST_KEYS.map((key) => (
            <option key={key} value={key}>
              {KEY_LABELS[key]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Ordenar por{' '}
        <select
          className="text-input"
          value={view.sortBy}
          onChange={(event) => onChange({ ...view, sortBy: event.target.value as TaskListKey })}
        >
          {TASK_LIST_KEYS.map((key) => (
            <option key={key} value={key}>
              {KEY_LABELS[key]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function ActiveTasksScreen({ today }: { today: DayKey }) {
  const items = useLiveQuery(() => loadActiveTasks(reader));
  const [view, setView] = useTaskListView();
  if (!items) return <LoadingPage title="Tarefas ativas" />;
  const { groupBy, sortBy } = view;
  const groups = groupTasks(items, groupBy, sortBy);
  const list = (groupItems: TaskListItem[]) => (
    <ul className="card-list">
      {groupItems.map((item) => (
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
          extra={<ActiveTaskActions item={item} today={today} />}
        />
      ))}
    </ul>
  );
  return (
    <ListPage title="Tarefas ativas">
      {items.length === 0 ? (
        <p className="muted">Nenhuma tarefa ativa.</p>
      ) : (
        <>
          <TaskListControls view={view} onChange={setView} />
          {groupBy === 'none'
            ? list(groups[0]?.items ?? [])
            : groups.map((group) => (
                <TaskGroupSection
                  key={`${groupBy}:${group.key ?? ''}`}
                  title={groupTitle(groupBy, group.key, group.items, today)}
                  count={group.items.length}
                >
                  {list(group.items)}
                </TaskGroupSection>
              ))}
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
