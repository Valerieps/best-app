import { detectKind } from '../domain/blockKind';
import { toDayKey, type DayKey } from '../domain/day';
import type { Block, BlockKind, Section } from '../domain/entities';
import { isOpenIdea, newIdeaFields, projectNameFromIdea } from '../domain/ideas';
import { record } from './events';
import { linkSection, splitKind } from './notebook';
import type { AppContext, StoreTransaction } from './ports';
import { addProject } from './projects';
import { followTag } from './projectTags';

/**
 * Phase 7: the ideas (spec/ideias.md; ADR-067). An idea is a block written with `[?] `; its page
 * holds what I write about it, in a hidden section, and its destinations each record an event.
 */

function today(ctx: AppContext): DayKey {
  return toDayKey(ctx.clock.now());
}

function nowIso(ctx: AppContext): string {
  return ctx.clock.now().toISOString();
}

async function openIdea(tx: StoreTransaction, ideaId: string): Promise<Block | null> {
  const idea = await tx.blocks.get(ideaId);
  return idea && isOpenIdea(idea) ? idea : null;
}

/** Strips the fields only an idea has. */
function withoutIdeaFields(block: Block): Block {
  const { ideaStatus: _s, notYetCount: _n, lastNotYetAt: _l, ...rest } = block;
  return rest;
}

/**
 * "Virar tarefa": the idea becomes a task without a date, of the same project. It counts as
 * decided today, so it does not reopen the closing of the day it was written in. What I wrote
 * about it stays in its page's section.
 */
export async function ideaToTask(ctx: AppContext, ideaId: string): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const idea = await openIdea(tx, ideaId);
    if (!idea) return;
    const task: Block = {
      ...withoutIdeaFields(idea),
      kind: 'task',
      status: 'active',
      intendedDate: null,
      lastTriagedDay: today(ctx),
      updatedAt: nowIso(ctx),
    };
    await tx.blocks.put(task);
    await record(ctx, tx, 'idea.becameTask', 'block', idea.id, today(ctx), { projectId: idea.projectId });
  });
}

/**
 * "Virar projeto": a new active project named after the idea, which keeps the idea's project as
 * its origin. The idea's page becomes a note on the new project's page, and the tasks written
 * there move to the new project. Returns the new project's id.
 */
export async function ideaToProject(ctx: AppContext, ideaId: string): Promise<string | null> {
  return ctx.store.transaction(async (tx) => {
    const idea = await openIdea(tx, ideaId);
    if (!idea) return null;
    const projects = await tx.allProjects();
    const project = await addProject(ctx, tx, projectNameFromIdea(idea.text, projects), {
      fromIdeaId: idea.id,
      fromProjectId: idea.projectId,
    });
    const page = idea.ideaSectionId ? await tx.sections.get(idea.ideaSectionId) : undefined;
    if (page) {
      const { ideaId: _idea, ...rest } = page;
      const note: Section = { ...rest, projectNote: true, updatedAt: nowIso(ctx) };
      await tx.sections.put(note);
      await linkSection(ctx, tx, note, project.id, today(ctx));
    }
    await tx.blocks.put({ ...idea, ideaStatus: 'becameProject', updatedAt: nowIso(ctx) });
    await record(ctx, tx, 'idea.becameProject', 'block', idea.id, today(ctx), { projectId: project.id, fromProjectId: idea.projectId });
    return project.id;
  });
}

/** "Largar": the idea leaves circulation, like an abandoned task. Only the history keeps it. */
export async function dropIdea(ctx: AppContext, ideaId: string): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const idea = await openIdea(tx, ideaId);
    if (!idea) return;
    await tx.blocks.put({ ...idea, ideaStatus: 'dropped', updatedAt: nowIso(ctx) });
    await record(ctx, tx, 'idea.dropped', 'block', idea.id, today(ctx));
  });
}

/** "Ainda não": the idea goes back to the queue, and the app counts how many times. */
export async function notYetIdea(ctx: AppContext, ideaId: string): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const idea = await openIdea(tx, ideaId);
    if (!idea) return;
    const count = (idea.notYetCount ?? 0) + 1;
    await tx.blocks.put({ ...idea, notYetCount: count, lastNotYetAt: nowIso(ctx), updatedAt: nowIso(ctx) });
    await record(ctx, tx, 'idea.notYet', 'block', idea.id, today(ctx), { count });
  });
}

