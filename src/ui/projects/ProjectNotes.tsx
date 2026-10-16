import { useState, type KeyboardEvent } from 'react';
import { linkSectionNotesAsResource } from '../../application/checkout';
import { deleteKeptNote, mergeKeptNote, splitKeptNote, updateBlockText } from '../../application/notebook';
import { createProjectNote } from '../../application/projects';
import type { SectionNotes } from '../../application/queries';
import type { DayKey } from '../../domain/day';
import type { Block, Section } from '../../domain/entities';
import { comparePositions, positionBetween } from '../../domain/position';
import { Icon } from '../components/Icon';
import { BlockLine, type LineHandlers } from '../dayNote/BlockLine';
import { MarkdownText } from '../dayNote/MarkdownText';
import { requestFocus } from '../dayNote/focus';
import { FEATURES } from '../features';
import { formatShortDate, formatTime } from '../format';
import { appContext, reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';
import { enqueue } from '../writeQueue';

interface Owner {
  /** `objective:id` or `project:id`. */
  key: string;
  label: string;
}

function write(work: () => Promise<unknown>) {
  enqueue(work).catch(() => {
    // Logged by the queue; the screen shows the saved state again on its own.
  });
}

/**
 * The "Notas" tab of a project page (spec/projetos.md, "Página do projeto"): the notes of its
 * sections once their day is closed, and the notes written right here. "+" writes a new note;
 * "Editar" opens a whole entry in the day note's line editor. From section 4 the notes of a
 * section can become a resource.
 */
export function ProjectNotes({ entries, projectId, projectName, today }: { entries: SectionNotes[]; projectId: string; projectName: string; today: DayKey }) {
  const ownerData = useLiveQuery(async () => ({ projects: await reader.projects(), objectives: await reader.objectives() }));
  const [writing, setWriting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const owners: Owner[] = [
    ...(ownerData?.objectives ?? [])
      .filter((objective) => FEATURES.objectives && objective.status === 'active')
      .map((objective) => ({ key: `objective:${objective.id}`, label: objective.goal })),
    ...(ownerData?.projects ?? [])
      .filter((project) => project.status === 'active')
      .map((project) => ({ key: `project:${project.id}`, label: project.name })),
  ];

  return (
    <>
      <div className="timeline__head">
        <button type="button" className="tertiary timeline__add" onClick={() => setWriting(true)} aria-label="Nova nota" title="Nova nota">
          <Icon name="plus" size="sm" />
        </button>
      </div>
      {writing && <NewNoteField projectId={projectId} onDone={() => setWriting(false)} />}
      {entries.length === 0 && !writing ? (
        <p className="muted project-tasks__empty">As notas que você escreve aqui e as das seções deste projeto, depois que você fecha o dia, aparecem aqui.</p>
      ) : (
        <ol className="timeline">
          {entries.map(({ section, notes }) => (
            <li key={section.id} className={`timeline__entry ${section.kind === 'meeting' ? 'timeline__entry--meeting' : ''}`}>
              <span className="timeline__dot" aria-hidden="true" />
              <div className="timeline__when-row">
                <p className="timeline__when">
                  {formatShortDate(section.day)} · {formatTime(section.createdAt)} ·{' '}
                  {section.kind === 'meeting' ? (
                    <span className="timeline__kind">Reunião{section.participants ? ` com ${section.participants}` : ''}</span>
                  ) : section.projectNote ? (
                    'Nota do projeto'
                  ) : (
                    'Geral'
                  )}
                  {section.title && section.title !== projectName ? ` · ${section.title}` : ''}
                </p>
                {editingId === section.id ? (
                  <button type="button" className="line__action timeline__edit-toggle" onClick={() => setEditingId(null)}>
                    Concluir
                  </button>
                ) : (
                  <button type="button" className="line__action timeline__edit-toggle" onClick={() => setEditingId(section.id)}>
                    Editar
                  </button>
                )}
              </div>
              {editingId === section.id ? (
                <SectionEditor section={section} today={today} />
              ) : (
                notes.map((note) => <NoteLine key={note.id} note={note} />)
              )}
              {owners.length > 0 && <ResourceLink sectionId={section.id} owners={owners} />}
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

/** "Nova nota": Enter saves, Shift + Enter breaks the line, Escape gives up. Each line becomes a note. */
function NewNoteField({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const [text, setText] = useState('');
  function save() {
    const typed = text;
    onDone();
    if (typed.trim()) write(() => createProjectNote(appContext, projectId, typed));
  }
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onDone();
    } else if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      save();
    }
  }
  return (
    <textarea
      className="text-input timeline__new"
      value={text}
      autoFocus
      rows={Math.max(2, text.split('\n').length)}
      placeholder="Nova nota"
      onChange={(event) => setText(event.target.value)}
      onBlur={save}
      onKeyDown={onKeyDown}
      aria-label="Nova nota do projeto"
    />
  );
}

/**
 * A whole entry in the day note's line editor: Enter breaks a note in two, Backspace at the
 * start joins it to the note above, and Markdown shows formatted outside the line being edited.
 * The lines stay notes. It reads the section itself, so a line just emptied does not vanish.
 */
function SectionEditor({ section, today }: { section: Section; today: DayKey }) {
  const blocks = useLiveQuery(() => reader.blocksInSections([section.id]), [section.id]);
  const lines = (blocks ?? []).filter((block) => block.kind === 'note').sort(comparePositions);

  const handlers: LineHandlers = {
    onSaveText: (block, text) => write(() => updateBlockText(appContext, block.id, text)),
    onEnter: (block, text, caret, newCaret = 0) => {
      const index = lines.findIndex((line) => line.id === block.id);
      const next = lines[index + 1];
      const id = appContext.ids.next();
      requestFocus(id, newCaret);
      write(() => splitKeptNote(appContext, block.id, text, caret, positionBetween(block.position, next?.position ?? null), id));
    },
    onBackspaceAtStart: (block, text) => {
      const index = lines.findIndex((line) => line.id === block.id);
      const previous = index > 0 ? lines[index - 1] : null;
      if (previous) {
        requestFocus(previous.id, previous.text.length);
        write(() => mergeKeptNote(appContext, block.id, text, previous.id));
      }
    },
    onMakeTask: () => {},
    onToggleDone: () => {},
    onArrow: (block, direction) => {
      const index = lines.findIndex((line) => line.id === block.id);
      const target = lines[index + (direction === 'up' ? -1 : 1)];
      if (target) requestFocus(target.id, direction === 'up' ? 'end' : 0);
    },
    onSetDate: () => {},
    onSetDeadline: () => {},
    onTogglePriority: () => {},
  };

  return (
    <div className="timeline__editor">
      {lines.map((note) => (
        <BlockLine key={note.id} block={note} free notesOnly day={null} today={today} isPriority={false} allowNewLines handlers={handlers} />
      ))}
    </div>
  );
}

/** A note in the timeline, its Markdown formatted; on hover, delete with a second click to confirm. */
function NoteLine({ note }: { note: Block }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="timeline__note-row">
      <p className="timeline__note">
        <MarkdownText text={note.text} />
      </p>
      <span className="timeline__note-actions">
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
