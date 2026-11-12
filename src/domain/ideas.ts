import type { Block, Project } from './entities';
import { findTaggedProject, findTags } from './projectTags';

/** Phase 7: rules behind the ideas (spec/ideias.md; ADR-067). */

/** The marker that makes a line an idea, as stored in old notes before ideas existed. */
const IDEA_MARKER = /^\[\?\]\s/;

/** An idea that has no destination yet: it shows in the list of ideas and on its project's page. */
export function isOpenIdea(block: Pick<Block, 'kind' | 'ideaStatus'>): boolean {
  return block.kind === 'idea' && (block.ideaStatus ?? 'open') === 'open';
}

/** Fields every new idea starts with. */
export function newIdeaFields(): Pick<Block, 'ideaStatus' | 'notYetCount' | 'lastNotYetAt' | 'ideaSectionId'> {
  return { ideaStatus: 'open', notYetCount: 0, lastNotYetAt: null, ideaSectionId: null };
}

/** The ideas of the list, oldest first: the ones waiting longest come first. */
export function sortIdeas(ideas: readonly Block[]): Block[] {
  return [...ideas].sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
}

/**
 * Name of the project an idea becomes: its text without the project tag, which named the project
 * the idea came from, and without surrounding spaces. Falls back to the whole text.
 */
export function projectNameFromIdea(text: string, projects: readonly Project[]): string {
  let result = '';
  let from = 0;
  for (const tag of findTags(text)) {
    if (!findTaggedProject(tag.name, projects)) continue;
    result += text.slice(from, tag.start);
    from = tag.end;
  }
  const stripped = (result + text.slice(from)).replace(/\s+/g, ' ').trim();
  return stripped || text.trim();
}

/**
 * Version 11 (ADR-067): a note written with `[?] ` before ideas existed becomes the idea it was
 * meant to be, linked like a new idea would be: to its tag's project when it had one, else to its
 * section's. Works on stored rows; returns the row itself when nothing changes.
 */
export function noteToIdea<T extends { kind?: unknown; text?: unknown; projectId?: unknown }>(row: T, sectionProjectId: string | null): T {
  if (row.kind !== 'note' || typeof row.text !== 'string' || !IDEA_MARKER.test(row.text)) return row;
  return {
    ...row,
    kind: 'idea',
    text: row.text.replace(IDEA_MARKER, ''),
    projectId: typeof row.projectId === 'string' ? row.projectId : sectionProjectId,
    ...newIdeaFields(),
  };
}
