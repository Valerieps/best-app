import { describe, expect, it } from 'vitest';
import { opensLineBelow } from './lineBelow';

describe('opensLineBelow', () => {
  it('opens a line for a click below the last line', () => {
    expect(opensLineBelow({ y: 120, lastLineBottom: 100, onControl: false })).toBe(true);
  });

  it('leaves clicks beside or above the last line alone', () => {
    expect(opensLineBelow({ y: 100, lastLineBottom: 100, onControl: false })).toBe(false);
    expect(opensLineBelow({ y: 60, lastLineBottom: 100, onControl: false })).toBe(false);
  });

  it('leaves clicks on controls alone, even below the lines', () => {
    expect(opensLineBelow({ y: 120, lastLineBottom: 100, onControl: true })).toBe(false);
  });

  it('opens the first line for a click anywhere in a section with no lines yet', () => {
    expect(opensLineBelow({ y: 10, lastLineBottom: null, onControl: false })).toBe(true);
    expect(opensLineBelow({ y: 500, lastLineBottom: null, onControl: false })).toBe(true);
  });

  it('leaves clicks on controls of an empty section alone, such as its title', () => {
    expect(opensLineBelow({ y: 10, lastLineBottom: null, onControl: true })).toBe(false);
  });
});
