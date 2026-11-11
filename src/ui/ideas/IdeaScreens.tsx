import { useEffect, useState } from 'react';
import { abandonTask, deleteKeptNote, mergeKeptNote, pasteLines, setTaskDone, updateBlockText } from '../../application/notebook';
import { setDeadline, setIntendedDate } from '../../application/dayTools';
import { addIdeaLine, changeIdeaLineKind, dropIdea, ideaToProject, ideaToTask, notYetIdea, splitIdeaLine } from '../../application/ideas';
import { loadIdea, loadIdeas, type IdeaView } from '../../application/queries';
import type { DayKey } from '../../domain/day';
import type { Block } from '../../domain/entities';
import { isOpenIdea } from '../../domain/ideas';
import { positionBetween } from '../../domain/position';
import { ProjectChip } from '../components/Chips';
import { Icon } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import { LoadingPage } from '../components/Skeleton';
import { BlockLine, GhostLine, type LineHandlers } from '../dayNote/BlockLine';
import { FormatToolbar } from '../dayNote/FormatToolbar';
import { MarkdownText } from '../dayNote/MarkdownText';
import { requestFocus } from '../dayNote/focus';
import { chainedPositions } from '../dayNote/paste';
import { formatShortDate } from '../format';
import { navigate, routeHash } from '../hooks';
import { appContext, reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';
import { enqueue } from '../writeQueue';

/** "Ideias" and the page of each idea (spec/ideias.md). */

function write(work: () => Promise<unknown>) {
  enqueue(work).catch(() => {
    // Logged by the queue; the screen shows the saved state again on its own.
  });
}

const backToIdeas = { label: 'Ideias', onSelect: () => navigate({ name: 'ideas' }) };

function notYetLabel(count: number | undefined): string | null {
  return count ? `ainda não ${count}×` : null;
}

/** Every idea without a destination, oldest first; each opens its page. */
export function IdeasScreen() {
  const items = useLiveQuery(() => loadIdeas(reader));
  if (items === undefined) return <LoadingPage title="Ideias" />;
  return (
    <main className="page">
      <ScreenHeader title="Ideias" />
      {items.length === 0 ? (
        <p className="muted">Nenhuma ideia esperando. Comece uma linha com [?] e espaço para capturar uma.</p>
      ) : (
        <ul className="card-list">
          {items.map(({ idea, project, day }) => {
            const notYet = notYetLabel(idea.notYetCount);
            return (
              <li key={idea.id} className="card-list__item ideas__item" onClick={() => navigate({ name: 'idea', id: idea.id })}>
                <span className="line__idea" aria-hidden="true">
                  <Icon name="bulb" size="sm" />
                </span>
                <span className="ideas__text">
                  <a href={routeHash({ name: 'idea', id: idea.id })} className="ideas__link" onClick={(event) => event.stopPropagation()}>
                    <MarkdownText text={idea.text || '(ideia sem texto)'} />
                  </a>
                  <span className="muted ideas__meta">{day ? `escrita em ${formatShortDate(day)}` : ''}</span>
                </span>
                <span className="list-meta">
                  {notYet && <span className="chip chip--muted">{notYet}</span>}
                  {project && <ProjectChip name={project.name} />}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

/** An idea's page: its text, where it came from, what I think about it, and its destinations. */
export function IdeaScreen({ id, today }: { id: string; today: DayKey }) {
  const view = useLiveQuery(() => loadIdea(reader, id), [id]);
  if (view === undefined) return <LoadingPage title="Ideia" />;
  if (view === null) {
    return (
      <main className="page">
        <ScreenHeader title="Ideia não encontrada" back={backToIdeas} />
        <p className="muted">A linha foi apagada ou deixou de ser uma ideia.</p>
      </main>
    );
  }
  return <IdeaPage view={view} today={today} />;
}

function IdeaPage({ view, today }: { view: IdeaView; today: DayKey }) {
  const { idea, project, day } = view;
  const open = isOpenIdea(idea);
  const [title, setTitle] = useState(idea.text);
  useEffect(() => setTitle(idea.text), [idea.text]);
  const notYet = notYetLabel(idea.notYetCount);

  return (
    <main className="page">
      <ScreenHeader
        title={
          <textarea
            className="idea__title"
            rows={1}
            value={title}
            readOnly={!open}
            onChange={(event) => setTitle(event.target.value.replace(/\n/g, ' '))}
            onBlur={() => title !== idea.text && write(() => updateBlockText(appContext, idea.id, title))}
            onKeyDown={(event) => event.key === 'Enter' && (event.preventDefault(), event.currentTarget.blur())}
            aria-label="Ideia"
          />
        }
        back={backToIdeas}
      />
      <div className="idea__meta">
        {project && <ProjectChip name={project.name} href={routeHash({ name: 'project', id: project.id })} />}
        {day && <span className="muted">escrita em {formatShortDate(day)}</span>}
        {notYet && <span className="chip chip--muted">{notYet}</span>}
        {idea.ideaStatus === 'becameProject' && <span className="chip chip--muted">virou projeto</span>}
        {idea.ideaStatus === 'dropped' && <span className="chip chip--muted">largada</span>}
      </div>
      {open && <Destinations idea={idea} />}
      {open && <FormatToolbar />}
      <IdeaLines idea={idea} lines={view.lines} today={today} editable={open} />
    </main>
  );
}

/** The four destinations (spec/ideias.md, "Destinos"). */
function Destinations({ idea }: { idea: Block }) {
  return (
    <div className="idea__destinations" role="group" aria-label="Destino da ideia">
      <button type="button" onClick={() => enqueue(() => ideaToTask(appContext, idea.id)).then(() => navigate({ name: 'ideas' }), () => {})}>
        Virar tarefa
      </button>
      <button
        type="button"
        onClick={() =>
          enqueue(() => ideaToProject(appContext, idea.id)).then(
            (projectId) => navigate(projectId ? { name: 'project', id: projectId } : { name: 'ideas' }),
            () => {},
          )
        }
      >
        Virar projeto
      </button>
      <button type="button" onClick={() => enqueue(() => dropIdea(appContext, idea.id)).then(() => navigate({ name: 'ideas' }), () => {})}>
        Largar
      </button>
      <button
        type="button"
        className="tertiary"
        title="A ideia volta para a fila"
        onClick={() => enqueue(() => notYetIdea(appContext, idea.id)).then(() => navigate({ name: 'ideas' }), () => {})}
      >
        Ainda não
      </button>
    </div>
  );
}

/**
 * What I write about the idea, in the day note's line editor: notes, and tasks ("[] ") or ideas
 * ("[?] ") that take the idea's project.
 */
function IdeaLines({ idea, lines, today, editable }: { idea: Block; lines: Block[]; today: DayKey; editable: boolean }) {
  const [ghostId] = useState(() => appContext.ids.next());

  if (!editable) {
    return (
      <div className="idea__lines">
        {lines.map((line) => (
          <p key={line.id} className="timeline__note">
            <MarkdownText text={line.text} />
          </p>
        ))}
      </div>
    );
  }

  const indexOf = (block: Block) => lines.findIndex((line) => line.id === block.id);
  const handlers: LineHandlers = {
    onSaveText: (block, text) => write(() => updateBlockText(appContext, block.id, text)),
    onEnter: (block, text, caret, newCaret = 0) => {
      const next = lines[indexOf(block) + 1];
      const newId = appContext.ids.next();
      requestFocus(newId, newCaret);
      write(() => splitIdeaLine(appContext, block.id, text, caret, positionBetween(block.position, next?.position ?? null), newId));
    },
    onPasteLines: (block, pasted, options) => {
      const positions = chainedPositions(block.position, lines[indexOf(block) + 1]?.position ?? null, pasted.length - 1, positionBetween);
      const targets = positions.map((position) => ({ sectionId: block.sectionId, position, blockId: appContext.ids.next() }));
      requestFocus(targets[targets.length - 1].blockId, options.caret);
      write(() => pasteLines(appContext, block.id, pasted, targets, { detectFirst: false, detectRest: false, kept: true }));
    },
    onBackspaceAtStart: (block, text) => {
      if (block.kind !== 'note') return;
      const previous = lines[indexOf(block) - 1];
      if (previous?.kind === 'note') {
        requestFocus(previous.id, previous.text.length);
        write(() => mergeKeptNote(appContext, block.id, text, previous.id));
      } else if (text === '') {
        if (previous) requestFocus(previous.id, 'end');
        write(() => deleteKeptNote(appContext, block.id));
      }
    },
    onMakeTask: (block, text, _waiting, kind = 'task') => write(() => changeIdeaLineKind(appContext, block.id, kind, text)),
    onOpenIdea: (block) => navigate({ name: 'idea', id: block.id }),
    onToggleDone: (block, done) => write(() => setTaskDone(appContext, block.id, done)),
    onArrow: (block, direction) => {
      const target = lines[indexOf(block) + (direction === 'up' ? -1 : 1)];
      if (target) requestFocus(target.id, direction === 'up' ? 'end' : 0);
    },
    onSetDate: (block, date) => write(() => setIntendedDate(appContext, block.id, date)),
    onSetDeadline: (block, date) => write(() => setDeadline(appContext, block.id, date)),
    // The day's priorities are chosen in the day note.
    onTogglePriority: () => {},
    onAbandon: (block) => write(() => abandonTask(appContext, block.id)),
  };

  return (
    <div className="idea__lines">
      {lines.map((line) => (
        <BlockLine
          key={line.id}
          block={line}
          free={line.kind === 'note'}
          day={null}
          today={today}
          isPriority={false}
          allowNewLines
          handlers={handlers}
        />
      ))}
      {lines.length === 0 && (
        <GhostLine
          id={ghostId}
          placeholder="O que eu penso sobre esta ideia. [] cria uma tarefa."
          onCreate={(text, caret) => {
            requestFocus(ghostId, caret ?? text.length);
            write(() => addIdeaLine(appContext, idea.id, text, positionBetween(null, null), ghostId));
          }}
        />
      )}
    </div>
  );
}
