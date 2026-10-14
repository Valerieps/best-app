import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react';
import { setDayPriority, setDeadline, setIntendedDate } from '../../application/dayTools';
import { setTaskDone, updateBlockText } from '../../application/notebook';
import { createProjectTask, renameProject, setProjectIcon } from '../../application/projects';
import { loadDayPriorities, loadProject, loadProjectResources } from '../../application/queries';
import { setProjectPanelPinned } from '../../application/settings';
import { type DayKey } from '../../domain/day';
import type { Block } from '../../domain/entities';
import { agendaDays, groupProjectTasks, stuckReason } from '../../domain/projectPage';
import { BlockLine, DatePicker, type LineHandlers } from '../dayNote/BlockLine';
import { requestFocus } from '../dayNote/focus';
import { Icon } from '../components/Icon';
import { Linkified } from '../components/Linkified';
import { LoadingPage } from '../components/Skeleton';
import { agendaDate, formatLongDate, formatShortDate, formatTime, plural, stuckReasonLabel } from '../format';
import { navigate, routeHash } from '../hooks';
import { appContext, reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';
import { enqueue } from '../writeQueue';
import { ProjectActionsMenu } from './ProjectActions';
import { ProjectIconPicker } from './ProjectIcon';
import { panelOnOpen } from './panelState';
import { ProjectSidePanel } from './ProjectSidePanel';

function write(work: () => Promise<unknown>) {
  enqueue(work).catch(() => {
    // Logged by the queue; the screen shows the saved state again on its own.
  });
}

/** Below this width the docked column would squeeze the tasks, so it only opens over them. */
const NARROW_QUERY = '(max-width: 900px)';

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW_QUERY).matches);
  useEffect(() => {
    const query = window.matchMedia(NARROW_QUERY);
    const onChange = () => setNarrow(query.matches);
    // Some browsers and emulators only fire `resize`, so listen to both.
    query.addEventListener('change', onChange);
    window.addEventListener('resize', onChange);
    return () => {
      query.removeEventListener('change', onChange);
      window.removeEventListener('resize', onChange);
    };
  }, []);
  return narrow;
}

/** "Nova tarefa", always above the tabs: Enter creates the task and keeps the field for the next one. */
function NewTaskField({ projectId }: { projectId: string }) {
  const [text, setText] = useState('');
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      const typed = text;
      setText('');
      write(() => createProjectTask(appContext, projectId, typed));
    } else if (event.key === 'Escape') {
      setText('');
      event.currentTarget.blur();
    }
  };
  return (
    <label className="new-task">
      <Icon name="plus" size="sm" />
      <input
        className="new-task__input"
        value={text}
        placeholder="Nova tarefa"
        aria-label="Nova tarefa do projeto"
        onChange={(event) => setText(event.target.value)}
        onKeyDown={onKeyDown}
      />
    </label>
  );
}

/** A group with a counter that can be folded: "Sem data" (open at first) and "Feitas" (closed). */
function FoldedGroup({ label, count, initiallyOpen, className, children }: { label: string; count: number; initiallyOpen: boolean; className: string; children: ReactNode }) {
  const [open, setOpen] = useState(initiallyOpen);
  if (count === 0) return null;
  return (
    <section className={`task-group ${className}`} aria-label={label}>
      <button type="button" className="task-group__toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon name={open ? 'chevronDown' : 'chevronRight'} size="sm" />
        {label} <span className="task-group__count">{count}</span>
      </button>
      {open && children}
    </section>
  );
}

