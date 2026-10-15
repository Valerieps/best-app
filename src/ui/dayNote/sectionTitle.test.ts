import { describe, expect, it } from 'vitest';
import { titleToSaveOnBlur } from './sectionTitle';

describe('titleToSaveOnBlur', () => {
  it('saves a title typed and left without choosing a suggestion', () => {
    expect(titleToSaveOnBlur('Compras', null, false)).toBe('Compras');
    expect(titleToSaveOnBlur('Compras', 'Feira', false)).toBe('Compras');
  });

  it('saves nothing when the title did not change', () => {
    expect(titleToSaveOnBlur('Feira ', 'Feira', false)).toBeNull();
    expect(titleToSaveOnBlur('', null, false)).toBeNull();
  });

  it('never writes the typed text over a chosen project', () => {
    expect(titleToSaveOnBlur('Ref', null, true)).toBeNull();
  });
});
