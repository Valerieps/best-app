import { useState, type FormEvent, type ReactNode } from 'react';
import { setIntendedDate } from '../../application/dayTools';
import { setTaskDone } from '../../application/notebook';
import { deletePerson, mergePeople, renamePerson, setPersonArchived } from '../../application/people';
import { loadPeopleView, loadPersonView, type PersonView } from '../../application/queries';
import type { DayKey } from '../../domain/day';
import type { Person, Section } from '../../domain/entities';
import type { PersonItem, PersonSummary } from '../../domain/people';
import { Icon } from '../components/Icon';
import { LoadingPage } from '../components/Skeleton';
import { ScreenHeader } from '../components/ScreenHeader';
import { DatePicker } from '../dayNote/BlockLine';
import { MarkdownText } from '../dayNote/MarkdownText';
import { formatShortDate, formatTime, openForLabel, relativeDay } from '../format';
import { navigate, routeHash } from '../hooks';
import { appContext, reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';
import { enqueue } from '../writeQueue';

/** The "Pessoas" screen and the page of each person (spec/pessoas.md). */

function write(work: () => Promise<unknown>) {
  enqueue(work).catch(() => {
    // Logged by the queue; the screen shows the saved state again on its own.
  });
}

function sectionLabel(section: Section | null): string {
  if (!section) return 'Origem desconhecida';
  if (section.projectPage) return `Página do projeto · ${formatShortDate(section.day)}`;
  return `${section.title ?? 'Sem título'} · ${formatShortDate(section.day)} · ${formatTime(section.createdAt)}`;
}

/** One open task between me and someone: done by the checkbox, with its age and its date. */
function ItemRow({ item, today, person, section }: { item: PersonItem; today: DayKey; person?: Person | null; section: Section | null }) {
  const { task } = item;
  const waiting = task.waiting === true;
  const dateLabel = task.intendedDate ? `${waiting ? 'cobrar ' : ''}${relativeDay(task.intendedDate, today)}` : null;
  return (
    <li className="card-list__item people__item">
      <input
        type="checkbox"
        className="line__check"
        checked={false}
        onChange={() => write(() => setTaskDone(appContext, task.id, true))}
        aria-label={waiting ? 'Concluir: chegou' : 'Finalizar tarefa'}
      />
      <span className="people__item-text">
        <MarkdownText text={task.text || '(tarefa sem texto)'} />
        <span className="muted people__item-from">{sectionLabel(section)}</span>
      </span>
      <span className="list-meta">
        {/* The person is already in the text, as a mention: only a task citing nobody says so. */}
        {person === null && <span className="chip chip--muted">sem pessoa</span>}
        <span className="muted">{openForLabel(item.openDays)}</span>
        <DatePicker
          label={waiting ? 'Data para cobrar' : 'Data de intenção'}
          className={dateLabel ? 'line__chip' : 'line__action'}
          value={task.intendedDate}
          min={today}
          onChange={(date) => write(() => setIntendedDate(appContext, task.id, date))}
          clearLabel={waiting ? 'Tirar a data para cobrar' : 'Tirar a data de intenção'}
        >
          {dateLabel ?? (waiting ? 'Cobrar' : 'Data')}
        </DatePicker>
      </span>
    </li>
  );
}

function ItemList({ items, today, empty, sectionsById, withPerson }: {
  items: (PersonItem & { person?: Person | null })[];
  today: DayKey;
  empty: string;
  sectionsById: ReadonlyMap<string, Section>;
  withPerson?: boolean;
}) {
  if (items.length === 0) return <p className="muted">{empty}</p>;
  return (
    <ul className="card-list">
      {items.map((item) => (
        <ItemRow
          key={item.task.id}
          item={item}
          today={today}
          person={withPerson ? (item.person ?? null) : undefined}
          section={sectionsById.get(item.task.sectionId) ?? null}
        />
      ))}
    </ul>
  );
}

function Group({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section className="people__group">
      <h2 className="projects__group-title">
        {title} <span className="muted">{count}</span>
      </h2>
      {children}
    </section>
  );
}

function summaryLabel(summary: PersonSummary): string {
  const parts = [
    summary.iOwe > 0 ? `eu devo ${summary.iOwe}` : null,
    summary.theyOwe > 0 ? `me deve ${summary.theyOwe}` : null,
    summary.oldestOpenDays !== null ? `mais antigo ${openForLabel(summary.oldestOpenDays)}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : 'nada em aberto';
}

function PersonList({ people }: { people: PersonSummary[] }) {
  return (
    <ul className="card-list">
      {people.map((summary) => (
        <li key={summary.person.id} className="card-list__item">
          <a className="people__name" href={routeHash({ name: 'person', id: summary.person.id })}>
            @{summary.person.name}
          </a>
          <span className="muted">{summaryLabel(summary)}</span>
        </li>
      ))}
    </ul>
  );
}

export function PeopleScreen({ today }: { today: DayKey }) {
  const view = useLiveQuery(() => loadPeopleView(reader, today), [today]);
  const [archivedOpen, setArchivedOpen] = useState(false);
  if (!view) return <LoadingPage title="Pessoas" />;
  const none = view.active.length === 0 && view.archived.length === 0;
  return (
    <main className="page">
      <ScreenHeader title="Pessoas" />
      {none ? (
        <p className="muted">
          Ninguém por aqui ainda. Escreva <strong>@Nome</strong> numa linha da nota do dia para citar alguém, ou comece a linha com{' '}
          <strong>[a]</strong> para algo que alguém te deve.
        </p>
      ) : (
        <>
          <Group title="Pessoas" count={view.active.length}>
            {view.active.length > 0 ? <PersonList people={view.active} /> : <p className="muted">Todas as pessoas estão arquivadas.</p>}
          </Group>
          <Group title="Aguardando" count={view.waiting.length}>
            <ItemList
              items={view.waiting}
              today={today}
              empty="Ninguém te deve nada agora."
              sectionsById={view.sectionsById}
              withPerson
            />
          </Group>
          {view.archived.length > 0 && (
            <section className="people__group">
              <button type="button" className="projects__toggle" aria-expanded={archivedOpen} onClick={() => setArchivedOpen(!archivedOpen)}>
                <Icon name={archivedOpen ? 'chevronDown' : 'chevronRight'} size="sm" />
                <span className="projects__group-title">Arquivadas</span>
                <span className="projects__toggle-note">· {view.archived.length}</span>
              </button>
              {archivedOpen && <PersonList people={view.archived} />}
            </section>
          )}
        </>
      )}
    </main>
  );
}

type Editing = { kind: 'rename' } | { kind: 'merge' } | { kind: 'delete' } | null;

function RenameForm({ person, onDone, onMergeInstead }: { person: Person; onDone(): void; onMergeInstead(other: Person): void }) {
  const [name, setName] = useState(person.name);
  const [problem, setProblem] = useState<{ text: string; other?: Person } | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = await enqueue(() => renamePerson(appContext, person.id, name));
    if (result.ok) onDone();
    else if (result.reason === 'taken' && result.other) setProblem({ text: `Já existe @${result.other.name}.`, other: result.other });
    else setProblem({ text: 'O nome é uma palavra só, sem espaços.' });
  }
  return (
    <form className="people__form" onSubmit={submit}>
      <label className="people__label">
        Novo nome
        <input className="text-input" value={name} autoFocus onChange={(event) => setName(event.target.value)} aria-label="Novo nome" />
      </label>
      <button type="submit" className="primary">
        Renomear
      </button>
      <button type="button" className="tertiary" onClick={onDone}>
        Cancelar
      </button>
      {problem && (
        <p className="people__problem">
          {problem.text}{' '}
          {problem.other && (
            <button type="button" className="link" onClick={() => onMergeInstead(problem.other!)}>
              Juntar com @{problem.other.name}
            </button>
          )}
        </p>
      )}
    </form>
  );
}

function MergeForm({ view, initial, onDone }: { view: PersonView; initial: string | null; onDone(): void }) {
  const [intoId, setIntoId] = useState(initial ?? view.others[0]?.id ?? '');
  if (view.others.length === 0) {
    return (
      <div className="people__form">
        <p className="muted">Não há outra pessoa para juntar.</p>
        <button type="button" className="tertiary" onClick={onDone}>
          Fechar
        </button>
      </div>
    );
  }
  const into = view.others.find((other) => other.id === intoId);
  return (
    <form
      className="people__form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!into) return;
        enqueue(() => mergePeople(appContext, view.person.id, into.id)).then(
          () => navigate({ name: 'person', id: into.id }),
          () => {},
        );
      }}
    >
      <label className="people__label">
        Juntar @{view.person.name} com
        <select className="text-input" value={intoId} onChange={(event) => setIntoId(event.target.value)}>
          {view.others.map((other) => (
            <option key={other.id} value={other.id}>
              @{other.name}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="primary">
        Juntar
      </button>
      <button type="button" className="tertiary" onClick={onDone}>
        Cancelar
      </button>
      {into && <p className="muted people__hint">As linhas que citam @{view.person.name} passam a citar @{into.name}, e fica só @{into.name}.</p>}
    </form>
  );
}

function DeleteConfirm({ person, onDone }: { person: Person; onDone(): void }) {
  return (
    <div className="people__form">
      <p>
        Apagar @{person.name}? O texto das linhas continua como está, só deixa de ser uma menção.
      </p>
      <button
        type="button"
        className="danger"
        onClick={() => enqueue(() => deletePerson(appContext, person.id)).then(() => navigate({ name: 'people' }), () => {})}
      >
        Apagar
      </button>
      <button type="button" className="tertiary" onClick={onDone}>
        Cancelar
      </button>
    </div>
  );
}

function MentionList({ view }: { view: PersonView }) {
  if (view.mentions.length === 0) return <p className="muted">Nenhuma nota cita @{view.person.name}.</p>;
  return (
    <ul className="card-list">
      {view.mentions.map(({ note, section }) => (
        <li key={note.id} className="card-list__item card-list__item--stacked">
          <span className="people__item-text">
            <MarkdownText text={note.text} />
          </span>
          <span className="muted people__item-from">{sectionLabel(section)}</span>
        </li>
      ))}
    </ul>
  );
}

export function PersonScreen({ id, today }: { id: string; today: DayKey }) {
  const view = useLiveQuery(() => loadPersonView(reader, id, today), [id, today]);
  const [editing, setEditing] = useState<Editing>(null);
  const [mergeInto, setMergeInto] = useState<string | null>(null);
  if (view === undefined) return <LoadingPage title="Pessoa" />;
  if (view === null) {
    return (
      <main className="page">
        <ScreenHeader title="Pessoa não encontrada" back={{ label: 'Pessoas', onSelect: () => navigate({ name: 'people' }) }} />
        <p className="muted">Esta pessoa foi apagada ou juntada com outra.</p>
      </main>
    );
  }
  const { person } = view;
  const archived = person.status === 'archived';
  const close = () => {
    setEditing(null);
    setMergeInto(null);
  };
  return (
    <main className="page page--wide">
      <ScreenHeader
        title={
          <span className="people__title">
            @{person.name}
            {archived && <span className="chip chip--muted">arquivada</span>}
          </span>
        }
        back={{ label: 'Pessoas', onSelect: () => navigate({ name: 'people' }) }}
        more={[
          { label: 'Renomear', onSelect: () => setEditing({ kind: 'rename' }) },
          { label: 'Juntar com outra pessoa', onSelect: () => setEditing({ kind: 'merge' }) },
          { label: archived ? 'Reativar' : 'Arquivar', onSelect: () => write(() => setPersonArchived(appContext, person.id, !archived)) },
          { label: 'Apagar', onSelect: () => setEditing({ kind: 'delete' }) },
        ]}
      />
      {editing?.kind === 'rename' && (
        <RenameForm
          person={person}
          onDone={close}
          onMergeInstead={(other) => {
            setMergeInto(other.id);
            setEditing({ kind: 'merge' });
          }}
        />
      )}
      {editing?.kind === 'merge' && <MergeForm view={view} initial={mergeInto} onDone={close} />}
      {editing?.kind === 'delete' && <DeleteConfirm person={person} onDone={close} />}

      <div className="people__columns">
        <Group title="Me deve" count={view.theyOwe.length}>
          <ItemList items={view.theyOwe} today={today} empty="Nada aguardando." sectionsById={view.sectionsById} />
        </Group>
        <Group title="Eu devo" count={view.iOwe.length}>
          <ItemList items={view.iOwe} today={today} empty="Você não deve nada a esta pessoa." sectionsById={view.sectionsById} />
        </Group>
      </div>
      <Group title="Menções" count={view.mentions.length}>
        <MentionList view={view} />
      </Group>
    </main>
  );
}

