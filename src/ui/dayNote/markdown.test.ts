import { describe, expect, it } from 'vitest';
import {
  applyFormat,
  formatShortcut,
  hasMarkdown,
  insertLink,
  listOnEnter,
  listPrefixLength,
  normalizeBullet,
  parseInline,
  parseLine,
  safeHref,
  toggleWrap,
  type LineEdit,
} from './markdown';

const at = (text: string, start = text.length, end = start): LineEdit => ({ text, start, end });

describe('parseLine', () => {
  it('reads the four heading levels', () => {
    expect(parseLine('# Big')).toMatchObject({ heading: 1, content: 'Big', prefixLength: 2 });
    expect(parseLine('#### Small')).toMatchObject({ heading: 4, content: 'Small' });
    expect(parseLine('##### Too deep').heading).toBeNull();
    expect(parseLine('#hashtag').heading).toBeNull();
  });

  it('reads bullets, numbers and their depth', () => {
    expect(parseLine('- item').list).toEqual({ kind: 'bullet', number: 0, depth: 0 });
    expect(parseLine('    * item').list).toEqual({ kind: 'bullet', number: 0, depth: 2 });
    expect(parseLine('  3. item')).toMatchObject({ list: { kind: 'numbered', number: 3, depth: 1 }, content: 'item' });
    expect(parseLine('-item').list).toBeNull();
    expect(parseLine('plain').list).toBeNull();
  });
});

describe('parseInline', () => {
  it('parses bold, italic and nested formatting', () => {
    expect(parseInline('a **b** c')).toEqual([
      { type: 'text', text: 'a ' },
      { type: 'bold', children: [{ type: 'text', text: 'b' }] },
      { type: 'text', text: ' c' },
    ]);
    expect(parseInline('_x_ and *y*')).toEqual([
      { type: 'italic', children: [{ type: 'text', text: 'x' }] },
      { type: 'text', text: ' and ' },
      { type: 'italic', children: [{ type: 'text', text: 'y' }] },
    ]);
    expect(parseInline('**_both_**')).toEqual([
      { type: 'bold', children: [{ type: 'italic', children: [{ type: 'text', text: 'both' }] }] },
    ]);
  });

  it('leaves unmatched markers, snake_case and spaced stars as text', () => {
    expect(parseInline('2 * 3 * 4')).toEqual([{ type: 'text', text: '2 * 3 * 4' }]);
    expect(parseInline('my_var_name')).toEqual([{ type: 'text', text: 'my_var_name' }]);
    expect(parseInline('**open')).toEqual([{ type: 'text', text: '**open' }]);
  });

  it('parses links and bare web addresses', () => {
    expect(parseInline('see [docs](https://example.org/a)')).toEqual([
      { type: 'text', text: 'see ' },
      { type: 'link', href: 'https://example.org/a', children: [{ type: 'text', text: 'docs' }] },
    ]);
    expect(parseInline('at https://example.org/x.')).toEqual([
      { type: 'text', text: 'at ' },
      { type: 'link', href: 'https://example.org/x', children: [{ type: 'text', text: 'https://example.org/x' }] },
      { type: 'text', text: '.' },
    ]);
  });

  it('never turns an unsafe address into a link', () => {
    expect(parseInline('[x](javascript:alert(1))').every((node) => node.type === 'text')).toBe(true);
    expect(parseInline('[x](data:text/html,hi)').every((node) => node.type === 'text')).toBe(true);
    expect(safeHref('mailto:me@example.org')).toBe('mailto:me@example.org');
    expect(safeHref('https://')).toBeNull();
  });
});

describe('hasMarkdown', () => {
  it('is true only for lines with something to format', () => {
    expect(hasMarkdown('just text')).toBe(false);
    expect(hasMarkdown('# title')).toBe(true);
    expect(hasMarkdown('- item')).toBe(true);
    expect(hasMarkdown('a **b**')).toBe(true);
  });
});

describe('toggleWrap', () => {
  it('wraps the selection and keeps it selected', () => {
    expect(toggleWrap(at('a word', 2, 6), '**')).toEqual({ text: 'a **word**', start: 4, end: 8 });
  });

  it('puts the caret between the markers with nothing selected', () => {
    expect(toggleWrap(at('a ', 2), '_')).toEqual({ text: 'a __', start: 3, end: 3 });
  });

  it('unwraps markers around or inside the selection', () => {
    expect(toggleWrap(at('a **word**', 4, 8), '**')).toEqual({ text: 'a word', start: 2, end: 6 });
    expect(toggleWrap(at('a **word**', 2, 10), '**')).toEqual({ text: 'a word', start: 2, end: 6 });
  });
});

describe('insertLink', () => {
  it('turns the selection into the link text and selects the address to type', () => {
    const result = insertLink(at('see docs', 4, 8));
    expect(result.text).toBe('see [docs](https://)');
    expect(result.text.slice(result.start, result.end)).toBe('https://');
  });

  it('turns a selected address into the link and selects its text', () => {
    const result = insertLink(at('https://example.org', 0, 19));
    expect(result.text).toBe('[link](https://example.org)');
    expect(result.text.slice(result.start, result.end)).toBe('link');
  });

  it('inserts a placeholder with nothing selected', () => {
    const result = insertLink(at('go '));
    expect(result.text).toBe('go [link](https://)');
    expect(result.text.slice(result.start, result.end)).toBe('link');
  });
});

