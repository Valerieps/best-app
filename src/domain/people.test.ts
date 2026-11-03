import { describe, expect, it } from 'vitest';
import { note, section, task } from '../test/builders';
import type { Person } from './entities';
import {
  buildPeopleOverview,
  buildPersonPage,
  completeMention,
  findPerson,
  isPeopleTitle,
  isPersonName,
  meetingPeople,
  mentionAt,
  mentionedNames,
  mentionStartingAt,
  personOptions,
  renameMentions,
  taskPerson,
  unknownNames,
} from './people';

function person(name: string, overrides: Partial<Person> = {}): Person {
  return {
    id: `person-${name}`,
    name,
    status: 'active',
    createdAt: '2026-10-01T09:00:00.000Z',
    updatedAt: '2026-10-01T09:00:00.000Z',
    ...overrides,
  };
}

const ana = person('Ana');
const rafael = person('Rafael');
const people = [ana, rafael];

describe('mentions', () => {
  it('reads the names after an @, in order and each once', () => {
    expect(mentionedNames('@Ana falou com @Rafael e a @ana de novo.')).toEqual(['Ana', 'Rafael']);
  });

  it('ignores an @ inside a word, as in an e-mail, and a lone @', () => {
    expect(mentionedNames('Mandar para ana@empresa.com @ e @@Ana')).toEqual([]);
  });

  it('takes one word, letters with accents included', () => {
    expect(mentionedNames('Com o @Marcão, amanhã.')).toEqual(['Marcão']);
    expect(isPersonName('Ana Paula')).toBe(false);
    expect(isPersonName('Aná')).toBe(true);
  });

  it('matches people ignoring case but not accents', () => {
    expect(findPerson('ana', people)).toBe(ana);
    expect(findPerson('Aná', people)).toBeNull();
    expect(findPerson('Ana', [person('Ana', { status: 'merged' })])).toBeNull();
    expect(findPerson('Ana', [person('Ana', { status: 'archived' })])).not.toBeNull();
  });

  it('lists the names nobody has yet', () => {
    expect(unknownNames('@Ana e @Paula', people)).toEqual(['Paula']);
  });

  it('gives a task to the first person it cites', () => {
    expect(taskPerson(task('s', 'Cobrar @Rafael e @Ana'), people)).toBe(rafael);
    expect(taskPerson(task('s', 'Sem ninguém'), people)).toBeNull();
  });

  it('finds a mention starting at an index only after a non-name character', () => {
    expect(mentionStartingAt('oi @Ana!', 3, ' ')).toEqual({ name: 'Ana', length: 4 });
    expect(mentionStartingAt('a@Ana', 1, 'a')).toBeNull();
    expect(mentionStartingAt('@ ', 0, '')).toBeNull();
  });

  it('rewrites a name in every case it was typed', () => {
    expect(renameMentions('@ana e @Ana, mas não @Anabela nem a@ana.com', 'Ana', 'Aninha')).toBe(
      '@Aninha e @Aninha, mas não @Anabela nem a@ana.com',
    );
  });
});

describe('typing a mention', () => {
  it('finds the mention under the caret', () => {
    expect(mentionAt('Falar com @Ra', 13)).toEqual({ start: 10, end: 13, query: 'Ra' });
    expect(mentionAt('Falar com @', 11)).toEqual({ start: 10, end: 11, query: '' });
    expect(mentionAt('Falar com @Rafael hoje', 13)).toEqual({ start: 10, end: 17, query: 'Ra' });
  });

  it('is no mention away from an @, or inside an e-mail', () => {
    expect(mentionAt('Falar com Ra', 12)).toBeNull();
    expect(mentionAt('ana@emp', 7)).toBeNull();
    expect(mentionAt('@Ana e mais', 8)).toBeNull();
  });

  it('completes the name and puts the caret after a space', () => {
    const text = 'Falar com @Ra';
    expect(completeMention(text, mentionAt(text, 13)!, 'Rafael')).toEqual({ text: 'Falar com @Rafael ', caret: 18 });
    const middle = 'Falar com @Ra hoje';
    expect(completeMention(middle, mentionAt(middle, 13)!, 'Rafael')).toEqual({ text: 'Falar com @Rafael hoje', caret: 18 });
  });

  it('suggests active people starting with the query, then creating a new one', () => {
    const archived = person('Raquel', { status: 'archived' });
    expect(personOptions('ra', [...people, archived])).toEqual([
      { type: 'person', person: rafael },
      { type: 'create', name: 'ra' },
    ]);
    expect(personOptions('Ro', people)).toEqual([{ type: 'create', name: 'Ro' }]);
    expect(personOptions('rafael', people)).toEqual([{ type: 'person', person: rafael }]);
    expect(personOptions('', people).map((option) => option.type)).toEqual(['person', 'person']);
  });
});