export function ProjectScreen({ id, tab, today }: { id: string; tab: 'tasks' | 'notes'; today: DayKey }) {
  const view = useLiveQuery(() => loadProject(reader, id), [id]);
  const objectives = useLiveQuery(() => reader.objectives()) ?? [];
  const resources = useLiveQuery(() => loadProjectResources(reader, id), [id]) ?? [];
  const dayPriorities = useLiveQuery(() => loadDayPriorities(reader, today), [today]) ?? [];
  const pinned = useLiveQuery(async () => (await reader.settings())?.projectPanelPinned ?? false) ?? false;
  const narrow = useNarrow();
  const [peek, setPeek] = useState(false);
  const [name, setName] = useState('');
  useEffect(() => {
    if (view) setName(view.project.name);
  }, [view?.project.name]);

  const opening = panelOnOpen(pinned, narrow);
  const docked = opening === 'docked';
  const panelShown = docked || peek;

  // Pinned on a narrow screen, the column opens over the tasks on its own, like peeking; Escape
  // or a click outside closes it, as when peeking.
  useEffect(() => {
    if (opening === 'peek') setPeek(true);
  }, [opening]);

  // A peeking column closes on Escape and on a click outside it (or its toggle).
  useEffect(() => {
    if (!peek || docked) return;
    const onKey = (event: globalThis.KeyboardEvent) => event.key === 'Escape' && setPeek(false);
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Element;
      if (!target.closest('.project-panel, .project-tabs__side, .dropdown__list')) setPeek(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [peek, docked]);

  const back = (
    <nav className="crumb" aria-label="Trilha">
      <a href={routeHash({ name: 'projects' })}>Projetos</a>
      <Icon name="chevronRight" size="sm" />
      <span aria-current="page">{view?.project.name ?? ''}</span>
    </nav>
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
  const active = view.activeTasks.map((item) => item.task);
  const done = view.doneTasks.map((item) => item.task);
  const groups = groupProjectTasks(active, today);
  const agenda = agendaDays(groups.upcoming);
  const priorityIds = new Set(dayPriorities.map((priority) => priority.task.id));
  // Arrow keys move through the lines in the order they show.
  const shownLines = [...groups.stuck, ...agenda.flatMap((entry) => entry.tasks), ...groups.undated, ...done];

  const handlers: LineHandlers = {
    onSaveText: (block, text) => write(() => updateBlockText(appContext, block.id, text)),
    // The page has no free lines: Enter, Backspace and kind changes belong to the day note.
    onEnter: () => {},
    onBackspaceAtStart: () => {},
    onMakeTask: () => {},
    onToggleDone: (block, isDone) => write(() => setTaskDone(appContext, block.id, isDone)),
    onArrow: (block, direction) => {
      const index = shownLines.findIndex((line) => line.id === block.id);
      const target = shownLines[index + (direction === 'up' ? -1 : 1)];
      if (target) requestFocus(target.id, direction === 'up' ? 'end' : 0);
    },
    onSetDate: (block, date) => write(() => setIntendedDate(appContext, block.id, date)),
    onSetDeadline: (block, date) => write(() => setDeadline(appContext, block.id, date)),
    onTogglePriority: (block, on) => write(() => setDayPriority(appContext, block.id, on)),
  };

  const line = (task: Block, hideDate = false) => (
    <BlockLine
      key={task.id}
      block={task}
      free={false}
      day={null}
      today={today}
      isPriority={priorityIds.has(task.id)}
      allowNewLines={false}
      handlers={handlers}
      hideDate={hideDate}
    />
  );

  const togglePanel = () => {
    if (docked) write(() => setProjectPanelPinned(appContext, false));
    else setPeek(!peek);
  };
  const togglePin = () => {
    setPeek(false);
    write(() => setProjectPanelPinned(appContext, !pinned));
  };
  const goTab = (next: 'tasks' | 'notes') => navigate(next === 'notes' ? { name: 'project', id, tab: 'notes' } : { name: 'project', id });

  return (
    <main className={`page page--project ${docked ? 'page--project-docked' : ''}`}>
      <div className="project-layout">
        <div className="project-layout__main">
          {back}
          <header className="project-head">
            <ProjectIconPicker project={project} onChange={(icon) => write(() => setProjectIcon(appContext, project.id, icon))} />
            <input
              className="project-head__name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={() => write(() => renameProject(appContext, project.id, name))}
              onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
              aria-label="Nome do projeto"
            />
            {view.isPriority && (
              <span className="project-head__star" title="Em foco" aria-label="Em foco" role="img">
                <Icon name="star" size="sm" filled />
              </span>
            )}
            <ProjectActionsMenu project={project} objectives={objectives} canAddToPriorities={view.canAddToPriorities} />
          </header>

          <NewTaskField projectId={project.id} />

          <div className="project-tabs" role="tablist" aria-label="Conteúdo do projeto">
            <button type="button" role="tab" aria-selected={tab === 'tasks'} className="project-tabs__tab" onClick={() => goTab('tasks')}>
              Tarefas <span className="project-tabs__count">{active.length}</span>
            </button>
            <button type="button" role="tab" aria-selected={tab === 'notes'} className="project-tabs__tab" onClick={() => goTab('notes')}>
              Notas <span className="project-tabs__count">{view.notes.length}</span>
            </button>
            <span className="project-tabs__spacer" />
            {/* The only way into the side column; the badge counts the resources inside it. */}
            <button
              type="button"
              className="tertiary project-tabs__side"
              aria-expanded={panelShown}
              aria-label={`${panelShown ? 'Esconder' : 'Mostrar'} detalhes e recursos${resources.length > 0 ? `, ${plural(resources.length, 'recurso', 'recursos')}` : ''}`}
              title="Detalhes e recursos"
              onClick={togglePanel}
            >
              <Icon name="sidebar" />
              {resources.length > 0 && <span className="project-tabs__badge">{resources.length}</span>}
            </button>
          </div>

          {tab === 'tasks' ? (
            <div role="tabpanel" aria-label="Tarefas" className="project-tasks">
              {active.length === 0 && <p className="muted project-tasks__empty">Nenhuma tarefa ativa.</p>}

              {groups.stuck.length > 0 && (
                <section className="stuck" aria-label="Travadas">
                  <h3 className="stuck__title">
                    Travadas <span className="task-group__count">{groups.stuck.length}</span>
                  </h3>
                  {groups.stuck.map((task) => {
                    const reason = stuckReason(task, today);
                    return (
                      <div className="stuck__card" key={task.id}>
                        {line(task, true)}
                        <div className="stuck__foot">
                          <span className="stuck__reason">{reason ? stuckReasonLabel(reason) : ''}</span>
                          <DatePicker
                            label="Dar uma nova data de intenção"
                            className="small stuck__date"
                            value={task.intendedDate}
                            min={today}
                            onChange={(date) => handlers.onSetDate(task, date)}
                          >
                            Nova data
                          </DatePicker>
                        </div>
                      </div>
                    );
                  })}
                </section>
              )}

              {agenda.length > 0 && (
                <section className="agenda" aria-label="Próximos dias">
                  <h3 className="task-group__title">
                    Próximos dias <span className="task-group__count">{groups.upcoming.length}</span>
                  </h3>
                  {agenda.map(({ day, tasks }) => {
                    const date = agendaDate(day, today);
                    return (
                      <div className="agenda__day" key={day}>
                        <span className={`agenda__date ${day === today ? 'agenda__date--today' : ''}`} title={formatLongDate(day)}>
                          <span className="agenda__date-top">{date.top}</span>
                          <span className="agenda__date-number">{date.bottom}</span>
                        </span>
                        <div className="agenda__tasks">{tasks.map((task) => line(task, true))}</div>
                      </div>
                    );
                  })}
                </section>
              )}

              <FoldedGroup label="Sem data" count={groups.undated.length} initiallyOpen className="task-group--undated">
                {groups.undated.map((task) => line(task))}
              </FoldedGroup>

              <FoldedGroup label="Feitas" count={done.length} initiallyOpen={false} className="task-group--done">
                {done.map((task) => line(task))}
              </FoldedGroup>
            </div>
          ) : (
            <div role="tabpanel" aria-label="Notas">
              {view.notes.length === 0 ? (
                <p className="muted project-tasks__empty">As notas das seções deste projeto aparecem aqui depois que você fecha o dia.</p>
              ) : (
                <ol className="timeline">
                  {view.notes.map(({ section, notes }) => (
                    <li key={section.id} className={`timeline__entry ${section.kind === 'meeting' ? 'timeline__entry--meeting' : ''}`}>
                      <span className="timeline__dot" aria-hidden="true" />
                      <p className="timeline__when">
                        {formatShortDate(section.day)} · {formatTime(section.createdAt)} ·{' '}
                        {section.kind === 'meeting' ? (
                          <span className="timeline__kind">Reunião{section.participants ? ` com ${section.participants}` : ''}</span>
                        ) : (
                          'Geral'
                        )}
                        {section.title && section.title !== project.name ? ` · ${section.title}` : ''}
                      </p>
                      {notes.map((note) => (
                        <p className="timeline__note" key={note.id}>
                          <Linkified text={note.text} />
                        </p>
                      ))}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </div>

        {panelShown ? (
          <ProjectSidePanel
            view={view}
            objectives={objectives}
            resources={resources}
            pinned={pinned}
            floating={!docked}
            onTogglePin={togglePin}
            onClose={() => setPeek(false)}
          />
        ) : null}
      </div>
    </main>
  );
}
