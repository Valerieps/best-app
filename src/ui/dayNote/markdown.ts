/**
 * Markdown on the lines of the day note (spec/nota-do-dia.md, "Formatação"). Each line is its own
 * block, so the syntax is per line: a heading or a list item at the start, and bold, italic and
 * links inside. The text stays plain Markdown; these helpers read it for display and edit it for
 * the toolbar and the shortcuts. Nothing here builds HTML: the view renders the parsed nodes as
 * React elements.
 */

import { mentionStartingAt } from '../../domain/people';

export type HeadingLevel = 1 | 2 | 3 | 4;
export type ListKind = 'bullet' | 'numbered';

export interface ListItem {
  kind: ListKind;
  /** The number typed on a numbered item; 0 on a bullet. */
  number: number;
  /** Nesting depth, from the leading spaces: two spaces per level. */
  depth: number;
}

export interface LineStructure {
  heading: HeadingLevel | null;
  list: ListItem | null;
  /** Length of the line's prefix (heading marks, or indentation and list marker). */
  prefixLength: number;
  /** The text after the prefix. */
  content: string;
}

export const MAX_LIST_DEPTH = 4;
const INDENT = '  ';
const HEADING = /^(#{1,4}) /;
const LIST = /^( *)([-*+]|\d{1,9}[.)]) /;

export function parseLine(text: string): LineStructure {
  const heading = HEADING.exec(text);
  if (heading) {
    const length = heading[0].length;
    return { heading: heading[1].length as HeadingLevel, list: null, prefixLength: length, content: text.slice(length) };
  }
  const list = LIST.exec(text);
  if (list) {
    const numbered = /\d/.test(list[2]);
    const length = list[0].length;
    return {
      heading: null,
      list: {
        kind: numbered ? 'numbered' : 'bullet',
        number: numbered ? Number.parseInt(list[2], 10) : 0,
        depth: Math.min(Math.floor(list[1].length / INDENT.length), MAX_LIST_DEPTH),
      },
      prefixLength: length,
      content: text.slice(length),
    };
  }
  return { heading: null, list: null, prefixLength: 0, content: text };
}

// ---------------------------------------------------------------------------------------------
// Inline syntax

export type InlineNode =
  | { type: 'text'; text: string }
  | { type: 'bold'; children: InlineNode[] }
  | { type: 'italic'; children: InlineNode[] }
  | { type: 'link'; href: string; children: InlineNode[] }
  /** `@Nome`, a person cited in the line (spec/pessoas.md). */
  | { type: 'mention'; name: string };

/** Only web and mail links open; anything else (javascript:, data:...) stays plain text. */
const SAFE_HREF = /^(https?:\/\/|mailto:)\S+$/i;
const BARE_URL = /^https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"]/i;

export function safeHref(href: string): string | null {
  const trimmed = href.trim();
  return SAFE_HREF.test(trimmed) ? trimmed : null;
}

/** Bold (`**x**`), italic (`_x_` or `*x*`), links (`[x](url)`) and bare web addresses. */
export function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let plain = '';
  const pushText = () => {
    if (plain) nodes.push({ type: 'text', text: plain });
    plain = '';
  };
  let i = 0;
  while (i < text.length) {
    const rest = text.slice(i);
    const mention = mentionStartingAt(text, i, plain ? plain[plain.length - 1] : i > 0 ? text[i - 1] : '');
    if (mention) {
      pushText();
      nodes.push({ type: 'mention', name: mention.name });
      i += mention.length;
      continue;
    }
    const match = matchAt(text, i);
    if (match) {
      pushText();
      nodes.push(match.node);
      i += match.length;
      continue;
    }
    const url = /^[a-z]/i.test(rest) && !/[a-z0-9]$/i.test(plain) ? BARE_URL.exec(rest) : null;
    if (url) {
      pushText();
      nodes.push({ type: 'link', href: url[0], children: [{ type: 'text', text: url[0] }] });
      i += url[0].length;
      continue;
    }
    plain += text[i];
    i += 1;
  }
  pushText();
  return nodes;
}

