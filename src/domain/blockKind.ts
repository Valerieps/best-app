import type { BlockKind } from './entities';

/**
 * Block type detection from the text typed. Detectors run in order and the first match wins;
 * anything no detector matches is a note. Section 5 adds an appointment detector here
 * without touching the editor.
 */

export interface KindDetector {
  kind: Exclude<BlockKind, 'note'>;
  /** Returns the text without the marker when it matches, or null. */
  match(text: string): string | null;
}

/**
 * "[] ", or the Markdown checklist "- [ ] " / "- [x] " (spec/nota-do-dia.md, "Formatação"). The
 * `x` does not finish the task: finishing is the checkbox's job.
 */
const TASK_MARKER = /^(?: *[-*+] )?\[[ xX]?\]\s/;
/** "[?] ": an idea (spec/ideias.md). */
const IDEA_MARKER = /^\[\?\]\s/;
/** "[a] ": a task someone owes me, "a" de aguardando (spec/pessoas.md). */
const WAITING_MARKER = /^\[[aA]\]\s/;

export const taskDetector: KindDetector = {
  kind: 'task',
  match: (text) => (TASK_MARKER.test(text) ? text.replace(TASK_MARKER, '') : null),
};

export const ideaDetector: KindDetector = {
  kind: 'idea',
  match: (text) => (IDEA_MARKER.test(text) ? text.replace(IDEA_MARKER, '') : null),
};

export const KIND_DETECTORS: readonly KindDetector[] = [taskDetector, ideaDetector];

export function detectKind(text: string): { kind: BlockKind; text: string; waiting?: true } {
  if (WAITING_MARKER.test(text)) return { kind: 'task', text: text.replace(WAITING_MARKER, ''), waiting: true };
  for (const detector of KIND_DETECTORS) {
    const stripped = detector.match(text);
    if (stripped !== null) return { kind: detector.kind, text: stripped };
  }
  return { kind: 'note', text };
}