describe('headings and lists', () => {
  it('sets, switches and removes a heading, keeping the caret on the text', () => {
    expect(applyFormat('h2', at('title', 2))).toEqual({ text: '## title', start: 5, end: 5 });
    expect(applyFormat('h1', at('## title', 5))).toEqual({ text: '# title', start: 4, end: 4 });
    expect(applyFormat('h1', at('# title', 4))).toEqual({ text: 'title', start: 2, end: 2 });
  });

  it('a heading replaces a list marker and the other way round', () => {
    expect(applyFormat('h3', at('- item')).text).toBe('### item');
    expect(applyFormat('bullet', at('# item')).text).toBe('- item');
  });

  it('toggles lists and switches their kind keeping the depth', () => {
    expect(applyFormat('bullet', at('item'))).toEqual({ text: '- item', start: 6, end: 6 });
    expect(applyFormat('bullet', at('- item')).text).toBe('item');
    expect(applyFormat('numbered', at('  - item')).text).toBe('  1. item');
  });

  it('a caret inside the old prefix lands at the start of the text', () => {
    expect(applyFormat('h1', at('- item', 1))).toEqual({ text: '# item', start: 2, end: 2 });
  });

  it('indents and outdents list items only, within the depth limit', () => {
    expect(applyFormat('indent', at('- item'))).toEqual({ text: '  - item', start: 8, end: 8 });
    expect(applyFormat('outdent', at('  2. item')).text).toBe('2. item');
    expect(applyFormat('outdent', at('- item')).text).toBe('- item');
    expect(applyFormat('indent', at('        - deep')).text).toBe('        - deep');
    expect(applyFormat('indent', at('plain')).text).toBe('plain');
  });
});

describe('listOnEnter', () => {
  it('continues the list on the new line', () => {
    expect(listOnEnter('- item', 6)).toEqual({ type: 'continue', prefix: '- ' });
    expect(listOnEnter('  3. item', 9)).toEqual({ type: 'continue', prefix: '  4. ' });
  });

  it('leaves the list on an empty item', () => {
    expect(listOnEnter('- ', 2)).toEqual({ type: 'exit', text: '' });
  });

  it('does nothing outside a list or with the caret before the marker ends', () => {
    expect(listOnEnter('plain', 5)).toBeNull();
    expect(listOnEnter('- item', 0)).toBeNull();
  });
});

describe('formatShortcut', () => {
  const key = (code: string, extra: Partial<Parameters<typeof formatShortcut>[0]> = {}) => ({
    key: '',
    code,
    ctrlKey: true,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    ...extra,
  });

  it('maps the shortcuts, with Ctrl or ⌘', () => {
    expect(formatShortcut(key('KeyB'))).toBe('bold');
    expect(formatShortcut(key('KeyI', { ctrlKey: false, metaKey: true }))).toBe('italic');
    expect(formatShortcut(key('KeyK'))).toBe('link');
    expect(formatShortcut(key('Digit3', { shiftKey: true }))).toBe('h3');
    expect(formatShortcut(key('Digit7', { shiftKey: true }))).toBe('numbered');
    expect(formatShortcut(key('Digit8', { shiftKey: true }))).toBe('bullet');
  });

  it('maps Tab and Shift+Tab to the list indent', () => {
    expect(formatShortcut(key('Tab', { key: 'Tab', ctrlKey: false }))).toBe('indent');
    expect(formatShortcut(key('Tab', { key: 'Tab', ctrlKey: false, shiftKey: true }))).toBe('outdent');
  });

  it('ignores other keys and AltGr combinations', () => {
    expect(formatShortcut(key('KeyB', { ctrlKey: false }))).toBeNull();
    expect(formatShortcut(key('Digit1', { altKey: true, shiftKey: true }))).toBeNull();
    expect(formatShortcut(key('KeyX'))).toBeNull();
  });
});

describe('list markers while editing', () => {
  it('measures the prefix the editor draws as a marker', () => {
    expect(listPrefixLength('- item')).toBe(2);
    expect(listPrefixLength('    - deep')).toBe(6);
    expect(listPrefixLength('12. item')).toBe(4);
    expect(listPrefixLength('# Title')).toBe(0);
    expect(listPrefixLength('-no space')).toBe(0);
  });

  it('turns `* ` and `+ ` into the bullet the app writes', () => {
    expect(normalizeBullet('* ')).toBe('- ');
    expect(normalizeBullet('* item')).toBe('- item');
    expect(normalizeBullet('  + item')).toBe('  - item');
  });

  it('leaves dashes, numbers, italics and plain text alone', () => {
    expect(normalizeBullet('- item')).toBe('- item');
    expect(normalizeBullet('1. item')).toBe('1. item');
    expect(normalizeBullet('*italic* text')).toBe('*italic* text');
    expect(normalizeBullet('*')).toBe('*');
    expect(normalizeBullet('a * b')).toBe('a * b');
  });
});
