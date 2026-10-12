import { describe, expect, it } from 'vitest';
import { positionBetween } from '../domain/position';
import { createTestContext } from '../test/fixtures';
import { keepProjectsSeparate, mergeProjects, resolveWhiteboardGroup } from './assistants';
import { createBlock, createSection, linkSectionToProject, setSectionTitle } from './notebook';
import { createProject } from './projects';
import { loadCleanup, loadCleanupDashboard } from './queries';
import { applyTriage } from './checkout';
import { setCleanupLimits } from './settings';
async function unlinkedSection(ctx, title) {
    const section = await createSection(ctx, 'general');
    await setSectionTitle(ctx, section.id, title);
    const task = await createBlock(ctx, { sectionId: section.id, position: positionBetween(null, null) }, `[] tarefa de ${title}`);
    await applyTriage(ctx, '2026-10-11', {
        tasks: new Map(),
        notes: new Map(),
        whiteboards: new Map([[section.id, { kind: 'leaveUnlinked' }]]),
    });
    return { section, task };
}
describe('cleanup assistants', () => {
    it('converts repeated whiteboard titles into one project with their tasks', async () => {
        const { ctx, reader, db } = createTestContext();
        const first = await unlinkedSection(ctx, 'Mudança');
        const second = await unlinkedSection(ctx, 'mudança');
        const cleanup = await loadCleanup(reader);
        expect(cleanup.whiteboards).toHaveLength(1);
        const [group] = cleanup.whiteboards;
        await resolveWhiteboardGroup(ctx, group.sections.map((s) => s.id), group.suggestion);
        const projects = await db.projects.toArray();
        expect(projects.map((p) => p.name)).toEqual(['mudança']);
        expect((await db.blocks.get(first.task.id))?.projectId).toBe(projects[0].id);
        expect((await db.blocks.get(second.task.id))?.projectId).toBe(projects[0].id);
        expect((await loadCleanup(reader)).whiteboards).toEqual([]);
    });
    it('"deixar como está" stops suggesting the section', async () => {
        const { ctx, reader } = createTestContext();
        const { section } = await unlinkedSection(ctx, 'Leituras');
        await resolveWhiteboardGroup(ctx, [section.id], { kind: 'keep' });
        expect((await loadCleanup(reader)).whiteboards).toEqual([]);
    });
    it('merges duplicate projects, moving sections and tasks', async () => {
        const { ctx, reader, db, clock } = createTestContext();
        const keep = await createProject(ctx, 'Data Studios');
        clock.set('2026-10-11T13:00:00');
        const duplicate = await createProject(ctx, 'DataStudios');
        const section = await createSection(ctx, 'meeting');
        await linkSectionToProject(ctx, section.id, duplicate.id);
        const task = await createBlock(ctx, { sectionId: section.id, position: positionBetween(null, null) }, '[] Enviar painel');
        const [group] = (await loadCleanup(reader)).duplicates;
        expect(group.keep.id).toBe(keep.id);
        await mergeProjects(ctx, group.keep.id, group.projects.map((p) => p.id));
        expect((await db.sections.get(section.id))?.projectId).toBe(keep.id);
        expect((await db.blocks.get(task.id))?.projectId).toBe(keep.id);
        expect(await db.projects.get(duplicate.id)).toMatchObject({ status: 'merged', mergedInto: keep.id });
        expect((await loadCleanup(reader)).duplicates).toEqual([]);
    });
    it('"manter separados" stops suggesting the pair', async () => {
        const { ctx, reader } = createTestContext();
        const a = await createProject(ctx, 'Data Studios');
        const b = await createProject(ctx, 'Data Studio');
        await keepProjectsSeparate(ctx, [a.id, b.id]);
        expect((await loadCleanup(reader)).duplicates).toEqual([]);
    });
});
describe('cleanup dashboard', () => {
    it('colors each assistant by its count, most urgent first', async () => {
        const { ctx, reader } = createTestContext();
        await createProject(ctx, 'Data Studios');
        await createProject(ctx, 'DataStudios');
        await unlinkedSection(ctx, 'Leituras');
        const dashboard = await loadCleanupDashboard(reader, '2026-10-11');
        expect(dashboard.cards.map((card) => [card.id, card.count, card.status])).toEqual([
            ['whiteboards', 1, 1],
            ['duplicates', 1, 1],
            ['pendingDays', 0, 0],
        ]);
    });
    it('uses the limits saved in the settings, and can go back to the defaults', async () => {
        const { ctx, reader } = createTestContext();
        await createProject(ctx, 'Data Studios');
        await createProject(ctx, 'DataStudios');
        const statusOf = async () => (await loadCleanupDashboard(reader, '2026-10-11')).cards.find((c) => c.id === 'duplicates').status;
        await setCleanupLimits(ctx, 'duplicates', [1, 1, 1]);
        expect(await statusOf()).toBe(3);
        await setCleanupLimits(ctx, 'whiteboards', [2, 3, 4]);
        expect((await reader.settings())?.cleanupLimits).toEqual({ duplicates: [1, 1, 1], whiteboards: [2, 3, 4] });
        await setCleanupLimits(ctx, 'duplicates', null);
        expect(await statusOf()).toBe(1);
        expect((await reader.settings())?.cleanupLimits).toEqual({ whiteboards: [2, 3, 4] });
    });
    it('saves limits normalized', async () => {
        const { ctx, reader } = createTestContext();
        await setCleanupLimits(ctx, 'pendingDays', [3, 1, 0]);
        expect((await reader.settings())?.cleanupLimits?.pendingDays).toEqual([3, 3, 3]);
    });
});
