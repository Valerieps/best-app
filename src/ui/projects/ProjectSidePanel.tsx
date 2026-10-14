import { useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { addLinkResource, linkProjectToObjective, removeResource, renameResource } from '../../application/objectives';
import type { ProjectView, ResourceView } from '../../application/queries';
import { toDayKey } from '../../domain/day';
import type { Objective } from '../../domain/entities';
import { Dropdown, DropdownItem } from '../components/Dropdown';
import { Icon } from '../components/Icon';
import { Linkified, toSafeHref } from '../components/Linkified';
import { formatShortDate, linkDomain } from '../format';
import { navigate } from '../hooks';
import { FEATURES } from '../features';
import { appContext } from '../services';

interface Props {
  view: ProjectView;
  objectives: Objective[];
  resources: ResourceView[];
  pinned: boolean;
  /** Shown over the content instead of docked. */
  floating: boolean;
  onTogglePin(): void;
  onClose(): void;
}

function ObjectiveField({ view, objectives }: { view: ProjectView; objectives: Objective[] }) {
  const { project } = view;
  const current = objectives.find((objective) => objective.id === project.objectiveId) ?? null;
  const choices = objectives.filter((objective) => objective.status === 'active' && objective.id !== current?.id);
  const link = (objectiveId: string | null) => void linkProjectToObjective(appContext, project.id, objectiveId);
  return (
    <Dropdown
      label={current ? `Objetivo: ${current.goal}. Trocar` : 'Vincular a um objetivo'}
      triggerClassName="link project-panel__objective"
      trigger={current ? current.goal : 'Vincular'}
    >
      {(close) => (
        <>
          {current && (
            <DropdownItem
              onSelect={() => {
                close();
                navigate({ name: 'objective', id: current.id });
              }}
            >
              Abrir o objetivo
            </DropdownItem>
          )}
          {choices.map((objective) => (
            <DropdownItem
              key={objective.id}
              onSelect={() => {
                close();
                link(objective.id);
              }}
            >
              {objective.goal}
            </DropdownItem>
          ))}
          {choices.length === 0 && !current && (
            <DropdownItem
              onSelect={() => {
                close();
                navigate({ name: 'objectives' });
              }}
            >
              Nenhum objetivo ativo. Abrir Objetivos
            </DropdownItem>
          )}
          {current && (
            <DropdownItem
              onSelect={() => {
                close();
                link(null);
              }}
            >
              Tirar o vínculo
            </DropdownItem>
          )}
        </>
      )}
    </Dropdown>
  );
}

function ResourceCard({ item }: { item: ResourceView }) {
  const { resource, notes } = item;
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(resource.title);
  const href = resource.url ? toSafeHref(resource.url) : null;
  const detail = resource.url ? linkDomain(resource.url) : `nota · ${formatShortDate(toDayKey(new Date(resource.createdAt)))}`;

  const save = () => {
    setEditing(false);
    void renameResource(appContext, resource.id, title);
  };

  return (
    <li className="resource-card">
      <span className="resource-card__icon">
        <Icon name={resource.url ? 'link' : 'notes'} />
      </span>
      <span className="resource-card__body">
        {editing ? (
          <input
            className="text-input resource-card__input"
            value={title}
            autoFocus
            aria-label="Título do recurso"
            onChange={(event) => setTitle(event.target.value)}
            onBlur={save}
            onKeyDown={(event) => {
              if (event.key === 'Enter') save();
              if (event.key === 'Escape') {
                setTitle(resource.title);
                setEditing(false);
              }
            }}
          />
        ) : href ? (
          <a className="resource-card__title" href={href} target="_blank" rel="noopener noreferrer">
            {resource.title}
          </a>
        ) : notes.length > 0 ? (
          <button type="button" className="resource-card__title resource-card__toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
            {resource.title}
          </button>
        ) : (
          <span className="resource-card__title">{resource.title}</span>
        )}
        {detail !== resource.title && <span className="muted resource-card__detail">{detail}</span>}
        {open &&
          notes.map((note) => (
            <p className="resource-card__note" key={note.id}>
              <Linkified text={note.text} />
            </p>
          ))}
      </span>
      {!editing && (
        <span className="resource-card__actions">
          <button type="button" className="line__action" onClick={() => setEditing(true)} aria-label={`Renomear "${resource.title}"`}>
            Renomear
          </button>
          <button
            type="button"
            className="line__action"
            onClick={() => void removeResource(appContext, resource.id)}
            aria-label={`Remover "${resource.title}"`}
          >
            ✕
          </button>
        </span>
      )}
    </li>
  );
}

/** "Colar link": pasting adds the link right away, titled with its domain; Enter adds what was typed. */
function PasteLink({ projectId }: { projectId: string }) {
  const [value, setValue] = useState('');
  const add = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    void addLinkResource(appContext, { ownerType: 'project', ownerId: projectId }, trimmed, linkDomain(trimmed));
    setValue('');
  };
  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text').trim();
    if (value === '' && toSafeHref(pasted)) {
      event.preventDefault();
      add(pasted);
    }
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      add(value);
    }
  };
  return (
    <label className="paste-link">
      <Icon name="plus" size="sm" />
      <input
        className="paste-link__input"
        value={value}
        placeholder="Colar link"
        aria-label="Colar um link como recurso"
        onChange={(event) => setValue(event.target.value)}
        onPaste={onPaste}
        onKeyDown={onKeyDown}
      />
    </label>
  );
}

