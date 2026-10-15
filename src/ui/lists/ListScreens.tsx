import { useEffect, useState, type MouseEvent } from 'react';
import { setDeadline, setDeadlines, setIntendedDate, setIntendedDates } from '../../application/dayTools';
import { abandonTask, abandonTasks, reactivateTask, setTaskDone } from '../../application/notebook';
import { loadActiveTasks, loadArchivedTasks, type TaskListItem } from '../../application/queries';
import { rangeBetween } from '../../domain/checkoutSteps';
import { addDays, type DayKey } from '../../domain/day';
import type { Section } from '../../domain/entities';
import { TASK_LIST_KEYS, groupTasks, type TaskGroupBy, type TaskListKey } from '../../domain/taskList';
import { ProjectChip } from '../components/Chips';
import { Icon } from '../components/Icon';
import { DatePicker } from '../dayNote/BlockLine';
import { Linkified } from '../components/Linkified';
import { LoadingPage } from '../components/Skeleton';
import { formatShortDate, formatTime, plural, postponedLabel, relativeDay } from '../format';
import { routeHash } from '../hooks';
import { appContext, reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';

function originLabel(section: Section | null): string {
  if (!section) return 'Origem desconhecida';
  if (section.projectPage) return `Veio da página do projeto · ${formatShortDate(section.day)}`;
  const kind = section.kind === 'meeting' ? 'Reunião' : 'Geral';
  return `Veio de: ${kind} · ${formatTime(section.createdAt)} · ${section.title ?? 'sem título'} · ${formatShortDate(section.day)}`;
}

function ListPage({ title, className = '', children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <main className={`page ${className}`}>
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

function TaskGroupSection({
  title,
  count,
  open,
  onToggle,
  extra,
  children,
}: {
  title: string;
  count: number;
  open: boolean;
  onToggle(): void;
  /** After the toggle, such as "selecionar grupo". */
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="active-tasks__group">
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
      {open && children}
    </section>
  );
}

/** Bottom bar of the selection: the same intended date or deadline for all, or abandon them all. */
function BatchBar({ selected, today, onDone }: { selected: Set<string>; today: DayKey; onDone(message: string): void }) {
  const [intended, setIntended] = useState<DayKey>(addDays(today, 1));
  const [deadline, setDeadlineDate] = useState<DayKey>(addDays(today, 7));
  const [confirming, setConfirming] = useState(false);
  const ids = [...selected];
  const none = ids.length === 0;
  const count = plural(ids.length, 'tarefa', 'tarefas');
  const run = (work: Promise<void>, message: string) => {
    setConfirming(false);
    void work.then(() => onDone(message));
  };
  return (
    <div className="batch-bar active-tasks__batch" role="region" aria-label="Edição em lote">
      <span className="batch-bar__count">
        <b>{none ? 'Nenhuma tarefa selecionada' : plural(ids.length, 'tarefa selecionada', 'tarefas selecionadas')}</b>
      </span>
      <span className="batch-bar__actions">
        <span className="muted">Data de intenção</span>
        <input
          type="date"
          className="date-input"
          min={today}
          value={intended}
          onChange={(event) => event.target.value && setIntended(event.target.value)}
          aria-label="Data de intenção para as tarefas selecionadas"
        />
        <button
          type="button"
          disabled={none}
          onClick={() => run(setIntendedDates(appContext, ids, intended), `${count} → ${relativeDay(intended, today)}`)}
        >
          Aplicar
        </button>
        <button type="button" disabled={none} onClick={() => run(setIntendedDates(appContext, ids, null), `${count} sem data`)}>
          Sem data
        </button>
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
      <button
        type="button"
        disabled={none}
        className={confirming ? 'active-tasks__abandon--confirm' : ''}
        onClick={() => (confirming ? run(abandonTasks(appContext, ids), `${count} abandonada${ids.length === 1 ? '' : 's'}`) : setConfirming(true))}
        onBlur={() => setConfirming(false)}
      >
        {confirming ? `Confirmar abandono de ${count}` : 'Abandonar'}
      </button>
    </div>
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

function TaskListControls({
  view,
  onChange,
  children,
}: {
  view: TaskListView;
  onChange(view: TaskListView): void;
  /** Buttons on the right: collapse all, select several. */
  children?: React.ReactNode;
}) {
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
      <span className="active-tasks__controls-end">{children}</span>
    </div>
  );
}

export function ActiveTasksScreen({ today }: { today: DayKey }) {
  const items = useLiveQuery(() => loadActiveTasks(reader));
  const [view, setView] = useTaskListView();
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

  if (!items) return <LoadingPage title="Tarefas ativas" />;
  const { groupBy, sortBy } = view;
  const groups = groupTasks(items, groupBy, sortBy);
  const groupId = (key: string | null) => `${groupBy}:${key ?? ''}`;
  const shownIds = groups.flatMap((group) => group.items.map((item) => item.task.id));
  // A task that left the list (finished, abandoned) drops out of the selection.
  const stillSelected = new Set(shownIds.filter((id) => selected.has(id)));
  const allCollapsed = groups.length > 0 && groups.every((group) => collapsed.has(groupId(group.key)));

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
    const ids = groupItems.map((item) => item.task.id);
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

  const list = (groupItems: TaskListItem[]) => (
    <ul className="card-list">
      {groupItems.map((item) => {
        const id = item.task.id;
        return (
          <TaskRow
            key={id}
            item={item}
            today={today}
            action={
              selecting ? (
                <input
                  type="checkbox"
                  checked={selected.has(id)}
                  onChange={() => undefined}
                  onClick={(event) => pick(id, event)}
                  aria-label={`Selecionar "${item.task.text}"`}
                />
              ) : (
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => void setTaskDone(appContext, id, true)}
                  aria-label={`Finalizar "${item.task.text}"`}
                />
              )
            }
            extra={selecting ? undefined : <ActiveTaskActions item={item} today={today} />}
          />
        );
      })}
    </ul>
  );
  return (
    <ListPage title="Tarefas ativas" className="page--active-tasks">
      {items.length === 0 ? (
        <p className="muted">Nenhuma tarefa ativa.</p>
      ) : (
        <>
          <TaskListControls view={view} onChange={setView}>
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
          </TaskListControls>
          {selecting && (
            <p className="muted">
              {flash || 'Marque as tarefas e escolha o que fazer na barra de baixo. Shift + clique seleciona um intervalo.'}
            </p>
          )}
          {groupBy === 'none'
            ? list(groups[0]?.items ?? [])
            : groups.map((group) => {
                const all = group.items.every((item) => selected.has(item.task.id));
                return (
                  <TaskGroupSection
                    key={groupId(group.key)}
                    title={groupTitle(groupBy, group.key, group.items, today)}
                    count={group.items.length}
                    open={!collapsed.has(groupId(group.key))}
                    onToggle={() => toggleGroup(group.key)}
                    extra={
                      selecting && (
                        <button type="button" className="link" onClick={() => pickGroup(group.items)}>
                          {all ? 'tirar seleção do grupo' : 'selecionar grupo'}
                        </button>
                      )
                    }
                  >
                    {list(group.items)}
                  </TaskGroupSection>
                );
              })}
          {!selecting && <p className="muted">Toque numa tarefa para ver de onde ela veio.</p>}
        </>
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
