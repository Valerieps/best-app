import type { Block, Project } from './entities';
import { normalizeForMatch } from './text';

/**
 * The project tag on a line (spec/nota-do-dia.md, "Tag de projeto na linha"; ADR-065): `#Nome`
 * for a one-word name, `#[Nome com espaços]` for any other. Read from the text every time, like
 * the mention; the block's `projectId` follows the tag when it changes.
 */

/** How many projects the `#` suggests at most. */
export const MAX_TAG_SUGGESTIONS = 5;

const TAG_BEFORE = /[\s([{"'*_~“‘]/u;
const BARE_START = /\p{L}/u;
const BARE_CHAR = /[\p{L}\p{N}_-]/u;

/** A tag found in a text: `start` is the `#`, `end` is right after the tag. */
export interface TagMatch {
  start: number;
  end: number;
  name: string;
}

/**
 * Whether a `#` right after `before` ('' at the start) may start a tag: the start of the line, a
 * space or an opening mark. Not inside a word (`C#`), an address (`/#x`) or after `#` or `\`.
 */
function canStartAfter(before: string): boolean {
  return before === '' || TAG_BEFORE.test(before);
}

/**
 * The tag starting at `i`, or null. `before` is the character right before it, or '' at the
 * start. A bare name ends before a trailing `-`, so "#Foo-" is the tag "Foo".
 */
export function tagStartingAt(text: string, i: number, before: string): { name: string; length: number } | null {
  if (text[i] !== '#' || !canStartAfter(before)) return null;
  if (text[i + 1] === '[') {
    let name = '';
    let j = i + 2;
    while (j < text.length && text[j] !== ']') {
      if (text[j] === '\\' && (text[j + 1] === ']' || text[j + 1] === '\\')) {
        name += text[j + 1];
        j += 2;
        continue;
      }
      name += text[j];
      j += 1;
    }
    if (j >= text.length || name.trim() === '') return null;
    return { name, length: j + 1 - i };
  }
  if (!BARE_START.test(text[i + 1] ?? '')) return null;
  let end = i + 2;
  while (end < text.length && BARE_CHAR.test(text[end])) end++;
  while (text[end - 1] === '-') end--;
  return { name: text.slice(i + 1, end), length: end - i };
}

/**
 * Every tag in a text, in order. Escaped characters (`\#`) and code spans (`` `x` ``) are
 * skipped, as the day note's Markdown does.
 */
export function findTags(text: string): TagMatch[] {
  const tags: TagMatch[] = [];
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (char === '\\' && i + 1 < text.length) {
      i += 2;
      continue;
    }
    if (char === '`') {
      const close = text.indexOf('`', i + 1);
      if (close > i + 1) {
        i = close + 1;
        continue;
      }
    }
    const tag = tagStartingAt(text, i, i > 0 ? text[i - 1] : '');
    if (tag) {
      tags.push({ start: i, end: i + tag.length, name: tag.name });
      i += tag.length;
      continue;
    }
    i += 1;
  }
  return tags;
}

/** The names tagged in a text, in order. */
export function taggedNames(text: string): string[] {
  return findTags(text).map((tag) => tag.name);
}

/** How the tag of a project is written: bare when the name is one word, in brackets otherwise. */
export function formatTag(name: string): string {
  let length = 0;
  if (BARE_START.test(name[0] ?? '')) {
    length = 1;
    while (length < name.length && BARE_CHAR.test(name[length])) length++;
  }
  if (length === name.length && !name.endsWith('-')) return `#${name}`;
  return `#[${name.replace(/[\\\]]/g, (char) => `\\${char}`)}]`;
}

/**
 * The project a tag name points to: the name matches loosely (case, accents and spaces), merged
 * projects never count, and an active project wins over a finished one.
 */
export function findTaggedProject(name: string, projects: readonly Project[]): Project | null {
  const key = normalizeForMatch(name);
  if (!key) return null;
  let found: Project | null = null;
  for (const project of projects) {
    if (project.status === 'merged' || normalizeForMatch(project.name) !== key) continue;
    if (project.status === 'active') return project;
    found ??= project;
  }
  return found;
}

/** The project the line is tagged with: the first tag that names a project. */
export function tagProject(text: string, projects: readonly Project[]): Project | null {
  for (const name of taggedNames(text)) {
    const project = findTaggedProject(name, projects);
    if (project) return project;
  }
  return null;
}

/**
 * The block's `projectId` after its text changed from `previousText` (null for a new block) to
 * `block.text` (ADR-065). Only a change of tag moves it: a new tag gives the tagged project, a
 * tag taken off gives back the section's project (a task) or none (a note). With the same tag,
 * the current `projectId` stays, so a project chosen at the closing is not undone by an edit.
 */
export function projectAfterText(
  block: Pick<Block, 'kind' | 'text' | 'projectId'>,
  previousText: string | null,
  sectionProjectId: string | null,
  projects: readonly Project[],
): string | null {
  const now = tagProject(block.text, projects)?.id ?? null;
  const before = previousText === null ? null : (tagProject(previousText, projects)?.id ?? null);
  if (now === before) return block.projectId;
  if (now !== null) return now;
  return block.kind === 'task' ? sectionProjectId : null;
}

/** Rewrites the tags that point to `projectId` as tags of `name`. */
export function renameTags(text: string, projectId: string, name: string, projects: readonly Project[]): string {
  const tags = findTags(text);
  let result = '';
  let from = 0;
  for (const tag of tags) {
    if (findTaggedProject(tag.name, projects)?.id !== projectId) continue;
    result += text.slice(from, tag.start) + formatTag(name);
    from = tag.end;
  }
  return from === 0 ? text : result + text.slice(from);
}

/** The tag being typed at the caret: from the `#` up to the caret. */
export interface TagAtCaret {
  /** Index of the `#`. */
  start: number;
  /** Index right after what the completion replaces. */
  end: number;
  /** What was typed after the `#` (or `#[`), up to the caret. */
  query: string;
}

/** Whether `index` falls inside a code span or right after a backslash. */
function isLiteralAt(text: string, index: number): boolean {
  let i = 0;
  while (i < index) {
    if (text[i] === '\\') {
      if (i + 1 === index) return true;
      i += 2;
      continue;
    }
    if (text[i] === '`') {
      const close = text.indexOf('`', i + 1);
      if (close > i + 1) {
        if (index < close) return true;
        i = close + 1;
        continue;
      }
    }
    i += 1;
  }
  return false;
}

/**
 * The tag being typed at the caret, or null. The query may have spaces, so "#Data St" still
 * looks for "Data Studios"; `tagOptions` gives nothing once no project matches, which ends it.
 * `# ` at the start is a heading, and a `#` escaped or inside code starts nothing.
 */
export function tagAt(text: string, caret: number): TagAtCaret | null {
  if (caret <= 0) return null;
  const hash = text.lastIndexOf('#', caret - 1);
  if (hash === -1) return null;
  if (!canStartAfter(hash > 0 ? text[hash - 1] : '') || isLiteralAt(text, hash)) return null;
  const bracket = text[hash + 1] === '[';
  const query = text.slice(hash + (bracket ? 2 : 1), caret);
  if (query.startsWith(' ') || query.includes(']') || query.includes('#') || query.includes('`')) return null;
  let end = caret;
  if (bracket) {
    const close = text.indexOf(']', caret);
    if (close !== -1 && !text.slice(caret, close).includes('#')) end = close + 1;
  } else {
    while (end < text.length && BARE_CHAR.test(text[end])) end++;
  }
  return { start: hash, end, query };
}

/** Active projects whose name contains the query, by name. No "Criar o projeto…" here (spec). */
export function tagOptions(query: string, projects: readonly Project[]): Project[] {
  const key = normalizeForMatch(query);
  return projects
    .filter((project) => project.status === 'active' && normalizeForMatch(project.name).includes(key))
    .sort((a, b) => {
      const aStarts = normalizeForMatch(a.name).startsWith(key);
      const bStarts = normalizeForMatch(b.name).startsWith(key);
      return aStarts !== bStarts ? (aStarts ? -1 : 1) : a.name.localeCompare(b.name, 'pt-BR');
    })
    .slice(0, MAX_TAG_SUGGESTIONS);
}

/** Puts the project's tag in place of the one being typed, followed by a space; returns the caret after it. */
export function completeTag(text: string, tag: TagAtCaret, name: string): { text: string; caret: number } {
  const after = text.slice(tag.end);
  const spacer = after.startsWith(' ') ? '' : ' ';
  const inserted = `${formatTag(name)}${spacer}`;
  return { text: text.slice(0, tag.start) + inserted + after, caret: tag.start + inserted.length + (spacer ? 0 : 1) };
}
