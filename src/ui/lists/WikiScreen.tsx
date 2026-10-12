import { useEffect, useMemo, useState } from 'react';
import { loadWiki, type WikiEntry } from '../../application/queries';
import { normalizeForMatch } from '../../domain/text';
import { ProjectChip } from '../components/Chips';
import { Linkified } from '../components/Linkified';
import { LoadingPage } from '../components/Skeleton';
import { formatShortDate, formatTime } from '../format';
import { reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';

type Order = 'recent' | 'alphabetical';

function entryName(entry: WikiEntry): string {
  return entry.project?.name ?? entry.section.title ?? entry.notes[0]?.text ?? '';
}

/** Wiki pessoal with order, text search and filters by type or project (1b). */
export function WikiScreen({ focus }: { focus?: string }) {
  const entries = useLiveQuery(() => loadWiki(reader));
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState<Order>('recent');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!focus || !entries) return;
    document.getElementById(`wiki-${focus}`)?.scrollIntoView({ block: 'center' });
  }, [focus, entries]);

  const projects = useMemo(() => {
    const byId = new Map((entries ?? []).flatMap((entry) => (entry.project ? [[entry.project.id, entry.project]] : [])));
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [entries]);

  const shown = useMemo(() => {
    if (!entries) return [];
    const needle = normalizeForMatch(query);
    const filtered = entries.filter((entry) => {
      if (filter === 'general' && entry.section.kind !== 'general') return false;
      if (filter === 'meeting' && entry.section.kind !== 'meeting') return false;
      if (filter.startsWith('project:') && entry.project?.id !== filter.slice('project:'.length)) return false;
      if (!needle) return true;
      const haystack = [entry.section.title ?? '', entry.project?.name ?? '', ...entry.notes.map((note) => note.text)].join('\n');
      return normalizeForMatch(haystack).includes(needle);
    });
    return order === 'alphabetical'
      ? [...filtered].sort((a, b) => entryName(a).localeCompare(entryName(b), 'pt-BR'))
      : filtered;
  }, [entries, query, order, filter]);

  if (!entries) return <LoadingPage title="Wiki pessoal" />;

  return (
    <main className="page">
      <h1 className="page__title">Wiki pessoal</h1>
      {entries.length === 0 ? (
        <p className="muted">As notas triadas no checkout aparecem aqui.</p>
      ) : (
        <>
          <div className="toolbar">
            <input
              type="search"
              className="text-input toolbar__search"
              placeholder="Buscar nas notas"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Buscar nas notas"
            />
            <select className="text-input" value={order} onChange={(event) => setOrder(event.target.value as Order)} aria-label="Ordem">
              <option value="recent">Mais recentes</option>
              <option value="alphabetical">Ordem alfabética</option>
            </select>
            <select className="text-input" value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Mostrar">
              <option value="all">Todas as notas</option>
              <option value="general">Seções gerais</option>
              <option value="meeting">Reuniões</option>
              {projects.map((project) => (
                <option key={project.id} value={`project:${project.id}`}>
                  Projeto: {project.name}
                </option>
              ))}
            </select>
          </div>
          {shown.length === 0 ? (
            <p className="muted">Nenhuma nota encontrada.</p>
          ) : (
            <ul className="card-list">
              {shown.map(({ section, notes, project }) => (
                <li
                  id={`wiki-${section.id}`}
                  className={`card-list__item card-list__item--stacked ${focus === section.id ? 'card-list__item--focus' : ''}`}
                  key={section.id}
                >
                  <span className="wiki__meta muted">
                    {formatShortDate(section.day)} · {formatTime(section.createdAt)} ·{' '}
                    {section.kind === 'meeting' ? 'Reunião' : 'Geral'}
                    {!project && ` · ${section.title ?? 'sem título'}`}
                    {project && <ProjectChip name={project.name} />}
                  </span>
                  {notes.map((note) => (
                    <p className="wiki__note" key={note.id}>
                      <Linkified text={note.text} />
                    </p>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
