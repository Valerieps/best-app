import { describe, expect, it } from 'vitest';
import { cx } from './classNames';

describe('cx', () => {
  it('joins the classes that are set, one space apart', () => {
    expect(cx('line', true && 'line--done', false && 'line--preview', null, undefined, '')).toBe('line line--done');
  });

  it('trims and collapses the spaces of classes passed in by a caller', () => {
    expect(cx('dropdown', '  menu  extra ', '')).toBe('dropdown menu extra');
  });

  it('returns an empty string when nothing is set', () => {
    expect(cx(false, undefined)).toBe('');
  });
});
