import { describe, expect, it } from 'vitest';
import { positionBetween } from '../../domain/position';
import { applyPaste, chainedPositions, linkOverSelection, MAX_PASTED_LINES, pastedLines, splits } from './paste';

const edit = (text: string, start = text.length, end = start) => ({ text, start, end });

describe('pastedLines', () => {
  it('leaves text without a line break to the browser', () => {
    expect(pastedLines('one line')).toBeNull();
  });

  it('splits on any line break, drops blank lines and trailing spaces', () => {
    expect(pastedLines('texto\r\n- item A\r- item B\n\n## Titulo  \n')).toEqual(['texto', '- item A', '- item B', '## Titulo']);
  });

  it('turns leading tabs into list indentation', () => {
    expect(pastedLines('- a\n\t- b\n\t\t- c')).toEqual(['- a', '  - b', '    - c']);
  });

  it('gives no lines for a paste of only line breaks, and one for a copied line with its break', () => {
    expect(pastedLines('\n\n')).toEqual([]);
    expect(pastedLines('copied line\n')).toEqual(['copied line']);
  });
});

describe('applyPaste', () => {
  it('joins the first line to the text before the caret and gives the text after to the last', () => {
    expect(applyPaste(edit('ab cd', 2), ['texto', '- item A', '## Titulo'], true)).toEqual({
      lines: ['abtexto', '- item A', '## Titulo cd'],
      caret: 9,
    });
  });

  it('replaces the selection', () => {
    expect(applyPaste(edit('ab XX cd', 3, 5), ['p', 'q'], true)).toEqual({ lines: ['ab p', 'q cd'], caret: 1 });
  });

  it('joins the lines with spaces when lines cannot be created, losing no text', () => {
    expect(applyPaste(edit('x', 1), ['a', ' b', 'c'], false)).toEqual({ lines: ['xa b c'], caret: 6 });
  });

  it('does not split a paste with too many lines', () => {
    const many = Array.from({ length: MAX_PASTED_LINES + 1 }, (_, i) => `l${i}`);
    expect(applyPaste(edit(''), many, true).lines).toHaveLength(1);
    expect(splits(MAX_PASTED_LINES, true)).toBe(true);
    expect(splits(MAX_PASTED_LINES + 1, true)).toBe(false);
    expect(splits(3, false)).toBe(false);
    expect(splits(1, true)).toBe(false);
  });

  it('keeps one pasted line in place', () => {
    expect(applyPaste(edit('ab', 1), ['X'], true)).toEqual({ lines: ['aXb'], caret: 2 });
  });
});

describe('linkOverSelection', () => {
  it('makes the selected text a link to the pasted address', () => {
    const link = linkOverSelection(edit('see docs now', 4, 8), 'https://x.com/a');
    expect(link?.text).toBe('see [docs](https://x.com/a) now');
    expect(link?.start).toBe(27);
  });

  it('does nothing without a selection, with other text, or with an unsafe address', () => {
    expect(linkOverSelection(edit('abc', 1), 'https://x.com')).toBeNull();
    expect(linkOverSelection(edit('abc', 0, 2), 'not an address')).toBeNull();
    expect(linkOverSelection(edit('abc', 0, 2), 'javascript:alert(1)')).toBeNull();
  });
});

describe('chainedPositions', () => {
  it('places lines in order between two neighbors', () => {
    const positions = chainedPositions('a', 'b', 4, positionBetween);
    expect(positions).toHaveLength(4);
    expect([...positions].sort()).toEqual(positions);
    expect(positions[0] > 'a' && positions[3] < 'b').toBe(true);
  });
});
