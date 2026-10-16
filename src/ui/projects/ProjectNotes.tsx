import { useState, type KeyboardEvent } from 'react';
import { linkSectionNotesAsResource } from '../../application/checkout';
import { deleteKeptNote, updateBlockText } from '../../application/notebook';
import type { SectionNotes } from '../../application/queries';
import type { Block } from '../../domain/entities';
import { Linkified } from '../components/Linkified';
import { FEATURES } from '../features';
import { formatShortDate, formatTime } from '../format';
import { appContext, reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';

interface Owner {
  /** `objective:id` or `project:id`. */
  key: string;
  label: string;
}

/**
 * The "Notas" tab of a project page (spec/projetos.md, "Página do projeto"): the notes of its
 * sections once their day is closed. Each note can be edited or deleted, and from section 4 the
 * notes of a section can become a resource.
 */
export function ProjectNotes({ entries, projectName }: { entries: SectionNotes[]; projectName: string }) {
  const ownerData = useLiveQuery(async () => ({ projects: await reader.projects(), objectives: await reader.objectives() }));
  const owners: Owner[] = [
    ...(ownerData?.objectives ?? [])
      .filter((objective) => FEATURES.objectives && objective.status === 'active')
      .map((objective) => ({ key: `objective:${objective.id}`, label: objective.goal })),
    ...(ownerData?.projects ?? [])
      .filter((project) => project.status === 'active')
      .map((project) => ({ key: `project:${project.id}`, label: project.name })),
  ];

  if (entries.length === 0) {
    return <p className="muted project-tasks__empty">As notas das seções deste projeto aparecem aqui depois que você fecha o dia.</p>;
  }
  return (
    <ol className="timeline">
      {entries.map(({ section, notes }) => (
        <li key={section.id} className={`timeline__entry ${section.kind === 'meeting' ? 'timeline__entry--meeting' : ''}`}>
          <span className="timeline__dot" aria-hidden="true" />
          <p className="timeline__when">
            {formatShortDate(section.day)} · {formatTime(section.createdAt)} ·{' '}
            {section.kind === 'meeting' ? (
              <span className="timeline__kind">Reunião{section.participants ? ` com ${section.participants}` : ''}</span>
            ) : (
              'Geral'
            )}
            {section.title && section.title !== projectName ? ` · ${section.title}` : ''}
          </p>
          {notes.map((note) => (
            <NoteLine key={note.id} note={note} />
          ))}
          {owners.length > 0 && <ResourceLink sectionId={section.id} owners={owners} />}
        </li>
      ))}
    </ol>
  );
}

/** A note of a closed day: its text, or a field to edit it; on hover, edit and delete. */
function NoteLine({ note }: { note: Block }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.text);
  const [confirming, setConfirming] = useState(false);

  function save() {
    const text = draft.trim();
    // An emptied note is not deleted by accident: deleting has its own button.
    if (text && text !== note.text) void updateBlockText(appContext, note.id, text);
    setEditing(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      setDraft(note.text);
      setEditing(false);
    } else if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      save();
    }
  }

  if (editing) {
    return (
      <textarea
        className="text-input timeline__edit"
        value={draft}
        autoFocus
        rows={Math.max(1, draft.split('\n').length)}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={save}
        onKeyDown={onKeyDown}
        aria-label="Texto da nota"
      />
    );
  }
  return (
    <div className="timeline__note-row">
      <p className="timeline__note">
        <Linkified text={note.text} />
      </p>
      <span className="timeline__note-actions">
        <button
          type="button"
          className="line__action"
          onClick={() => {
            setDraft(note.text);
            setEditing(true);
          }}
        >
          Editar
        </button>
        <button
          type="button"
          className={`line__action ${confirming ? 'active-tasks__abandon--confirm' : ''}`}
          onClick={() => (confirming ? void deleteKeptNote(appContext, note.id) : setConfirming(true))}
          onBlur={() => setConfirming(false)}
          title="Apagar a nota. O histórico guarda o que ela dizia."
        >
          {confirming ? 'Confirmar' : 'Apagar'}
        </button>
      </span>
    </div>
  );
}

/** Section 4: links the notes of a section as a resource of an objective or project. */
function ResourceLink({ sectionId, owners }: { sectionId: string; owners: Owner[] }) {
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
      await linkSectionNotesAsResource(appContext, sectionId, { ownerType, ownerId });
      setMessage(`Vinculada como recurso de ${owner?.label ?? ''}.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="timeline__resource">
      <select className="text-input" value="" onChange={(event) => void link(event.target.value)} disabled={busy} aria-label="Vincular como recurso">
        <option value="">Vincular como recurso…</option>
        {owners.map((owner) => (
          <option key={owner.key} value={owner.key}>
            {owner.label}
          </option>
        ))}
      </select>
      {message && <span className="muted">{message}</span>}
    </span>
  );
}
