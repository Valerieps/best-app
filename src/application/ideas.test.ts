import { describe, expect, it } from 'vitest';
import { createTestContext } from '../test/fixtures';
import { positionBetween } from '../domain/position';
import { setDayPriority } from './dayTools';
import { addIdeaLine, changeIdeaLineKind, dropIdea, ideaToProject, ideaToTask, notYetIdea, splitIdeaLine } from './ideas';
import { addToQueue } from './executionQueue';
import { changeBlockKind, createBlock, createSection, linkSectionToProject, updateBlockText } from './notebook';
import { createProject } from './projects';
import {
  loadActiveTasks,
  loadDayNote,
  loadDayPriorities,
  loadDayTriage,
  loadIdea,
  loadIdeas,
  loadMenuCounts,
  loadProject,
  loadQueueIds,
  loadSectionNotes,
} from './queries';

const TODAY = '2026-10-11';

type Test = ReturnType<typeof createTestContext>;

async function setup() {
  const test = createTestContext();
  const project = await createProject(test.ctx, 'Casa');
  const section = await createSection(test.ctx, 'general');
  await linkSectionToProject(test.ctx, section.id, project.id);
  const idea = await createBlock(test.ctx, { sectionId: section.id, position: 'a0' }, '[?] Horta no quintal');
  return { ...test, project, section, idea };
}

async function eventsOf(db: Test['db'], id: string) {
  return (await db.events.where('entityId').equals(id).toArray()).map((event) => [event.type, event.data]);
}

describe('capturing an idea', () => {
  it("turns a \"[?] \" line into an open idea of the section's project", async () => {
    const { idea, project } = await setup();
    expect(idea).toMatchObject({ kind: 'idea', text: 'Horta no quintal', projectId: project.id, status: null, ideaStatus: 'open', notYetCount: 0 });
  });

  it("takes the tag's project over the section's", async () => {
    const { ctx, section } = await setup();
    const other = await createProject(ctx, 'App');
    const idea = await createBlock(ctx, { sectionId: section.id, position: 'a1' }, '[?] Tela de receitas #App');
    expect(idea.projectId).toBe(other.id);
  });

  it('follows its section when the section is linked to a project later', async () => {
    const { ctx, reader } = createTestContext();
    const project = await createProject(ctx, 'Casa');
    const section = await createSection(ctx, 'general');
    const idea = await createBlock(ctx, { sectionId: section.id, position: 'a0' }, '[?] Horta');
    expect(idea.projectId).toBeNull();
    await linkSectionToProject(ctx, section.id, project.id);
    expect((await loadProject(reader, project.id))?.ideas.map((item) => item.id)).toEqual([idea.id]);
  });

  it('can be typed into a note, and back, while nothing was decided', async () => {
    const { ctx, db, section } = await setup();
    const note = await createBlock(ctx, { sectionId: section.id, position: 'a2' }, 'Pensar');
    await changeBlockKind(ctx, note.id, 'idea', 'Pensar');
    expect(await db.blocks.get(note.id)).toMatchObject({ kind: 'idea', ideaStatus: 'open' });
    await changeBlockKind(ctx, note.id, 'note', 'Pensar');
    const back = await db.blocks.get(note.id);
    expect(back).toMatchObject({ kind: 'note', projectId: null });
    expect(back).not.toHaveProperty('ideaStatus');
  });
});

describe('where an idea shows', () => {
  it("in the list of ideas and in its project's group, and in the menu count", async () => {
    const { reader, idea, project } = await setup();
    expect((await loadIdeas(reader)).map((item) => [item.idea.id, item.project?.name, item.day])).toEqual([[idea.id, 'Casa', TODAY]]);
    expect((await loadProject(reader, project.id))?.ideas.map((item) => item.id)).toEqual([idea.id]);
    expect((await loadMenuCounts(reader)).ideas).toBe(1);
  });

  it('never in the task list, the priorities, the queue or the closing of the day', async () => {
    const { ctx, reader, idea } = await setup();
    await setDayPriority(ctx, idea.id, true);
    await addToQueue(ctx, idea.id);
    expect(await loadActiveTasks(reader)).toEqual([]);
    expect(await loadDayPriorities(reader, TODAY)).toEqual([]);
    expect(await loadQueueIds(reader)).toEqual([]);
    expect((await loadDayTriage(reader, TODAY, TODAY)).rows).toEqual([]);
  });

  it('stays in the day note where it was written', async () => {
    const { reader, idea } = await setup();
    const note = await loadDayNote(reader, TODAY);
    expect(note.entries.flatMap((entry) => entry.blocks).map((block) => block.id)).toContain(idea.id);
  });
});

