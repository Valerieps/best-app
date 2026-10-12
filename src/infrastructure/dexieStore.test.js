import { describe, expect, it } from 'vitest';
import { createProject } from '../application/projects';
import { createTestContext } from '../test/fixtures';
describe('DexieStore', () => {
    it('saves an entity and its event together', async () => {
        const { db, ctx } = createTestContext();
        const project = await createProject(ctx, '  Data Studios ');
        expect(await db.projects.get(project.id)).toMatchObject({ name: 'Data Studios', status: 'active' });
        const events = await db.events.toArray();
        expect(events).toHaveLength(1);
        expect(events[0]).toMatchObject({
            type: 'project.created',
            entityId: project.id,
            day: '2026-10-11',
        });
    });
    it('saves nothing when the work fails halfway', async () => {
        const { db, ctx } = createTestContext();
        await expect(ctx.store.transaction(async (tx) => {
            await tx.projects.put({
                id: 'p1',
                name: 'Half done',
                status: 'active',
                createdAt: 'x',
                updatedAt: 'x',
                finishedAt: null,
            });
            throw new Error('boom');
        })).rejects.toThrow('boom');
        expect(await db.projects.count()).toBe(0);
        expect(await db.events.count()).toBe(0);
    });
    it('never overwrites an existing event', async () => {
        const { db, ctx } = createTestContext();
        const event = {
            id: 'e1',
            type: 'project.created',
            entityType: 'project',
            entityId: 'p1',
            at: '2026-10-11T12:00:00.000Z',
            day: '2026-10-11',
            data: {},
        };
        await ctx.store.transaction((tx) => tx.appendEvent(event));
        await expect(ctx.store.transaction((tx) => tx.appendEvent({ ...event, data: { changed: true } }))).rejects.toThrow();
        expect((await db.events.get('e1'))?.data).toEqual({});
    });
    it('rejects an empty project name', async () => {
        const { ctx } = createTestContext();
        await expect(createProject(ctx, '   ')).rejects.toThrow();
    });
});
