import { describe, expect, it } from 'vitest';
import { positionBetween } from '../domain/position';
import { createTestContext } from '../test/fixtures';
import { createBlock, createBlocks, pasteLines, updateBlockText } from './notebook';

const PASTED = 'texto\n- item A\n- item B\n## Titulo';
const NOW = '2026-10-10T10:00:00';

// Investigation of the "Ctrl+Z after a paste kept only the first line" report (day note editor
// gaps). The save path does not lose lines: the loss came from the browser's own undo (ADR-063).
describe('saving a block whose text has several lines', () => {
  it('keeps every line when the text is saved after typing', async () => {
    const { ctx, db } = createTestContext(undefined, NOW);
    const block = await createBlock(ctx, { sectionId: null, position: positionBetween(null, null) }, 'texto');
    await updateBlockText(ctx, block.id, PASTED);
    expect((await db.blocks.get(block.id))?.text).toBe(PASTED);
  });

  it('keeps every line when the block is created with them', async () => {
    const { ctx, db } = createTestContext(undefined, NOW);
    const block = await createBlock(ctx, { sectionId: null, position: positionBetween(null, null) }, PASTED);
    expect((await db.blocks.get(block.id))?.text).toBe(PASTED);
  });
});

describe('pasting lines (pasteLines, createBlocks)', () => {
  const byPosition = <T extends { position: string }>(items: T[]) => [...items].sort((a, b) => (a.position < b.position ? -1 : 1));

  it('turns pasted lines into blocks after the line, detecting tasks', async () => {
    const { ctx, db } = createTestContext(undefined, NOW);
    const block = await createBlock(ctx, { sectionId: null, position: 'a' }, 'abc');
    const targets = ['m', 'n', 'o'].map((position) => ({ sectionId: block.sectionId, position, blockId: ctx.ids.next() }));
    await pasteLines(ctx, block.id, ['[] first', '- item', '[a] wait', 'tail'], targets, { detectFirst: true, detectRest: true });
    const saved = byPosition(await db.blocks.toArray());
    expect(saved.map((b) => [b.kind, b.text, b.waiting ?? false])).toEqual([
      ['task', 'first', false],
      ['note', '- item', false],
      ['task', 'wait', true],
      ['note', 'tail', false],
    ]);
  });

  it('keeps pasted lines as notes when detection is off', async () => {
    const { ctx, db } = createTestContext(undefined, NOW);
    const block = await createBlock(ctx, { sectionId: null, position: 'a' }, 'abc');
    const targets = [{ sectionId: block.sectionId, position: 'm', blockId: ctx.ids.next() }];
    await pasteLines(ctx, block.id, ['[] a', '[] b'], targets, { detectFirst: false, detectRest: false });
    expect(byPosition(await db.blocks.toArray()).map((b) => [b.kind, b.text])).toEqual([
      ['note', '[] a'],
      ['note', '[] b'],
    ]);
  });

  it('creates one block per line in a section without lines', async () => {
    const { ctx, db } = createTestContext(undefined, NOW);
    const sectionId = ctx.ids.next();
    const targets = [
      { sectionId: null, position: 'a', blockId: ctx.ids.next(), newSectionId: sectionId },
      { sectionId, position: 'b', blockId: ctx.ids.next() },
    ];
    await createBlocks(ctx, targets, ['[] one', 'two']);
    const saved = byPosition(await db.blocks.toArray());
    expect(saved.map((b) => [b.kind, b.text])).toEqual([
      ['task', 'one'],
      ['note', 'two'],
    ]);
    expect(new Set(saved.map((b) => b.sectionId)).size).toBe(1);
  });
});
