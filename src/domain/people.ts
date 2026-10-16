import { daysBetween, toDayKey, type DayKey } from './day';
import type { Block, Person, Section } from './entities';

/**
 * People cited with `@Nome` (spec/pessoas.md). A mention is read from the line's text every
 * time, never stored apart, so renaming or merging people rewrites the text instead.
 */

const NAME_CHAR = /[\p{L}\p{N}_]/u;
/** `@` at the start or after anything that cannot be part of a name, so "a@b.com" is no mention. */
const MENTION = /(^|[^\p{L}\p{N}_@])@([\p{L}\p{N}_]+)/gu;
const PERSON_NAME = /^[\p{L}\p{N}_]+$/u;

/** How many people the `@` suggests at most. */
export const MAX_PERSON_SUGGESTIONS = 5;

/** Case does not count, accents do: `@ana` is `@Ana`, `@Aná` is someone else. */
export function personKey(name: string): string {
  return name.toLocaleLowerCase('pt-BR');
}

/** A person's name is one word: letters, digits and `_`. */
export function isPersonName(name: string): boolean {
  return PERSON_NAME.test(name);
}

/**
 * The mention starting at `i`, as `@` plus the name, or null. `before` is the character right
 * before it, or '' at the start: an `@` inside a word, as in an e-mail, is no mention.
 */
export function mentionStartingAt(text: string, i: number, before: string): { name: string; length: number } | null {
  if (text[i] !== '@' || (before !== '' && (NAME_CHAR.test(before) || before === '@'))) return null;
  let end = i + 1;
  while (end < text.length && NAME_CHAR.test(text[end])) end++;
  return end === i + 1 ? null : { name: text.slice(i + 1, end), length: end - i };
}

/** The names cited in a text, in order, each once. */
export function mentionedNames(text: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const match of text.matchAll(MENTION)) {
    const key = personKey(match[2]);
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(match[2]);
  }
  return names;
}

/** The person with this name, archived ones included; merged people no longer count. */
export function findPerson(name: string, people: readonly Person[]): Person | null {
  const key = personKey(name);
  return people.find((person) => person.status !== 'merged' && personKey(person.name) === key) ?? null;
}

/** Every known person a text cites, in order. */
export function mentionedPeople(text: string, people: readonly Person[]): Person[] {
  return mentionedNames(text)
    .map((name) => findPerson(name, people))
    .filter((person): person is Person => person !== null);
}

/** Names cited in a text that are nobody yet: the people to create when I leave the line. */
export function unknownNames(text: string, people: readonly Person[]): string[] {
  return mentionedNames(text).filter((name) => findPerson(name, people) === null);
}

/**
 * The person a task is about: the first one it cites. Each pending item involves one person
 * only (spec/pessoas.md).
 */
export function taskPerson(task: Block, people: readonly Person[]): Person | null {
  return mentionedPeople(task.text, people)[0] ?? null;
}

/** The mention being typed at the caret: from the `@` to the end of the word. */
export interface MentionAtCaret {
  /** Index of the `@`. */
  start: number;
  /** Index right after the word. */
  end: number;
  /** What was typed after the `@`, up to the caret. */
  query: string;
}

export function mentionAt(text: string, caret: number): MentionAtCaret | null {
  let at = caret;
  while (at > 0 && NAME_CHAR.test(text[at - 1])) at--;
  if (at === 0 || text[at - 1] !== '@') return null;
  const start = at - 1;
  const before = start > 0 ? text[start - 1] : '';
  if (before !== '' && (NAME_CHAR.test(before) || before === '@')) return null;
  let end = caret;
  while (end < text.length && NAME_CHAR.test(text[end])) end++;
  return { start, end, query: text.slice(at, caret) };
}

/** Puts `@name` in place of the mention being typed, followed by a space; returns the caret after it. */
export function completeMention(text: string, mention: MentionAtCaret, name: string): { text: string; caret: number } {
  const after = text.slice(mention.end);
  const spacer = after.startsWith(' ') ? '' : ' ';
  const inserted = `@${name}${spacer}`;
  return { text: text.slice(0, mention.start) + inserted + after, caret: mention.start + inserted.length + (spacer ? 0 : 1) };
}

export type PersonOption = { type: 'person'; person: Person } | { type: 'create'; name: string };

/**
 * What the `@` suggests for the typed query: active people whose name starts with it, then
 * creating a person with that name when nobody has it. Archived people are not suggested.
 */
