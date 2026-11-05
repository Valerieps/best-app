/**
 * Pasting text into a line of the day note (ADR-062). A line is a block, so pasted text with
 * line breaks becomes one block per line. Pure functions: the line editor reads the clipboard
 * and the screen creates the blocks.
 */

import { safeHref, type LineEdit } from './markdown';

/** Above this many lines the paste is not split into blocks (it is kept whole, on one line). */
export const MAX_PASTED_LINES = 300;

/** Two spaces per level, like the list indentation the editor writes. */
const INDENT = '  ';

/**
 * The lines of pasted text, or null when it has no line break (the browser pastes it as it is).
 * Line breaks are normalized (`\r\n`, `\r`), blank lines are dropped (ADR-062), trailing spaces
 * are cut, and leading tabs become two spaces, the list indentation.
 */
export function pastedLines(raw: string): string[] | null {
  if (!/[\r\n]/.test(raw)) return null;
  return raw
    .split(/\r\n|\r|\n/)
    .map((line) => line.replace(/^\t+/, (tabs) => INDENT.repeat(tabs.length)).trimEnd())
    .filter((line) => line.trim() !== '');
}

export interface PasteResult {
  /** The text of each resulting line, the first one being the line pasted into. */
  lines: string[];
  /** The caret, counted on the last line. */
  caret: number;
}

/**
 * What the line becomes when `pasted` replaces the selection. With `split`, each pasted line is a
 * line: the first joins the text before the caret, the text after goes to the last one. Without it
 * (past days create no lines, too many lines) the pasted lines are joined into one with spaces,
 * so no text is lost.
 */
export function applyPaste(edit: LineEdit, pasted: string[], split: boolean): PasteResult {
  const before = edit.text.slice(0, edit.start);
  const after = edit.text.slice(edit.end);
  if (pasted.length === 0) return { lines: [edit.text], caret: edit.start };
  if (!split || pasted.length === 1 || pasted.length > MAX_PASTED_LINES) {
    const joined = pasted.map((line) => line.trim()).join(' ');
    return { lines: [before + joined + after], caret: before.length + joined.length };
  }
  const lines = [...pasted];
  lines[0] = before + lines[0];
  const caret = lines[lines.length - 1].length;
  lines[lines.length - 1] += after;
  return { lines, caret };
}

/** Whether a paste of this many lines is split into blocks. */
export function splits(count: number, allowNewLines: boolean): boolean {
  return allowNewLines && count > 1 && count <= MAX_PASTED_LINES;
}

/** An address pasted over selected text makes that text a link: `[selected](address)`. */
export function linkOverSelection(edit: LineEdit, raw: string): LineEdit | null {
  const selected = edit.text.slice(edit.start, edit.end);
  const href = safeHref(raw);
  if (!selected || !href || /[\s\]]/.test(raw.trim()) || /[\n\]]/.test(selected)) return null;
  const link = `[${selected}](${href})`;
  const end = edit.start + link.length;
  return { text: edit.text.slice(0, edit.start) + link + edit.text.slice(edit.end), start: end, end };
}

/** Positions for `count` lines placed one after the other between `lower` and `upper`. */
export function chainedPositions(lower: string | null, upper: string | null, count: number, between: (a: string | null, b: string | null) => string): string[] {
  const positions: string[] = [];
  let previous = lower;
  for (let i = 0; i < count; i += 1) {
    const next = between(previous, upper);
    positions.push(next);
    previous = next;
  }
  return positions;
}
