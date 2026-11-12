import { useEffect, useState, type MouseEvent } from 'react';
import { setDeadlines } from '../../application/dayTools';
import { abandonTasks } from '../../application/notebook';
import { loadActiveTasks, loadFinishedTasks, loadTaskListContext, type TaskListItem } from '../../application/queries';
import { rangeBetween } from '../../domain/checkoutSteps';
import { addDays, type DayKey } from '../../domain/day';
import type { Project } from '../../domain/entities';
import { TASK_LIST_KEYS, creationDay, filterByProject, groupTasks, type TaskGroupBy, type TaskListKey, type TaskSortKey } from '../../domain/taskList';
import { ColumnsMenu, FiltersMenu } from './TaskTableMenus';
import { COLUMN_LABELS, DEFAULT_VIEW, parseView, sortByColumn, type TaskColumn, type TaskListView, type TaskShow } from './taskTableView';
import { AbandonAction } from '../components/AbandonAction';
import { ProjectChip } from '../components/Chips';
import { Icon } from '../components/Icon';
import { Linkified } from '../components/Linkified';
import { TaskText } from '../taskDetails/TaskText';
import { ScreenHeader } from '../components/ScreenHeader';
import { LoadingPage } from '../components/Skeleton';
import { plural, relativeDay } from '../format';
import { TaskActionButtons, TaskCheckbox } from '../tasks/TaskControls';
import { taskActions, taskText } from '../tasks/taskSurface';
import { routeHash } from '../hooks';
import { appContext, reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';

function ListPage({ title, className = '', children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <main className={`page ${className}`}>
      <ScreenHeader title={title} />
      {children}
    </main>
  );
}

const KEY_LABELS: Record<TaskListKey, string> = {
  project: 'projeto',
  createdDate: 'data de criação',
};

const VIEW_KEY = 'best-app:activeTasksView';

function readView(): TaskListView {
  try {
    return parseView(localStorage.getItem(VIEW_KEY));
  } catch {
    return DEFAULT_VIEW;
  }
}

/** How the tasks table is grouped, sorted, filtered and which columns it shows. A convenience of this browser only. */
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
  const day = relativeDay(key ?? '', today);
  return day.charAt(0).toUpperCase() + day.slice(1);
}

/** A group of the table: a header row that opens and closes it, then its tasks. */
function TaskGroupRows({
  title,
  count,
  open,
  onToggle,
  colSpan,
  extra,
  children,
}: {
  title: string;
  count: number;
  open: boolean;
  onToggle(): void;
  colSpan: number;
  /** After the toggle, such as "selecionar grupo". */
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <tbody className="task-table__group">
      <tr className="task-table__group-row">
        <td colSpan={colSpan}>
          <div className="active-tasks__group-head">
            <button type="button" className="active-tasks__toggle" aria-expanded={open} onClick={onToggle}>
              <Icon name={open ? 'chevronDown' : 'chevronRight'} size="sm" />
              <span className="active-tasks__group-title">{title}</span>
              <span className="badge" aria-label={plural(count, 'tarefa', 'tarefas')}>
                {count}
              </span>
            </button>
            {extra}
          </div>
        </td>
      </tr>
      {open && children}
    </tbody>
  );
}
/** Bottom bar of the selection: the same deadline for all, or abandon them all. */
function BatchBar({ selected, today, onDone }: { selected: Set<string>; today: DayKey; onDone(message: string): void }) {
  const [deadline, setDeadlineDate] = useState<DayKey>(addDays(today, 7));
  const ids = [...selected];
  const none = ids.length === 0;
  const count = plural(ids.length, 'tarefa', 'tarefas');
  const run = (work: Promise<void>, message: string) => {
    void work.then(() => onDone(message));
  };
  return (
    <div className="batch-bar active-tasks__batch" role="region" aria-label="Edição em lote">
      <span className="batch-bar__count">
        <b>{none ? 'Nenhuma tarefa selecionada' : plural(ids.length, 'tarefa selecionada', 'tarefas selecionadas')}</b>
      </span>
      <span className="batch-bar__actions">
        <span className="muted">Prazo</span>
        <input
          type="date"
          className="date-input"
          value={deadline}
          onChange={(event) => event.target.value && setDeadlineDate(event.target.value)}
          aria-label="Prazo máximo para as tarefas selecionadas"
        />
        <button
          type="button"
          disabled={none}
          onClick={() => run(setDeadlines(appContext, ids, deadline), `${count} com prazo ${relativeDay(deadline, today)}`)}
        >
          Aplicar
        </button>
        <button type="button" disabled={none} onClick={() => run(setDeadlines(appContext, ids, null), `${count} sem prazo`)}>
          Tirar prazo
        </button>
      </span>
      <AbandonAction
        count={count}
        disabled={none}
        onAbandon={() => run(abandonTasks(appContext, ids), `${count} abandonada${ids.length === 1 ? '' : 's'}`)}
      />
    </div>
  );
}

