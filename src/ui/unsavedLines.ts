import type { AppContext } from '../application/ports';
import { restoreUnsavedText } from '../application/notebook';

/**
 * Text typed just before the tab closed. Saving a line is an IndexedDB write, which the browser
 * may cut off when the page unloads; localStorage writes at once. So when the page is hidden with
 * text not saved yet, the text also goes here, and the next start puts it back.
 */
const KEY = 'best-app:unsavedLines';

/** Per block: the text, and the block's `updatedAt` when it was typed. */
export type UnsavedLines = Record<string, { text: string; base: string }>;

export function parseUnsavedLines(raw: string | null): UnsavedLines {
  try {
    const parsed: unknown = JSON.parse(raw ?? '{}');
    if (!parsed || typeof parsed !== 'object') return {};
    const lines: UnsavedLines = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      const line = value as { text?: unknown; base?: unknown } | null;
      if (line && typeof line.text === 'string' && typeof line.base === 'string') lines[id] = { text: line.text, base: line.base };
    }
    return lines;
  } catch {
    return {};
  }
}

export function rememberUnsavedLine(blockId: string, text: string, base: string): void {
  try {
    const lines = parseUnsavedLines(localStorage.getItem(KEY));
    lines[blockId] = { text, base };
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    // Nothing more to do: the regular save already started.
  }
}

/** At start: puts back the lines whose save was cut off, then forgets them. */
export async function restoreUnsavedLines(ctx: AppContext): Promise<void> {
  let lines: UnsavedLines;
  try {
    lines = parseUnsavedLines(localStorage.getItem(KEY));
    localStorage.removeItem(KEY);
  } catch {
    return;
  }
  for (const [id, { text, base }] of Object.entries(lines)) {
    await restoreUnsavedText(ctx, id, text, base);
  }
}
