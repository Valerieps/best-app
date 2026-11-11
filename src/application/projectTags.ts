import { toDayKey } from '../domain/day';
import type { Block, Project } from '../domain/entities';
import { projectAfterText, renameTags } from '../domain/projectTags';
import { record } from './events';
import type { AppContext, StoreTransaction } from './ports';

/** The project tag on a line (spec/nota-do-dia.md, "Tag de projeto na linha"; ADR-065). */

/**
 * Gives `block` the project its tag says, after its text changed from `previousText` (null for a
 * new block or a change of kind). Call it with the block as it was just saved: it saves again,
 * and records the link, only when the tag moved the block.
 */
export async function followTag(ctx: AppContext, tx: StoreTransaction, block: Block, previousText: string | null): Promise<Block> {
  if (!block.text.includes('#') && (previousText === null || !previousText.includes('#'))) return block;
  const section = await tx.sections.get(block.sectionId);
  const projectId = projectAfterText(block, previousText, section?.projectId ?? null, await tx.allProjects());
  if (projectId === block.projectId) return block;
  const moved: Block = { ...block, projectId, updatedAt: ctx.clock.now().toISOString() };
  await tx.blocks.put(moved);
  await record(ctx, tx, 'block.linkedToProject', 'block', block.id, toDayKey(ctx.clock.now()), { projectId, byTag: true });
  return moved;
}

/**
 * Rewrites the tags of `projectId` as tags of `name`, in every line. `projects` is the list as it
 * was before the change, so the tags are found by the name they have. Plain text edits are not
 * events (ADR-004).
 */
export async function rewriteTags(
  ctx: AppContext,
  tx: StoreTransaction,
  projectId: string,
  name: string,
  projects: readonly Project[],
): Promise<void> {
  const at = ctx.clock.now().toISOString();
  for (const block of await tx.blocksWithTags()) {
    const text = renameTags(block.text, projectId, name, projects);
    if (text !== block.text) await tx.blocks.put({ ...block, text, updatedAt: at });
  }
}