export function personOptions(query: string, people: readonly Person[]): PersonOption[] {
  const key = personKey(query);
  const matching = people
    .filter((person) => person.status === 'active' && personKey(person.name).startsWith(key))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    .slice(0, MAX_PERSON_SUGGESTIONS)
    .map((person): PersonOption => ({ type: 'person', person }));
  if (query === '' || !isPersonName(query) || findPerson(query, people)) return matching;
  return [...matching, { type: 'create', name: query }];
}

/** Rewrites every `@from` in a text as `@to`, whatever the case it was typed in. */
export function renameMentions(text: string, from: string, to: string): string {
  const key = personKey(from);
  return text.replace(MENTION, (whole, before: string, name: string) => (personKey(name) === key ? `${before}@${to}` : whole));
}

/** An open item between me and a person, with how long it has been open. */
export interface PersonItem {
  task: Block;
  /** Days since the task was written. */
  openDays: number;
}

export interface PersonMention {
  note: Block;
  section: Section | null;
}

export interface PersonPage {
  person: Person;
  /** Active tasks citing the person: what I owe them. Oldest first. */
  iOwe: PersonItem[];
  /** Active waiting tasks citing the person: what they owe me. Oldest first. */
  theyOwe: PersonItem[];
  /** Notes citing the person, newest first. */
  mentions: PersonMention[];
}

function openDays(task: Block, today: DayKey): number {
  return Math.max(0, daysBetween(toDayKey(new Date(task.createdAt)), today));
}

const oldestFirst = (a: PersonItem, b: PersonItem) => (a.task.createdAt < b.task.createdAt ? -1 : a.task.createdAt > b.task.createdAt ? 1 : 0);

function isOpenTask(block: Block): boolean {
  return block.kind === 'task' && block.status === 'active';
}

export function buildPersonPage(
  person: Person,
  blocks: readonly Block[],
  people: readonly Person[],
  sectionsById: ReadonlyMap<string, Section>,
  today: DayKey,
): PersonPage {
  const iOwe: PersonItem[] = [];
  const theyOwe: PersonItem[] = [];
  const mentions: PersonMention[] = [];
  for (const block of blocks) {
    if (block.kind === 'task') {
      if (!isOpenTask(block) || taskPerson(block, people)?.id !== person.id) continue;
      (block.waiting ? theyOwe : iOwe).push({ task: block, openDays: openDays(block, today) });
    } else if (block.text.trim() !== '' && mentionedPeople(block.text, people).some((each) => each.id === person.id)) {
      mentions.push({ note: block, section: sectionsById.get(block.sectionId) ?? null });
    }
  }
  mentions.sort((a, b) => (a.note.createdAt < b.note.createdAt ? 1 : a.note.createdAt > b.note.createdAt ? -1 : 0));
  return { person, iOwe: iOwe.sort(oldestFirst), theyOwe: theyOwe.sort(oldestFirst), mentions };
}

export interface PersonSummary {
  person: Person;
  iOwe: number;
  theyOwe: number;
  /** Days the oldest open item has been open; null with nothing open. */
  oldestOpenDays: number | null;
}

export interface WaitingItem extends PersonItem {
  /** Null when the task cites nobody. */
  person: Person | null;
}

export interface PeopleOverview {
  /** Active people, by name. */
  active: PersonSummary[];
  archived: PersonSummary[];
  /** Every open waiting task, oldest first. */
  waiting: WaitingItem[];
}

/** The "Pessoas" screen: each person with what is open between us, and everything I am waiting for. */
export function buildPeopleOverview(people: readonly Person[], blocks: readonly Block[], today: DayKey): PeopleOverview {
  const summaries = new Map<string, PersonSummary>();
  for (const person of people) {
    if (person.status !== 'merged') summaries.set(person.id, { person, iOwe: 0, theyOwe: 0, oldestOpenDays: null });
  }
  const waiting: WaitingItem[] = [];
  for (const block of blocks) {
    if (!isOpenTask(block)) continue;
    const person = taskPerson(block, people);
    const days = openDays(block, today);
    if (block.waiting) waiting.push({ task: block, openDays: days, person });
    const summary = person ? summaries.get(person.id) : undefined;
    if (!summary) continue;
    if (block.waiting) summary.theyOwe++;
    else summary.iOwe++;
    summary.oldestOpenDays = Math.max(summary.oldestOpenDays ?? 0, days);
  }
  const byName = (a: PersonSummary, b: PersonSummary) => a.person.name.localeCompare(b.person.name, 'pt-BR');
  const all = [...summaries.values()].sort(byName);
  return {
    active: all.filter((summary) => summary.person.status === 'active'),
    archived: all.filter((summary) => summary.person.status === 'archived'),
    waiting: waiting.sort(oldestFirst),
  };
}