describe("an idea's page", () => {
  it('creates its hidden section with the first line, out of the day note and the kept notes', async () => {
    const { ctx, reader, db, idea } = await setup();
    const line = await addIdeaLine(ctx, idea.id, 'Ver o sol da tarde', positionBetween(null, null));
    const saved = await db.blocks.get(idea.id);
    const page = await db.sections.get(saved!.ideaSectionId!);
    expect(page).toMatchObject({ ideaId: idea.id, projectId: null, notesDestination: 'wiki' });
    expect(line).toMatchObject({ kind: 'note', sectionId: page!.id, projectId: null });
    expect((await loadIdea(reader, idea.id))?.lines.map((block) => block.text)).toEqual(['Ver o sol da tarde']);
    expect((await loadDayNote(reader, TODAY)).entries.map((entry) => entry.section?.id)).not.toContain(page!.id);
    expect((await loadSectionNotes(reader)).map((entry) => entry.section.id)).not.toContain(page!.id);
  });

  it("makes \"[] \" lines tasks of the idea's project, without a date and out of the closing", async () => {
    const { ctx, reader, idea, project } = await setup();
    const task = await addIdeaLine(ctx, idea.id, '[] Medir o quintal', positionBetween(null, null));
    expect(task).toMatchObject({ kind: 'task', status: 'active', intendedDate: null, projectId: project.id });
    expect((await loadActiveTasks(reader)).map((item) => item.task.id)).toEqual([task!.id]);
    expect((await loadDayTriage(reader, TODAY, TODAY)).rows).toEqual([]);
  });

  it('splits lines with Enter and turns a typed note into a task', async () => {
    const { ctx, reader, idea, project } = await setup();
    const first = await addIdeaLine(ctx, idea.id, 'Sol e água', positionBetween(null, null));
    await splitIdeaLine(ctx, first!.id, 'Sol e água', 3, positionBetween(first!.position, null), 'new-line');
    const lines = (await loadIdea(reader, idea.id))!.lines;
    expect(lines.map((line) => line.text)).toEqual(['Sol', ' e água']);
    await changeIdeaLineKind(ctx, 'new-line', 'task', 'Comprar terra');
    const after = (await loadIdea(reader, idea.id))!.lines;
    expect(after[1]).toMatchObject({ kind: 'task', text: 'Comprar terra', projectId: project.id, status: 'active' });
  });
});

