import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react';
import { addFocusProject } from '../../application/focusProjects';
import { createProject } from '../../application/projects';
import { loadProjectList, type ProjectListItem, type ProjectListView } from '../../application/queries';
import { setProjectListGroupOpen } from '../../application/settings';
import { toDayKey, type DayKey } from '../../domain/day';
import type { ProjectListGroup } from '../../domain/entities';
import { FOCUS_PROJECT_LIMIT } from '../../domain/focusProjects';
import { CARD_MAP_WEEKS } from '../../domain/projectActivity';
import { Dropdown, DropdownItem } from '../components/Dropdown';
import { Icon } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import { LoadingPage } from '../components/Skeleton';
import { formatShortDate, plural, relativeDay } from '../format';
import { navigate, routeHash } from '../hooks';
import { appContext, reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';
import { enqueue } from '../writeQueue';
import { ActivityLegend, ActivityMap } from './ActivityMap';
import { ProjectActionsMenu } from './ProjectActions';
import { FEATURES } from '../features';
import { ProjectIconBadge } from './ProjectIcon';

function write(work: () => Promise<unknown>) {
  enqueue(work).catch(() => {
    // Logged by the queue; the screen shows the saved state again on its own.
  });
}

/**
 * The project list (spec/projetos.md, "Projetos"): where projects are followed. The projects in
 * focus are cards with a 16-week activity map; the other active ones are rows with 8 weeks.
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
          <div className="projects__group-head">
            <h2 className="projects__group-title" id="projects-priority">
              Em foco
            </h2>
            <ActivityLegend />
          </div>
          <div className="priority-cards">
            {view.priority.map((item) => (
              <PriorityCard key={item.project.id} item={item} view={view} today={today} />
            ))}
            {Array.from({ length: freeSlots }, (_, index) => (
              <FreeSlot key={index} candidates={candidates} />
            ))}
          </div>
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
              <li className="project-row" key={item.project.id}>
                <a className="project-row__name project-link" href={routeHash({ name: 'project', id: item.project.id })}>
                  <ProjectIconBadge project={item.project} size="sm" />
                  <span className="project-row__label">{item.project.name}</span>
                </a>
                <span className={`project-row__state ${item.stalledDays !== null ? 'project-row__state--warning' : ''}`}>
                  {item.stalledDays !== null ? `Parado há ${item.stalledDays} dias` : plural(item.activeTasks, 'ativa', 'ativas')}
                </span>
                <ProjectActionsMenu project={item.project} objectives={view.objectives} canAddToPriorities={item.canAddToPriorities} />
              </li>
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
                <ProjectActionsMenu project={item.project} objectives={view.objectives} canAddToPriorities={false} />
              </li>
            ))}
          </ul>
        </Group>
      )}
    </main>
  );
}

function PriorityCard({ item, view, today }: { item: ProjectListItem; view: ProjectListView; today: DayKey }) {
  const { project } = item;
  return (
    <article className="priority-card" aria-label={project.name}>
      <header className="priority-card__head">
        <a className="priority-card__name project-link" href={routeHash({ name: 'project', id: project.id })}>
          <ProjectIconBadge project={project} size="md" />
          <span className="priority-card__label">{project.name}</span>
        </a>
        <ProjectActionsMenu project={project} objectives={view.objectives} canAddToPriorities={false} />
      </header>
      <ActivityMap activity={item.activity} today={today} weeks={CARD_MAP_WEEKS} name={project.name} />
      <div className="priority-card__stats">
        <p>
          <Count value={item.activeTasks} one="ativa" many="ativas" />
          {' · '}
          <span className={item.stuckTasks > 0 ? 'priority-card__stat--warning' : ''}>
            <Count value={item.stuckTasks} one="travada" many="travadas" />
          </span>
        </p>
        <p>
          <Count value={item.finishedLastTwoWeeks} one="finalizada" many="finalizadas" /> nas últimas 2 semanas
        </p>
      </div>
      {FEATURES.objectives && (
        <p className="priority-card__objective" title={item.objective?.goal}>
          {item.objective ? (
            <>
              <span className="muted">Objetivo: </span>
              {item.objective.goal}
            </>
          ) : (
            <span className="muted">Sem objetivo</span>
          )}
        </p>
      )}
      <p className={`priority-card__last ${item.stalledDays !== null ? 'priority-card__last--warning' : ''}`}>
        {item.stalledDays !== null
          ? `Parado há ${item.stalledDays} dias`
          : item.lastActivityDay
            ? `Última atividade ${relativeDay(item.lastActivityDay, today)}`
            : 'Nenhuma atividade ainda'}
      </p>
    </article>
  );
}

/** "3 ativas", with the number in bold. */
function Count({ value, one, many }: { value: number; one: string; many: string }) {
  return (
    <>
      <strong className="priority-card__number">{value}</strong> {value === 1 ? one : many}
    </>
  );
}

/** A dashed free slot: "Colocar em foco" lets an active project take it. */
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
