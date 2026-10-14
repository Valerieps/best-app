import { useState } from 'react';
import { addLinkResource, removeResource } from '../../application/objectives';
import type { ResourceView } from '../../application/queries';
import { Linkified, toSafeHref } from '../components/Linkified';
import { appContext } from '../services';

interface Props {
  owner: { ownerType: 'objective' | 'project'; ownerId: string };
  resources: ResourceView[];
}

/** Section 4: notes and links that support an objective or a project. */
export function Resources({ owner, resources }: Props) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');

  return (
    <>
      {resources.length === 0 ? (
        <p className="muted">Nenhum recurso. Na wiki, as notas de uma seção podem virar recurso; links entram aqui.</p>
      ) : (
        <ul className="card-list">
          {resources.map(({ resource, notes }) => {
            const href = resource.url ? toSafeHref(resource.url) : null;
            return (
              <li className="card-list__item card-list__item--stacked" key={resource.id}>
                <span className="resource__header">
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      {resource.title}
                    </a>
                  ) : (
                    <strong>{resource.title}</strong>
                  )}
                  <button type="button" className="line__action" onClick={() => void removeResource(appContext, resource.id)} aria-label="Remover recurso">
                    ✕
                  </button>
                </span>
                {notes.map((note) => (
                  <p className="wiki__note" key={note.id}>
                    <Linkified text={note.text} />
                  </p>
                ))}
              </li>
            );
          })}
        </ul>
      )}
      <form
        className="settings__row"
        onSubmit={(event) => {
          event.preventDefault();
          if (!url.trim()) return;
          void addLinkResource(appContext, owner, url, title);
          setUrl('');
          setTitle('');
        }}
      >
        <input className="text-input" value={title} placeholder="Título" onChange={(event) => setTitle(event.target.value)} aria-label="Título do link" />
        <input
          className="text-input toolbar__search"
          value={url}
          placeholder="Link (https://… ou go/…)"
          onChange={(event) => setUrl(event.target.value)}
          aria-label="Link"
        />
        <button type="submit">Adicionar link</button>
      </form>
    </>
  );
}