describe("an idea's destinations", () => {
  it('"Virar tarefa": a task without a date of the same project, not pending in any closing', async () => {
    const { ctx, reader, db, idea, project } = await setup();
    await ideaToTask(ctx, idea.id);
    const task = await db.blocks.get(idea.id);
    expect(task).toMatchObject({ kind: 'task', status: 'active', intendedDate: null, projectId: project.id, lastTriagedDay: TODAY });
    expect(task).not.toHaveProperty('ideaStatus');
    expect((await loadActiveTasks(reader)).map((item) => item.task.id)).toEqual([idea.id]);
    expect((await loadDayTriage(reader, TODAY, TODAY)).rows).toEqual([]);
    expect(await loadIdeas(reader)).toEqual([]);
    expect(await eventsOf(db, idea.id)).toContainEqual(['idea.becameTask', { projectId: project.id }]);
    // From there it can go to the queue.
    await addToQueue(ctx, idea.id);
    expect(await loadQueueIds(reader)).toEqual([idea.id]);
  });

  it('"Virar projeto": an active project that keeps the origin and takes what I wrote as a note', async () => {
    const { ctx, reader, db, idea, project } = await setup();
    await updateBlockText(ctx, idea.id, 'Horta no quintal #Casa');
    const note = await addIdeaLine(ctx, idea.id, 'Ver o sol da tarde', positionBetween(null, null));
    const task = await addIdeaLine(ctx, idea.id, '[] Medir o quintal', positionBetween(note!.position, null));
    const projectId = await ideaToProject(ctx, idea.id);

    const created = await db.projects.get(projectId!);
    expect(created).toMatchObject({ name: 'Horta no quintal', status: 'active', fromIdeaId: idea.id, fromProjectId: project.id });
    const view = await loadProject(reader, projectId!);
    expect(view?.notes.flatMap((entry) => entry.notes.map((line) => line.text))).toEqual(['Ver o sol da tarde']);
    expect(view?.activeTasks.map((item) => item.task.id)).toEqual([task!.id]);
    expect(await db.blocks.get(idea.id)).toMatchObject({ kind: 'idea', ideaStatus: 'becameProject' });
    expect(await loadIdeas(reader)).toEqual([]);
    expect(await eventsOf(db, idea.id)).toContainEqual(['idea.becameProject', { projectId, fromProjectId: project.id }]);
    expect(await eventsOf(db, projectId!)).toContainEqual(['project.created', { name: 'Horta no quintal', fromIdeaId: idea.id, fromProjectId: project.id }]);
  });

  it('"Virar projeto" from an idea without a project or notes', async () => {
    const { ctx, db } = createTestContext();
    const section = await createSection(ctx, 'general');
    const idea = await createBlock(ctx, { sectionId: section.id, position: 'a0' }, '[?] Livro de receitas');
    const projectId = await ideaToProject(ctx, idea.id);
    expect(await db.projects.get(projectId!)).toMatchObject({ name: 'Livro de receitas', fromIdeaId: idea.id, fromProjectId: null });
    expect(await eventsOf(db, projectId!)).toContainEqual(['project.created', { name: 'Livro de receitas', fromIdeaId: idea.id }]);
  });

  it('"Largar": out of circulation, only the history keeps it', async () => {
    const { ctx, reader, db, idea, project } = await setup();
    await dropIdea(ctx, idea.id);
    expect(await db.blocks.get(idea.id)).toMatchObject({ kind: 'idea', ideaStatus: 'dropped' });
    expect(await loadIdeas(reader)).toEqual([]);
    expect((await loadProject(reader, project.id))?.ideas).toEqual([]);
    expect(await eventsOf(db, idea.id)).toContainEqual(['idea.dropped', {}]);
  });

  it('"Ainda não": back to the queue, counted each time', async () => {
    const { ctx, reader, db, clock, idea } = await setup();
    await notYetIdea(ctx, idea.id);
    clock.set('2026-10-14T09:00:00');
    await notYetIdea(ctx, idea.id);
    expect(await db.blocks.get(idea.id)).toMatchObject({ ideaStatus: 'open', notYetCount: 2, lastNotYetAt: new Date('2026-10-14T09:00:00').toISOString() });
    expect((await loadIdeas(reader)).map((item) => item.idea.id)).toEqual([idea.id]);
    const notYet = (await eventsOf(db, idea.id)).filter(([type]) => type === 'idea.notYet');
    expect(notYet).toEqual([
      ['idea.notYet', { count: 1 }],
      ['idea.notYet', { count: 2 }],
    ]);
  });

  it('only once: a decided idea takes no other destination', async () => {
    const { ctx, db, idea } = await setup();
    await dropIdea(ctx, idea.id);
    await ideaToTask(ctx, idea.id);
    expect(await ideaToProject(ctx, idea.id)).toBeNull();
    await notYetIdea(ctx, idea.id);
    expect(await db.blocks.get(idea.id)).toMatchObject({ kind: 'idea', ideaStatus: 'dropped', notYetCount: 0 });
    expect((await eventsOf(db, idea.id)).filter(([type]) => String(type).startsWith('idea.'))).toEqual([['idea.dropped', {}]]);
  });
});