/** The section of the idea's page, created on first use. */
async function ideaPageSection(ctx: AppContext, tx: StoreTransaction, idea: Block): Promise<Section> {
  const existing = idea.ideaSectionId ? await tx.sections.get(idea.ideaSectionId) : undefined;
  if (existing) return existing;
  const at = nowIso(ctx);
  const section: Section = {
    id: ctx.ids.next(),
    kind: 'general',
    day: today(ctx),
    createdAt: at,
    updatedAt: at,
    title: null,
    // No project: its notes are the idea's, not the project's. Its tasks get the idea's project.
    projectId: null,
    // Nothing to triage, and no whiteboard to decide.
    notesDestination: 'wiki',
    whiteboardDecision: 'keptUnlinked',
    ideaId: idea.id,
  };
  await tx.sections.put(section);
  await record(ctx, tx, 'section.created', 'section', section.id, section.day, { kind: section.kind, ideaId: idea.id });
  await tx.blocks.put({ ...idea, ideaSectionId: section.id, updatedAt: at });
  return section;
}

/** The idea whose page holds this section, or null when it is not an idea's page. */
async function ideaOfSection(tx: StoreTransaction, section: Section | undefined): Promise<Block | null> {
  if (!section?.ideaId) return null;
  return (await tx.blocks.get(section.ideaId)) ?? null;
}

/** A line of an idea's page: a task or an idea takes the idea's project, a note none. */
async function addLine(
  ctx: AppContext,
  tx: StoreTransaction,
  section: Section,
  idea: Block,
  kind: BlockKind,
  text: string,
  position: string,
  id?: string,
): Promise<Block> {
  const at = nowIso(ctx);
  const block: Block = {
    ...(kind === 'idea' ? newIdeaFields() : {}),
    id: id ?? ctx.ids.next(),
    kind,
    text,
    sectionId: section.id,
    position,
    projectId: kind === 'note' ? null : idea.projectId,
    createdAt: at,
    updatedAt: at,
    status: kind === 'task' ? 'active' : null,
    intendedDate: null,
    firstIntendedDate: null,
    postponeCount: 0,
    closedAt: null,
    // Written outside a day note: it is not pending in any closing.
    lastTriagedDay: kind === 'task' ? today(ctx) : null,
  };
  await tx.blocks.put(block);
  await record(ctx, tx, 'block.created', 'block', block.id, today(ctx), {
    kind,
    sectionId: section.id,
    ...(block.projectId ? { projectId: block.projectId } : {}),
  });
  return followTag(ctx, tx, block, null);
}

/**
 * Writes a line on the idea's page, creating the page on the first one. "[] " makes it a task
 * and "[?] " an idea, as in the day note (spec/ideias.md, "Ideia").
 */
export async function addIdeaLine(ctx: AppContext, ideaId: string, typed: string, position: string, blockId?: string): Promise<Block | null> {
  return ctx.store.transaction(async (tx) => {
    const idea = await tx.blocks.get(ideaId);
    if (!idea || idea.kind !== 'idea') return null;
    const section = await ideaPageSection(ctx, tx, idea);
    const { kind, text } = detectKind(typed);
    return addLine(ctx, tx, section, idea, kind, text, position, blockId);
  });
}

/** Enter on a line of an idea's page: the text after the caret becomes a new line after it. */
export async function splitIdeaLine(ctx: AppContext, blockId: string, fullText: string, caret: number, position: string, newId?: string): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const block = await tx.blocks.get(blockId);
    if (!block) return;
    const section = await tx.sections.get(block.sectionId);
    const idea = await ideaOfSection(tx, section);
    if (!section || !idea) return;
    const before = fullText.slice(0, caret);
    const after = fullText.slice(caret);
    if (block.text !== before) {
      const saved = { ...block, text: before, updatedAt: nowIso(ctx) };
      await tx.blocks.put(saved);
      await followTag(ctx, tx, saved, block.text);
    }
    await addLine(ctx, tx, section, idea, splitKind(block.kind, after), detectKind(after).text, position, newId);
  });
}

/** A note on an idea's page typed into a task ("[] ") or an idea ("[?] "), with the idea's project. */
export async function changeIdeaLineKind(ctx: AppContext, blockId: string, kind: Exclude<BlockKind, 'note'>, text: string): Promise<void> {
  await ctx.store.transaction(async (tx) => {
    const block = await tx.blocks.get(blockId);
    if (!block || block.kind !== 'note') return;
    const idea = await ideaOfSection(tx, await tx.sections.get(block.sectionId));
    if (!idea) return;
    const changed: Block = {
      ...block,
      ...(kind === 'idea' ? newIdeaFields() : {}),
      kind,
      text,
      projectId: idea.projectId,
      status: kind === 'task' ? 'active' : null,
      lastTriagedDay: kind === 'task' ? today(ctx) : null,
      updatedAt: nowIso(ctx),
    };
    await tx.blocks.put(changed);
    await record(ctx, tx, 'block.kindChanged', 'block', block.id, today(ctx), { from: 'note', to: kind });
    await followTag(ctx, tx, changed, null);
  });
}
