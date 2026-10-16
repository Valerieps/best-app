import { toDayKey } from '../domain/day';
import type { Person } from '../domain/entities';
import { findPerson, isPersonName, renameMentions } from '../domain/people';
import { record } from './events';
import type { AppContext, StoreTransaction } from './ports';

/** Use cases of the people cited with `@Nome` (spec/pessoas.md). */

function nowIso(ctx: AppContext): string {
  return ctx.clock.now().toISOString();
}

function today(ctx: AppContext) {
  return toDayKey(ctx.clock.now());
}

/**
 * The person with this name, created when nobody has it yet. An archived person with the name is
 * returned as is: citing someone does not bring them back from the archive.
 */
export async function addPersonIn(ctx: AppContext, tx: StoreTransaction, name: string, known: readonly Person[]): Promise<Person> {
  if (!isPersonName(name)) throw new Error('A person name is one word');
  const existing = findPerson(name, known);
  if (existing) return existing;
  const at = nowIso(ctx);
  const person: Person = { id: ctx.ids.next(), name, status: 'active', createdAt: at, updatedAt: at };
  await tx.people.put(person);
  await record(ctx, tx, 'person.created', 'person', person.id, today(ctx), { name });
  return person;
}

/**
 * Creates the people a line cites who do not exist yet, as when I leave the line without
 * choosing anyone from the suggestions (spec/pessoas.md). Returns the ones created.
 */
export async function ensurePeople(ctx: AppContext, names: readonly string[]): Promise<Person[]> {
  const valid = names.filter(isPersonName);
  if (valid.length === 0) return [];
  return ctx.store.transaction(async (tx) => {
    const known = await tx.allPeople();
    const created: Person[] = [];
    for (const name of valid) {
      if (findPerson(name, [...known, ...created])) continue;
      created.push(await addPersonIn(ctx, tx, name, known));
    }
    return created;
  });
}

export async function createPerson(ctx: AppContext, name: string): Promise<Person> {
  return ctx.store.transaction(async (tx) => addPersonIn(ctx, tx, name, await tx.allPeople()));
}

/** Rewrites `@from` as `@to` in every line that cites it. Plain text edits are not events (ADR-004). */
async function rewriteMentions(ctx: AppContext, tx: StoreTransaction, from: string, to: string): Promise<void> {
  const at = nowIso(ctx);
  for (const block of await tx.blocksWithMentions()) {
    const text = renameMentions(block.text, from, to);
    if (text !== block.text) await tx.blocks.put({ ...block, text, updatedAt: at });
  }
}

export type RenameResult = { ok: true } | { ok: false; reason: 'invalid' | 'taken'; other?: Person };

/**
 * Renames a person, and the name changes in every line that cites them. A name another person
 * already has is refused, with that person, so the screen can offer to merge the two instead.
 */
export async function renamePerson(ctx: AppContext, personId: string, name: string): Promise<RenameResult> {
  const next = name.trim();
  if (!isPersonName(next)) return { ok: false, reason: 'invalid' };
  return ctx.store.transaction(async (tx) => {
    const person = await tx.people.get(personId);
    if (!person) return { ok: false, reason: 'invalid' };
    if (person.name === next) return { ok: true };
    const others = (await tx.allPeople()).filter((each) => each.id !== person.id);
    const other = findPerson(next, others);
    if (other) return { ok: false, reason: 'taken', other };
    await tx.people.put({ ...person, name: next, updatedAt: nowIso(ctx) });
    await record(ctx, tx, 'person.renamed', 'person', person.id, today(ctx), { from: person.name, to: next });
    // Also when only the case changed, so the lines show the name as it is now.
    await rewriteMentions(ctx, tx, person.name, next);
    return { ok: true };
  });
}

/** Joins `fromId` into `intoId`: the lines that cited the first now cite the second. */
export async function mergePeople(ctx: AppContext, fromId: string, intoId: string): Promise<void> {
  if (fromId === intoId) return;
  await ctx.store.transaction(async (tx) => {
    const from = await tx.people.get(fromId);
    const into = await tx.people.get(intoId);
    if (!from || !into || from.status === 'merged' || into.status === 'merged') return;
    await rewriteMentions(ctx, tx, from.name, into.name);
    await tx.people.put({ ...from, status: 'merged', mergedInto: into.id, updatedAt: nowIso(ctx) });
    await record(ctx, tx, 'person.merged', 'person', from.id, today(ctx), { into: into.id });
  });
}

/** An archived person leaves the `@` suggestions; their lines keep citing them. */
export async function setPersonArchived(ctx: AppContext, personId: string, archived: boolean): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const person = await tx.people.get(personId);
    if (!person || person.status === 'merged' || (person.status === 'archived') === archived) return;
    await tx.people.put({ ...person, status: archived ? 'archived' : 'active', updatedAt: nowIso(ctx) });
    await record(ctx, tx, 'person.archived', 'person', person.id, today(ctx), { archived });
  });
}

/** Deletes a person. The lines keep their text, which is just no longer a mention of anyone. */
export async function deletePerson(ctx: AppContext, personId: string): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const person = await tx.people.get(personId);
    if (!person) return;
    await tx.people.delete(person.id);
    await record(ctx, tx, 'person.deleted', 'person', person.id, today(ctx), { name: person.name });
  });
}