function matchAt(text: string, i: number): { node: InlineNode; length: number } | null {
  if (text.startsWith('**', i)) {
    const close = findClose(text, i + 2, '**');
    if (close !== -1) return { node: { type: 'bold', children: parseInline(text.slice(i + 2, close)) }, length: close + 2 - i };
  }
  const char = text[i];
  if (char === '*' || char === '_') {
    // `_` inside a word (snake_case) is not italic.
    const wordBefore = char === '_' && i > 0 && /[\p{L}\p{N}]/u.test(text[i - 1]);
    if (!wordBefore) {
      const close = findClose(text, i + 1, char);
      const wordAfter = char === '_' && close !== -1 && /[\p{L}\p{N}]/u.test(text[close + 1] ?? '');
      if (close !== -1 && !wordAfter) return { node: { type: 'italic', children: parseInline(text.slice(i + 1, close)) }, length: close + 1 - i };
    }
  }
  if (char === '[') {
    const link = /^\[([^\]]+)\]\(([^()\s]+)\)/.exec(text.slice(i));
    const href = link ? safeHref(link[2]) : null;
    if (link && href) return { node: { type: 'link', href, children: parseInline(link[1]) }, length: link[0].length };
  }
  return null;
}

/** Where a marker that opened at `from` closes: content must not start or end with a space. */
function findClose(text: string, from: number, marker: string): number {
  if (from >= text.length || text[from] === ' ' || text.startsWith(marker, from)) return -1;
  let at = text.indexOf(marker, from);
  while (at !== -1) {
    // `*` alone must not close on the first star of `**`.
    const partOfDouble = marker === '*' && (text[at + 1] === '*' || text[at - 1] === '*');
    if (text[at - 1] !== ' ' && !partOfDouble) return at;
    at = text.indexOf(marker, at + marker.length);
  }
  return -1;
}

/** Whether a line has anything to format, so plain lines keep the bare text field. */
export function hasMarkdown(text: string): boolean {
  const line = parseLine(text);
  if (line.heading || line.list) return true;
  return parseInline(text).some((node) => node.type !== 'text');
}

// ---------------------------------------------------------------------------------------------
// Editing

/** A line's text with its selection. */
export interface LineEdit {
  text: string;
  start: number;
  end: number;
}

export type FormatCommand =
  | 'bold'
  | 'italic'
  | 'link'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'bullet'
  | 'numbered'
  | 'indent'
  | 'outdent';

export function applyFormat(command: FormatCommand, edit: LineEdit): LineEdit {
  switch (command) {
    case 'bold':
      return toggleWrap(edit, '**');
    case 'italic':
      return toggleWrap(edit, '_');
    case 'link':
      return insertLink(edit);
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
      return toggleHeading(edit, Number(command[1]) as HeadingLevel);
    case 'bullet':
    case 'numbered':
      return toggleList(edit, command);
    case 'indent':
      return indentList(edit, 1);
    case 'outdent':
      return indentList(edit, -1);
  }
}

/** Puts the marker around the selection, or takes it off when the selection already has it. */
export function toggleWrap({ text, start, end }: LineEdit, marker: string): LineEdit {
  const size = marker.length;
  const selected = text.slice(start, end);
  // The markers are just outside the selection.
  if (start >= size && text.slice(start - size, start) === marker && text.slice(end, end + size) === marker) {
    return { text: text.slice(0, start - size) + selected + text.slice(end + size), start: start - size, end: end - size };
  }
  // The markers are the ends of the selection.
  if (selected.length >= size * 2 && selected.startsWith(marker) && selected.endsWith(marker)) {
    const inner = selected.slice(size, -size);
    return { text: text.slice(0, start) + inner + text.slice(end), start, end: start + inner.length };
  }
  return {
    text: text.slice(0, start) + marker + selected + marker + text.slice(end),
    start: start + size,
    end: end + size,
  };
}

/** `[selection](https://)` with the address selected, or `[link](https://)` with "link" selected. */
export function insertLink({ text, start, end }: LineEdit): LineEdit {
  const selected = text.slice(start, end);
  if (selected && safeHref(selected)) {
    // An address was selected: it becomes the link, and its text is left to write.
    const label = 'link';
    return { text: `${text.slice(0, start)}[${label}](${selected})${text.slice(end)}`, start: start + 1, end: start + 1 + label.length };
  }
  const label = selected || 'link';
  const placeholder = 'https://';
  const inserted = `[${label}](${placeholder})`;
  const next = text.slice(0, start) + inserted + text.slice(end);
  if (selected) {
    const at = start + label.length + 3;
    return { text: next, start: at, end: at + placeholder.length };
  }
  return { text: next, start: start + 1, end: start + 1 + label.length };
}

