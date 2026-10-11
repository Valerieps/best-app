import { describe, expect, it } from 'vitest';
import { splitLinks, toSafeHref } from './Linkified';

describe('links in text', () => {
  it('only allows http(s), and turns go/ links into http', () => {
    expect(toSafeHref('https://example.com/a')).toBe('https://example.com/a');
    expect(toSafeHref('go/painel')).toBe('http://go/painel');
    expect(toSafeHref('javascript:alert(1)')).toBeNull();
  });

  it('splits text around links and leaves trailing punctuation out', () => {
    expect(splitLinks('Ver go/painel, depois https://a.com/x.')).toEqual([
      { text: 'Ver ', href: null },
      { text: 'go/painel', href: 'http://go/painel' },
      { text: ', depois ', href: null },
      { text: 'https://a.com/x', href: 'https://a.com/x' },
      { text: '.', href: null },
    ]);
  });

  it('never turns script URLs into links', () => {
    expect(splitLinks('javascript:alert(1)')).toEqual([{ text: 'javascript:alert(1)', href: null }]);
  });
});
