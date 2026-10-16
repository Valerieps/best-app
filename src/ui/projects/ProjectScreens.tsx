import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react';
import { setDayPriority, setDeadline, setIntendedDate } from '../../application/dayTools';
import { setTaskDone, setTaskWaiting, updateBlockText } from '../../application/notebook';
import { ensurePeople } from '../../application/people';
import { createProjectTask, renameProject, setProjectIcon } from '../../application/projects';
import { loadDayPriorities, loadProject, loadProjectResources } from '../../application/queries';
import { setProjectPanelPinned } from '../../application/settings';
import { type DayKey } from '../../domain/day';
import type { Block } from '../../domain/entities';
import { agendaColumns, groupProjectTasks, stuckReason } from '../../domain/projectPage';
import { BlockLine, DatePicker, type LineHandlers } from '../dayNote/BlockLine';
import { requestFocus } from '../dayNote/focus';
import { Icon } from '../components/Icon';
import { BackButton, ScreenHeader } from '../components/ScreenHeader';
import { LoadingPage } from '../components/Skeleton';
import { formatLongDate, formatShortDate, plural, stuckReasonLabel, weekdayName } from '../format';
import { navigate } from '../hooks';
import { appContext, reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';
import { enqueue } from '../writeQueue';
import { ProjectActionsMenu } from './ProjectActions';
import { ProjectIconPicker } from './ProjectIcon';
import { panelOnOpen } from './panelState';
import { ProjectNotes } from './ProjectNotes';
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

/** "Nova tarefa", above the tabs while the tasks show: Enter creates the task and keeps the field for the next one. */
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
  const settings = useLiveQuery(() => reader.settings());
  const pinned = settings?.projectPanelPinned ?? false;
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

  const back = <BackButton action={{ label: 'Projetos', onSelect: () => navigate({ name: 'projects' }) }} />;
  if (view === undefined) return <LoadingPage before={back} />;
  if (view === null) {
    return (
      <main className="page">
        <ScreenHeader title="Projeto não encontrado" back={{ label: 'Projetos', onSelect: () => navigate({ name: 'projects' }) }} />
      </main>
    );
  }

  const { project } = view;
  const active = view.activeTasks.map((item) => item.task);
  const done = view.doneTasks.map((item) => item.task);
  const groups = groupProjectTasks(active, today);
  const agenda = agendaColumns(groups.upcoming, today, settings?.activeDays);
  const priorityIds = new Set(dayPriorities.map((priority) => priority.task.id));
  // Arrow keys move through the lines in the order they show.
  const shownLines = [...groups.stuck, ...agenda.flatMap((entry) => entry.tasks), ...groups.undated, ...groups.waiting, ...done];

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
    onSetWaiting: (block, waiting) => write(() => setTaskWaiting(appContext, block.id, waiting)),
    onEnsurePeople: (names) => write(() => ensurePeople(appContext, names)),
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
          <header className="project-head">
            {back}
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

          {tab === 'tasks' && <NewTaskField projectId={project.id} />}

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

              {/* "Próximos dias" as a calendar of the next 3 active days; later tasks do not show. */}
              <section className="agenda" aria-label="Próximos dias">
                <h3 className="task-group__title">Próximos dias</h3>
                <div className="agenda__columns">
                  {agenda.map(({ day, tasks }) => (
                    <div className={`agenda__day ${day === today ? 'agenda__day--today' : ''}`} key={day} aria-label={formatLongDate(day)}>
                      <p className="agenda__date">
                        <span className="agenda__weekday">{weekdayName(day)}</span>
                        <span className="agenda__number">{day === today ? `hoje · ${formatShortDate(day)}` : formatShortDate(day)}</span>
                      </p>
                      <div className="agenda__tasks">
                        {tasks.length > 0 ? tasks.map((task) => line(task, true)) : <p className="muted agenda__empty">Nada marcado</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <FoldedGroup label="Sem data" count={groups.undated.length} initiallyOpen className="task-group--undated">
                {groups.undated.map((task) => line(task))}
              </FoldedGroup>

              <FoldedGroup label="Aguardando" count={groups.waiting.length} initiallyOpen className="task-group--waiting">
                {groups.waiting.map((task) => line(task))}
              </FoldedGroup>

              <FoldedGroup label="Feitas" count={done.length} initiallyOpen={false} className="task-group--done">
                {done.map((task) => line(task))}
              </FoldedGroup>
            </div>
          ) : (
            <div role="tabpanel" aria-label="Notas">
              <ProjectNotes entries={view.notes} projectId={project.id} projectName={project.name} today={today} />
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