/** The hover actions of a task in a list: the table, or the "Fila de execução". */
export function ActiveTaskActions({
  item,
  today,
  projects,
  surface,
  inQueue = false,
}: {
  item: TaskListItem;
  today: DayKey;
  projects: Project[];
  surface: 'table' | 'queue';
  /** Whether the task is in the "Fila de execução": "Adicionar à fila" shows "Na fila". */
  inQueue?: boolean;
}) {
  const actions = taskActions(item.task, surface, { hasProject: Boolean(item.project), projectChoices: projects.length });
  return (
    <span className="active-tasks__actions">
      <TaskActionButtons task={item.task} today={today} actions={actions} isQueued={inQueue} projects={projects} />
    </span>
  );
}

function TaskTableControls({
  view,
  onChange,
  show,
  onShow,
  projects,
  count,
  children,
}: {
  view: TaskListView;
  onChange(view: TaskListView): void;
  show: TaskShow;
  onShow(show: TaskShow): void;
  projects: Project[];
  /** Tasks in the table, after the filters. */
  count: number;
  /** Buttons before the menus: collapse all, select several. */
  children?: React.ReactNode;
}) {
  return (
    <div className="active-tasks__controls">
      <span className="task-table__count">{plural(count, 'tarefa', 'tarefas')}</span>
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
      <span className="active-tasks__controls-end">
        {children}
        <FiltersMenu view={view} onChange={onChange} show={show} onShow={onShow} projects={projects} />
        <ColumnsMenu view={view} onChange={onChange} />
      </span>
    </div>
  );
}

/** A column header that sorts the table; a second click reverses the order. */
function SortHeader({ column, view, onChange }: { column: TaskSortKey; view: TaskListView; onChange(view: TaskListView): void }) {
  const on = view.sortBy === column;
  const direction = on ? (view.direction === 'asc' ? 'ascending' : 'descending') : 'none';
  return (
    <th scope="col" aria-sort={direction} className={`task-table__th task-table__th--${column}`}>
      <button
        type="button"
        className={`task-table__sort ${on ? 'task-table__sort--on' : ''}`}
        onClick={() => onChange(sortByColumn(view, column))}
        title={on ? 'Inverter a ordem' : `Ordenar por ${COLUMN_LABELS[column].toLowerCase()}`}
      >
        {COLUMN_LABELS[column]}
        {on && <Icon name={view.direction === 'asc' ? 'arrowDown' : 'arrowUp'} size="sm" />}
      </button>
    </th>
  );
}

/** One cell of an optional column. */
function ColumnCell({ column, item, today, selecting }: { column: TaskColumn; item: TaskListItem; today: DayKey; selecting: boolean }) {
  const { task, project } = item;
  const active = task.status === 'active';
  const dash = <span className="muted">—</span>;
  let content: React.ReactNode;
  if (column === 'deadline') {
    content = active && task.deadline ? relativeDay(task.deadline, today) : dash;
  } else if (column === 'project') {
    content = project ? <ProjectChip name={project.name} href={selecting ? undefined : routeHash({ name: 'project', id: project.id })} /> : dash;
  } else if (column === 'createdDate') {
    content = relativeDay(creationDay(task), today);
  }
  return <td className={`task-table__td task-table__td--${column}`}>{content}</td>;
}