/** Replaces the line's prefix, keeping the selection on the same characters. */
function withPrefix({ text, start, end }: LineEdit, prefix: string): LineEdit {
  const old = parseLine(text).prefixLength;
  const delta = prefix.length - old;
  const shift = (position: number) => (position < old ? prefix.length : position + delta);
  return { text: prefix + text.slice(old), start: shift(start), end: shift(end) };
}

export function toggleHeading(edit: LineEdit, level: HeadingLevel): LineEdit {
  const current = parseLine(edit.text).heading;
  return withPrefix(edit, current === level ? '' : `${'#'.repeat(level)} `);
}

export function toggleList(edit: LineEdit, kind: ListKind): LineEdit {
  const list = parseLine(edit.text).list;
  if (list?.kind === kind) return withPrefix(edit, '');
  const indent = INDENT.repeat(list?.depth ?? 0);
  return withPrefix(edit, indent + (kind === 'bullet' ? '- ' : '1. '));
}

/** Tab and Shift+Tab on a list item; a line outside a list does not change. */
export function indentList(edit: LineEdit, step: 1 | -1): LineEdit {
  const list = parseLine(edit.text).list;
  if (!list) return edit;
  const depth = Math.max(0, Math.min(MAX_LIST_DEPTH, list.depth + step));
  if (depth === list.depth) return edit;
  return withPrefix(edit, INDENT.repeat(depth) + listMarker(list));
}

function listMarker(list: ListItem): string {
  return list.kind === 'bullet' ? '- ' : `${list.number}. `;
}

/**
 * What Enter does on a list item, with the caret after the marker: an empty item leaves the list
 * (`exit`, the line without its marker); otherwise the new line continues the list (`continue`,
 * with the marker it starts with). Null outside a list.
 */
export function listOnEnter(text: string, caret: number): { type: 'exit'; text: string } | { type: 'continue'; prefix: string } | null {
  const line = parseLine(text);
  if (!line.list || caret < line.prefixLength) return null;
  if (line.content.trim() === '') return { type: 'exit', text: '' };
  const next = line.list.kind === 'numbered' ? { ...line.list, number: line.list.number + 1 } : line.list;
  return { type: 'continue', prefix: INDENT.repeat(line.list.depth) + listMarker(next) };
}

/** Keyboard shortcuts, with Ctrl (⌘ on the Mac). Uses the key's position, so it works on any layout. */
export function formatShortcut(event: {
  key: string;
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}): FormatCommand | null {
  if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey) return event.shiftKey ? 'outdent' : 'indent';
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return null;
  if (!event.shiftKey) {
    if (event.code === 'KeyB') return 'bold';
    if (event.code === 'KeyI') return 'italic';
    if (event.code === 'KeyK') return 'link';
    return null;
  }
  switch (event.code) {
    case 'Digit1':
      return 'h1';
    case 'Digit2':
      return 'h2';
    case 'Digit3':
      return 'h3';
    case 'Digit4':
      return 'h4';
    case 'Digit7':
      return 'numbered';
    case 'Digit8':
      return 'bullet';
    default:
      return null;
  }
}

export const FORMAT_SHORTCUTS: Record<FormatCommand, string> = {
  bold: 'Ctrl + B',
  italic: 'Ctrl + I',
  link: 'Ctrl + K',
  h1: 'Ctrl + Shift + 1',
  h2: 'Ctrl + Shift + 2',
  h3: 'Ctrl + Shift + 3',
  h4: 'Ctrl + Shift + 4',
  numbered: 'Ctrl + Shift + 7',
  bullet: 'Ctrl + Shift + 8',
  indent: 'Tab',
  outdent: 'Shift + Tab',
};

/** The toolbar asks the line being edited to format itself with this DOM event. */
export const FORMAT_EVENT = 'line-format';
