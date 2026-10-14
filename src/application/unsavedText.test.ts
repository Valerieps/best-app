import { describe, expect, it } from 'vitest';
import { createBlock, restoreUnsavedText, updateBlockText } from './notebook';
import { createTestContext } from '../test/fixtures';

describe('restoreUnsavedText', () => {
  it('puts back the text when the line did not change since', async () => {
    const { ctx, db } = createTestContext();
    const block = await createBlock(ctx, { sectionId: null, position: 'a' }, 'texto salvo');

    expect(await restoreUnsavedText(ctx, block.id, 'texto salvo e mais', block.updatedAt)).toBe(true);
    expect((await db.blocks.get(block.id))?.text).toBe('texto salvo e mais');
  });

  it('never overwrites a newer edit', async () => {
    const { ctx, db, clock } = createTestContext();
    const block = await createBlock(ctx, { sectionId: null, position: 'a' }, 'texto salvo');
    clock.set('2026-10-11T12:05:00');
    await updateBlockText(ctx, block.id, 'editado depois');

    expect(await restoreUnsavedText(ctx, block.id, 'texto antigo', block.updatedAt)).toBe(false);
    expect((await db.blocks.get(block.id))?.text).toBe('editado depois');
  });

  it('ignores a line that no longer exists', async () => {
    const { ctx } = createTestContext();
    expect(await restoreUnsavedText(ctx, 'missing', 'texto', '2026-10-11T10:00:00.000Z')).toBe(false);
  });
});