describe('person page and overview', () => {
  const day = section({ day: '2026-10-05', title: 'Daily' });
  const sectionsById = new Map([[day.id, day]]);
  const owed = task(day.id, 'Mandar a planilha para a @Ana', { createdAt: '2026-10-05T09:00:00.000Z' });
  const older = task(day.id, 'Revisar o texto com a @Ana', { createdAt: '2026-10-01T09:00:00.000Z' });
  const waiting = task(day.id, '@Ana aprovar o orçamento', { waiting: true, createdAt: '2026-10-03T09:00:00.000Z' });
  const done = task(day.id, '@Ana já fez', { status: 'done' });
  const mention = note(day.id, 'A @ana gostou da ideia', { createdAt: '2026-10-05T10:00:00.000Z' });
  const other = task(day.id, 'Falar com o @Rafael', { waiting: true, createdAt: '2026-10-04T09:00:00.000Z' });
  const blocks = [owed, older, waiting, done, mention, other];

  it('splits what I owe and what they owe, oldest first, with the notes as mentions', () => {
    const page = buildPersonPage(ana, blocks, people, sectionsById, '2026-10-11');
    expect(page.iOwe.map((item) => [item.task.id, item.openDays])).toEqual([
      [older.id, 10],
      [owed.id, 6],
    ]);
    expect(page.theyOwe.map((item) => item.task.id)).toEqual([waiting.id]);
    expect(page.mentions).toEqual([{ note: mention, section: day }]);
  });

  it('counts the open items of each person and gathers everything I am waiting for', () => {
    const overview = buildPeopleOverview([...people, person('Zé', { status: 'archived' })], blocks, '2026-10-11');
    expect(overview.active.map((each) => [each.person.name, each.iOwe, each.theyOwe, each.oldestOpenDays])).toEqual([
      ['Ana', 2, 1, 10],
      ['Rafael', 0, 1, 7],
    ]);
    expect(overview.archived.map((each) => each.person.name)).toEqual(['Zé']);
    expect(overview.waiting.map((item) => [item.task.id, item.person?.name])).toEqual([
      [waiting.id, 'Ana'],
      [other.id, 'Rafael'],
    ]);
  });
});

describe('meetings with people', () => {
  const meeting = section({ kind: 'meeting', day: '2026-10-05', title: '@Ana @Rafael' });
  const sectionsById = new Map([[meeting.id, meeting]]);
  const plain = task(meeting.id, 'Mandar o relatório', { createdAt: '2026-10-05T09:00:00.000Z' });
  const waiting = task(meeting.id, 'Enviar o contrato', { waiting: true, createdAt: '2026-10-04T09:00:00.000Z' });
  const cited = task(meeting.id, 'Ligar para o @Rafael', { createdAt: '2026-10-03T09:00:00.000Z' });
  const finished = task(meeting.id, 'Já fiz', { status: 'done', closedAt: '2026-10-06T09:00:00.000Z' });
  const notes = note(meeting.id, 'Decidimos adiar', { createdAt: '2026-10-05T10:00:00.000Z' });
  const blocks = [plain, waiting, cited, finished, notes];

  it('reads the people from the title of a meeting that is not linked to a project', () => {
    expect(meetingPeople(meeting, people)).toEqual([ana, rafael]);
    expect(meetingPeople({ ...meeting, projectId: 'p1' }, people)).toEqual([]);
    expect(meetingPeople({ ...meeting, kind: 'general' }, people)).toEqual([]);
    expect(isPeopleTitle(' @Ana')).toBe(true);
    expect(isPeopleTitle('Daily')).toBe(false);
  });

  it('makes the first person of the title the one a task is about, unless the task cites someone', () => {
    expect(taskPerson(plain, people, meeting)).toBe(ana);
    expect(taskPerson(cited, people, meeting)).toBe(rafael);
    expect(taskPerson(plain, people, null)).toBeNull();
  });

  it('puts the tasks and notes of the meeting on the page of each person', () => {
    const page = buildPersonPage(ana, blocks, people, sectionsById, '2026-10-11');
    expect(page.iOwe.map((item) => item.task.id)).toEqual([plain.id]);
    expect(page.theyOwe.map((item) => item.task.id)).toEqual([waiting.id]);
    expect(page.active.map((item) => item.task.id)).toEqual([waiting.id, plain.id]);
    expect(page.done.map((item) => item.task.id)).toEqual([finished.id]);
    expect(page.mentions.map((each) => each.note.id)).toEqual([notes.id]);
    const other = buildPersonPage(rafael, blocks, people, sectionsById, '2026-10-11');
    expect(other.iOwe.map((item) => item.task.id)).toEqual([cited.id]);
    expect(other.mentions.map((each) => each.note.id)).toEqual([notes.id]);
  });

  it('counts them on the overview', () => {
    const overview = buildPeopleOverview(people, blocks, '2026-10-11', sectionsById);
    expect(overview.active.map((each) => [each.person.name, each.iOwe, each.theyOwe])).toEqual([
      ['Ana', 1, 1],
      ['Rafael', 1, 0],
    ]);
  });
});
