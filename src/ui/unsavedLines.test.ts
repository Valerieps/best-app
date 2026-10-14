import { describe, expect, it } from 'vitest';
import { parseUnsavedLines } from './unsavedLines';

describe('parseUnsavedLines', () => {
  it('reads the saved lines', () => {
    const raw = JSON.stringify({ b1: { text: 'texto', base: '2026-10-11T12:00:00.000Z' } });
    expect(parseUnsavedLines(raw)).toEqual({ b1: { text: 'texto', base: '2026-10-11T12:00:00.000Z' } });
  });

  it('treats nothing, broken JSON or other shapes as no lines', () => {
    expect(parseUnsavedLines(null)).toEqual({});
    expect(parseUnsavedLines('{broken')).toEqual({});
    expect(parseUnsavedLines('"text"')).toEqual({});
  });

  it('skips entries without a text and a base', () => {
    const raw = JSON.stringify({ ok: { text: 'a', base: 'b' }, noBase: { text: 'a' }, wrong: 3 });
    expect(Object.keys(parseUnsavedLines(raw))).toEqual(['ok']);
  });
});
