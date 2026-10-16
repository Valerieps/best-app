import { describe, expect, it } from 'vitest';
import { positionBetween } from '../domain/position';
import { createTestContext } from '../test/fixtures';
import { createBlock } from './notebook';
import { loadDaysWithNotes } from './queries';

describe('days with notes for the "Rituais" calendar', () => {
  it('lists the days of the month with a line written, and nothing from other months', async () => {
    const { ctx, reader, clock } = createTestContext();
    for (const moment of ['2026-09-30T10:00:00', '2026-10-02T10:00:00', '2026-10-09T10:00:00']) {
      clock.set(moment);
      await createBlock(ctx, { sectionId: null, position: positionBetween(null, null) }, 'Ligar para o contador');
    }

    expect(await loadDaysWithNotes(reader, '2026-10')).toEqual(['2026-10-02', '2026-10-09']);
    expect(await loadDaysWithNotes(reader, '2026-09')).toEqual(['2026-09-30']);
    expect(await loadDaysWithNotes(reader, '2026-08')).toEqual([]);
  });
});
