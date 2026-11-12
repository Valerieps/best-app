import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react';
import { addFocusProject } from '../../application/focusProjects';
import { createProject, setProjectPlace, type ProjectPlace } from '../../application/projects';
import { loadProjectList, type ProjectListItem, type ProjectListView } from '../../application/queries';
import { setProjectListGroupOpen } from '../../application/settings';
import { toDayKey, type DayKey } from '../../domain/day';
import type { ProjectListGroup } from '../../domain/entities';
import { FOCUS_PROJECT_LIMIT } from '../../domain/focusProjects';
import { Dropdown, DropdownItem } from '../components/Dropdown';
import { Icon } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import { LoadingPage } from '../components/Skeleton';
import { formatShortDate, plural } from '../format';
import { navigate, routeHash } from '../hooks';
import { appContext, reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';
import { enqueue, write } from '../writeQueue';
import { ProjectActionsMenu } from './ProjectActions';
import { ProjectIconBadge } from './ProjectIcon';


/**
 * The project list (spec/projetos.md, "Projetos"): where projects are followed. The projects in
 * focus come first, as rows like the other active ones.
 */
export function ProjectsScreen({ today }: { today: DayKey }) {
  const view = useLiveQuery(() => loadProjectList(reader, today), [today]);
  const [creating, setCreating] = useState(false);
  if (!view) return <LoadingPage title="Projetos" />;

  const candidates = view.others.map((item) => item.project);
  const freeSlots = FOCUS_PROJECT_LIMIT - view.priority.length;
  const hasActive = view.summary.active > 0;

  return (
    <main className="page page--wide projects">
      <ScreenHeader title="Projetos" primary={{ label: 'Novo projeto', icon: 'plus', onSelect: () => setCreating(true) }}>
        {creating && <NewProjectField onDone={() => setCreating(false)} />}
      </ScreenHeader>

      {!hasActive && (
        <p className="muted">Nenhum projeto ativo. Crie um aqui ou a partir de uma seção da nota do dia.</p>
      )}

      {hasActive && (
        <section className="projects__group" aria-labelledby="projects-priority">
          <h2 className="projects__group-title" id="projects-priority">
            Em foco
          </h2>
          {view.priority.length > 0 && (
            <ul className="project-rows">
              {view.priority.map((item) => (
                <ProjectRow key={item.project.id} item={item} view={view} />
              ))}
            </ul>
          )}
          {freeSlots > 0 && <FreeSlot candidates={candidates} />}
        </section>
      )}

      {view.others.length > 0 && (
        <Group
          group="others"
          open={view.open.others}
          title={`Outros ativos (${view.others.length})`}
          note={view.others.some((item) => item.stalledDays !== null) ? plural(view.others.filter((item) => item.stalledDays !== null).length, 'parado', 'parados') : null}
        >
          <ul className="project-rows">
            {view.others.map((item) => (
              <ProjectRow key={item.project.id} item={item} view={view} />
            ))}
          </ul>
        </Group>
      )}

      {view.backlog.length > 0 && (
        <Group group="backlog" open={view.open.backlog} title={`Backlog (${view.backlog.length})`} note={null}>
          <ul className="project-rows">
            {view.backlog.map((item) => (
              <ProjectRow key={item.project.id} item={item} view={view} />
            ))}
          </ul>
        </Group>
      )}

      {view.finished.length > 0 && (
        <Group group="finished" open={view.open.finished} title={`Finalizados (${view.finished.length})`} note={null}>
          <ul className="project-rows">
            {view.finished.map((item) => (
              <li className="project-row project-row--finished" key={item.project.id}>
                <a className="project-row__name project-link" href={routeHash({ name: 'project', id: item.project.id })}>
                  <ProjectIconBadge project={item.project} size="sm" />
                  <span className="project-row__label">{item.project.name}</span>
                </a>
                <span className="project-row__state">
                  {item.project.finishedAt ? `Finalizado em ${formatShortDate(toDayKey(new Date(item.project.finishedAt)))}` : 'Finalizado'}
                </span>
                <PlaceSwitch item={item} view={view} />
                <ProjectActionsMenu project={item.project} objectives={view.objectives} focus={item} />
              </li>
            ))}
          </ul>
        </Group>
      )}
    </main>
  );
}

function ProjectRow({ item, view }: { item: ProjectListItem; view: ProjectListView }) {
  return (
    <li className="project-row">
      <a className="project-row__name project-link" href={routeHash({ name: 'project', id: item.project.id })}>
        <ProjectIconBadge project={item.project} size="sm" />
        <span className="project-row__label">{item.project.name}</span>
      </a>
      <span className={`project-row__state ${item.stalledDays !== null ? 'project-row__state--warning' : ''}`}>
        {item.stalledDays !== null ? `Parado há ${item.stalledDays} dias` : plural(item.activeTasks, 'ativa', 'ativas')}
      </span>
      <PlaceSwitch item={item} view={view} />
      <ProjectActionsMenu project={item.project} objectives={view.objectives} focus={item} />
    </li>
  );
}

const PLACES: { place: ProjectPlace; label: string }[] = [
  { place: 'focus', label: 'Em foco' },
  { place: 'active', label: 'Ativo' },
  { place: 'backlog', label: 'Backlog' },
];

/** Where the project is in the list; a finished project is in none of the places. */
function currentPlace(item: ProjectListItem): ProjectPlace | null {
  if (item.project.status === 'backlog') return 'backlog';
  if (item.project.status !== 'active') return null;
  return item.isPriority ? 'focus' : 'active';
}

/**
 * Shown when the mouse is over the row: moves the project to the focus, the other active ones or
 * the backlog, from wherever it is. "Em foco" is off while the focus is full.
 */
function PlaceSwitch({ item, view }: { item: ProjectListItem; view: ProjectListView }) {
  const current = currentPlace(item);
  const focusFull = view.priority.length >= FOCUS_PROJECT_LIMIT;
  return (
    <span className="segmented project-row__places" role="group" aria-label={`Status de ${item.project.name}`}>
      {PLACES.map(({ place, label }) => {
        const blocked = place === 'focus' && current !== 'focus' && focusFull;
        return (
          <button
            key={place}
            type="button"
            className={`segmented__option ${current === place ? 'segmented__option--on' : ''}`}
            aria-pressed={current === place}
            disabled={blocked}
            title={blocked ? `Em foco está cheio (${FOCUS_PROJECT_LIMIT})` : undefined}
            onClick={() => current !== place && write(() => setProjectPlace(appContext, item.project.id, place))}
          >
            {label}
          </button>
        );
      })}
    </span>
  );
}

/** "Colocar em foco": lets an active project take a free focus slot. */
function FreeSlot({ candidates }: { candidates: ProjectListItem['project'][] }) {
  return (
    <Dropdown
      className="priority-slot"
      triggerClassName="priority-slot__button"
      align="left"
      label="Colocar em foco: escolher um projeto ativo"
      trigger={
        <>
          <Icon name="plus" />
          Colocar em foco
        </>
      }
    >
      {(close) =>
        candidates.length === 0 ? (
          <p className="dropdown__empty muted">Nenhum outro projeto ativo.</p>
        ) : (
          candidates.map((project) => (
            <DropdownItem
              key={project.id}
              onSelect={() => {
                close();
                write(() => addFocusProject(appContext, project.id));
              }}
            >
              <span className="project-link">
                <ProjectIconBadge project={project} size="sm" />
                {project.name}
              </span>
            </DropdownItem>
          ))
        )
      }
    </Dropdown>
  );
}

/** A collapsible group whose open state is kept in the settings. */
function Group({ group, open: saved, title, note, children }: { group: ProjectListGroup; open: boolean; title: string; note: string | null; children: ReactNode }) {
  // Opens at once; the saved choice catches up when the settings are written.
  const [open, setOpen] = useState(saved);
  useEffect(() => setOpen(saved), [saved]);
  return (
    <section className="projects__group">
      <button
        type="button"
        className="projects__toggle"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          write(() => setProjectListGroupOpen(appContext, group, !open));
        }}
      >
        <Icon name={open ? 'chevronDown' : 'chevronRight'} size="sm" />
        <span className="projects__group-title">{title}</span>
        {note && <span className="projects__toggle-note">· {note}</span>}
      </button>
      {open && children}
    </section>
  );
}

/** "Novo projeto": Enter creates it and opens its page; Escape gives up. */
function NewProjectField({ onDone }: { onDone(): void }) {
  const [name, setName] = useState('');
  const onKeyDown = async (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') onDone();
    if (event.key !== 'Enter' || event.nativeEvent.isComposing || !name.trim()) return;
    event.preventDefault();
    const project = await enqueue(() => createProject(appContext, name));
    onDone();
    navigate({ name: 'project', id: project.id });
  };
  return (
    <label className="new-project">
      <Icon name="plus" size="sm" />
      <input
        className="new-project__input"
        value={name}
        autoFocus
        placeholder="Nome do projeto"
        aria-label="Nome do novo projeto"
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => void onKeyDown(event)}
        onBlur={() => !name.trim() && onDone()}
      />
    </label>
  );
}