export function ActiveTasksScreen({ today }: { today: DayKey }) {
  const openItems = useLiveQuery(() => loadActiveTasks(reader));
  const doneItems = useLiveQuery(() => loadFinishedTasks(reader));
  const context = useLiveQuery(() => loadTaskListContext(reader));
  const [view, setView] = useTaskListView();
  const [show, setShow] = useState<TaskShow>('open');
  // Keys as `${groupBy}:${key}`, so switching the grouping never carries a collapse over.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<string | null>(null);
  const [flash, setFlash] = useState('');

  function leaveSelection() {
    setSelecting(false);
    setSelected(new Set());
    setAnchor(null);
    setFlash('');
  }

  useEffect(() => {
    if (!selecting) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') leaveSelection();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selecting]);

  if (!openItems || !doneItems || !context) return <LoadingPage title="Tarefas" />;
  const { groupBy, sortBy, direction, columns } = view;
  // A project that is no longer active drops out of the menu, so its filter would hide everything.
  const project =
    view.project.startsWith('project:') && !context.activeProjects.some((item) => `project:${item.id}` === view.project) ? 'all' : view.project;
  const allItems = show === 'open' ? openItems : show === 'done' ? doneItems : [...openItems, ...doneItems];
  const items = filterByProject(allItems, project, context.focusIds);
  const groups = groupTasks(items, groupBy, sortBy, direction);
  const groupId = (key: string | null) => `${groupBy}:${key ?? ''}`;
  const queueSet = new Set(context.queueIds);
  const isOpen = (item: TaskListItem) => item.task.status === 'active';
  // Only open tasks can be selected: the batch actions are for them.
  const shownIds = groups.flatMap((group) => group.items.filter(isOpen).map((item) => item.task.id));
  // A task that left the list (finished, abandoned) drops out of the selection.
  const stillSelected = new Set(shownIds.filter((id) => selected.has(id)));
  const allCollapsed = groups.length > 0 && groups.every((group) => collapsed.has(groupId(group.key)));
  const colSpan = 2 + columns.length;

  function toggleGroup(key: string | null) {
    const id = groupId(key);
    setCollapsed((previous) => {
      const updated = new Set(previous);
      if (updated.has(id)) updated.delete(id);
      else updated.add(id);
      return updated;
    });
  }

  function toggleAll() {
    setCollapsed(allCollapsed ? new Set() : new Set(groups.map((group) => groupId(group.key))));
  }

  function pick(id: string, event: MouseEvent) {
    setFlash('');
    if (event.shiftKey && anchor) {
      const range = rangeBetween(shownIds, anchor, id);
      setSelected((previous) => new Set([...previous, ...range]));
    } else {
      setSelected((previous) => {
        const updated = new Set(previous);
        if (updated.has(id)) updated.delete(id);
        else updated.add(id);
        return updated;
      });
    }
    setAnchor(id);
  }

  function pickGroup(groupItems: TaskListItem[]) {
    const ids = groupItems.filter(isOpen).map((item) => item.task.id);
    const all = ids.every((id) => selected.has(id));
    setSelected((previous) => {
      const updated = new Set(previous);
      for (const id of ids) {
        if (all) updated.delete(id);
        else updated.add(id);
      }
      return updated;
    });
    setFlash('');
  }

  const rows = (groupItems: TaskListItem[]) =>
    groupItems.map((item) => {
      const id = item.task.id;
      const open = isOpen(item);
      const picking = selecting && open;
      const on = picking && selected.has(id);
      return (
        <tr
          key={id}
          className={`task-table__row ${open ? '' : 'active-tasks__row--done'} ${picking ? 'active-tasks__row--select' : ''} ${on ? 'active-tasks__row--on' : ''}`}
          onClick={picking ? (event) => pick(id, event) : undefined}
        >
          <td className="task-table__td task-table__td--check">
            {!picking && (
              <TaskCheckbox task={item.task} disabled={selecting} />
            )}
          </td>
          <td className="task-table__td task-table__td--text">
            <div className="task-row">
              {picking ? (
                <button type="button" className="task-row__text" aria-pressed={on}>
                  <Linkified text={taskText(item.task)} />
                </button>
              ) : (
                <span className="task-row__text">
                  <TaskText taskId={item.task.id} text={item.task.text} />
                </span>
              )}
              {!selecting && open && <ActiveTaskActions item={item} today={today} projects={context.activeProjects} surface="table" inQueue={queueSet.has(id)} />}
            </div>
          </td>
          {columns.map((column) => (
            <ColumnCell key={column} column={column} item={item} today={today} selecting={selecting} />
          ))}
        </tr>
      );
    });

  return (
    <ListPage title="Tarefas" className="page--active-tasks">
      {openItems.length === 0 && doneItems.length === 0 ? (
        <p className="muted">Nenhuma tarefa ainda.</p>
      ) : (
        <div className="task-table__panel">
          <TaskTableControls
            view={view}
            onChange={setView}
            show={show}
            onShow={setShow}
            projects={context.activeProjects}
            count={items.length}
          >
            {groupBy !== 'none' && (
              <button type="button" className="small" onClick={toggleAll}>
                {allCollapsed ? 'Abrir todos' : 'Recolher todos'}
              </button>
            )}
            <button
              type="button"
              className={`small ${selecting ? 'primary' : ''}`}
              aria-pressed={selecting}
              onClick={selecting ? leaveSelection : () => setSelecting(true)}
            >
              {selecting ? 'Pronto' : 'Selecionar várias'}
            </button>
          </TaskTableControls>
          {selecting && <p className="muted">{flash || 'Shift + clique seleciona um intervalo.'}</p>}
          <table className="task-table">
            <thead>
              <tr>
                <th scope="col" className="task-table__th task-table__th--check" aria-label="Concluída" />
                <SortHeader column="text" view={view} onChange={setView} />
                {columns.map((column) => (
                  <SortHeader key={column} column={column} view={view} onChange={setView} />
                ))}
              </tr>
            </thead>
            {groupBy === 'none' ? (
              <tbody>{rows(groups[0]?.items ?? [])}</tbody>
            ) : (
              groups.map((group) => {
                const all = group.items.filter(isOpen).every((item) => selected.has(item.task.id));
                return (
                  <TaskGroupRows
                    key={groupId(group.key)}
                    title={groupTitle(groupBy, group.key, group.items, today)}
                    count={group.items.length}
                    open={!collapsed.has(groupId(group.key))}
                    onToggle={() => toggleGroup(group.key)}
                    colSpan={colSpan}
                    extra={
                      selecting &&
                      group.items.some(isOpen) && (
                        <button type="button" className="link" onClick={() => pickGroup(group.items)}>
                          {all ? 'tirar seleção do grupo' : 'selecionar grupo'}
                        </button>
                      )
                    }
                  >
                    {rows(group.items)}
                  </TaskGroupRows>
                );
              })
            )}
          </table>
          {items.length === 0 && (
            <p className="muted task-table__empty">
              {allItems.length === 0
                ? show === 'done'
                  ? 'Nenhuma tarefa concluída.'
                  : 'Nenhuma tarefa por fazer.'
                : project === 'focus' && context.focusIds.length === 0
                  ? 'Nenhum projeto em foco.'
                  : 'Nenhuma tarefa com esses filtros.'}
            </p>
          )}
        </div>
      )}
      {selecting && (
        <BatchBar
          selected={stillSelected}
          today={today}
          onDone={(message) => {
            setSelected(new Set());
            setAnchor(null);
            setFlash(message);
          }}
        />
      )}
    </ListPage>
  );
}
