import { useEffect, useMemo, useState } from 'react';
import { discardWikiNotes, linkWikiNotesAsResource } from '../../application/checkout';
import { loadWiki, type WikiEntry } from '../../application/queries';
import { normalizeForMatch } from '../../domain/text';
import { ProjectChip } from '../components/Chips';
import { Linkified } from '../components/Linkified';
import { LoadingPage } from '../components/Skeleton';
import { FEATURES } from '../features';
import { formatShortDate, formatTime } from '../format';
import { appContext, reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';

type Order = 'recent' | 'alphabetical';

function entryName(entry: WikiEntry): string {
  return entry.project?.name ?? entry.section.title ?? entry.notes[0]?.text ?? '';
}

/** Wiki pessoal with order, text search and filters by type or project (1b). */
export function WikiScreen({ focus }: { focus?: string }) {
  const entries = useLiveQuery(() => loadWiki(reader));
  const ownerData = useLiveQuery(async () => ({ projects: await reader.projects(), objectives: await reader.objectives() }));
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
  const owners: Owner[] = [
    ...(ownerData?.objectives ?? [])
      .filter((objective) => FEATURES.objectives && objective.status === 'active')
      .map((objective) => ({ key: `objective:${objective.id}`, label: objective.goal })),
    ...(ownerData?.projects ?? [])
      .filter((project) => project.status === 'active')
      .map((project) => ({ key: `project:${project.id}`, label: project.name })),
  ];

  return (
    <main className="page">
      <h1 className="page__title">Wiki pessoal</h1>
      {entries.length === 0 ? (
        <p className="muted">As notas de cada dia aparecem aqui quando você fecha o dia.</p>
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
                  <WikiEntryActions sectionId={section.id} owners={owners} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}

interface Owner {
  /** `objective:id` or `project:id`. */
  key: string;
  label: string;
}

/**
 * What I can still do with a wiki entry (spec/nota-do-dia.md, "Wiki pessoal"): discard its notes,
 * after a confirmation, since that takes them out of circulation; and, from section 4, link them as
 * a resource of an objective or project.
 */
function WikiEntryActions({ sectionId, owners }: { sectionId: string; owners: Owner[] }) {
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function link(key: string) {
    if (!key) return;
    const owner = owners.find((each) => each.key === key);
    const [ownerType, ownerId] = key.split(':') as ['objective' | 'project', string];
    setBusy(true);
    try {
      const existing = await reader.resourcesOf(ownerId);
      if (existing.some((resource) => resource.sectionId === sectionId)) {
        setMessage(`Já é recurso de ${owner?.label ?? 'lá'}.`);
        return;
      }
      await linkWikiNotesAsResource(appContext, sectionId, { ownerType, ownerId });
      setMessage(`Vinculada como recurso de ${owner?.label ?? ''}.`);
    } finally {
      setBusy(false);
    }
  }

  async function discard() {
    setBusy(true);
    try {
      await discardWikiNotes(appContext, sectionId);
    } finally {
      setBusy(false);
    }
  }

  if (confirming) {
    return (
      <span className="wiki__actions">
        <span>Descartar as notas desta entrada? Elas saem da wiki.</span>
        <button type="button" className="danger small" onClick={discard} disabled={busy}>
          Descartar
        </button>
        <button type="button" className="small" onClick={() => setConfirming(false)} disabled={busy}>
          Cancelar
        </button>
      </span>
    );
  }
  return (
    <span className="wiki__actions">
      {owners.length > 0 && (
        <select
          className="text-input"
          value=""
          onChange={(event) => link(event.target.value)}
          disabled={busy}
          aria-label="Vincular como recurso"
        >
          <option value="">Vincular como recurso…</option>
          {owners.map((owner) => (
            <option key={owner.key} value={owner.key}>
              {owner.label}
            </option>
          ))}
        </select>
      )}
      <button type="button" className="tertiary small" onClick={() => setConfirming(true)} disabled={busy}>
        Descartar
      </button>
      {message && <span className="muted">{message}</span>}
    </span>
  );
}