/** Side column of the project page: details and resources. */
export function ProjectSidePanel({ view, objectives, resources, pinned, floating, onTogglePin, onClose }: Props) {
  const { project } = view;
  const status =
    project.status === 'finished' && project.finishedAt
      ? `Finalizado em ${formatShortDate(toDayKey(new Date(project.finishedAt)))}`
      : project.status === 'finished'
        ? 'Finalizado'
        : 'Ativo';
  return (
    <aside className={`project-panel ${floating ? 'project-panel--floating' : ''}`} aria-label="Sobre o projeto">
      <div className="project-panel__head">
        <span className="project-panel__title">Sobre o projeto</span>
        <span>
          <button
            type="button"
            className={`tertiary project-panel__icon-button ${pinned ? 'project-panel__icon-button--on' : ''}`}
            aria-pressed={pinned}
            aria-label={pinned ? 'Desafixar a coluna' : 'Fixar a coluna'}
            title={pinned ? 'Desafixar a coluna' : 'Fixar a coluna'}
            onClick={onTogglePin}
          >
            <Icon name="pin" filled={pinned} />
          </button>
          {floating && (
            <button type="button" className="tertiary project-panel__icon-button" aria-label="Fechar a coluna" title="Fechar" onClick={onClose}>
              <Icon name="close" />
            </button>
          )}
        </span>
      </div>

      <h2 className="project-panel__heading">Detalhes</h2>
      <dl className="project-panel__details">
        {FEATURES.objectives && (
          <div>
            <dt className="muted">Objetivo</dt>
            <dd>
              <ObjectiveField view={view} objectives={objectives} />
            </dd>
          </div>
        )}
        <div>
          <dt className="muted">Status</dt>
          <dd>{status}</dd>
        </div>
        <div>
          <dt className="muted">Seções</dt>
          <dd>{view.sections}</dd>
        </div>
      </dl>

      <h2 className="project-panel__heading">Recursos</h2>
      {resources.length === 0 ? (
        <p className="muted project-panel__empty">Notas viram recurso na wiki; links entram aqui.</p>
      ) : (
        <ul className="resource-list">
          {resources.map((item) => (
            <ResourceCard key={item.resource.id} item={item} />
          ))}
        </ul>
      )}
      <PasteLink projectId={project.id} />
    </aside>
  );
}
