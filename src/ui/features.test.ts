import { afterEach, describe, expect, it } from 'vitest';
import { enabledRoute, FEATURES } from './features';

const saved = { ...FEATURES };
afterEach(() => Object.assign(FEATURES, saved));

describe('hidden features', () => {
  it('opens the day note instead of a hidden screen', () => {
    Object.assign(FEATURES, { objectives: false, habits: false });
    expect(enabledRoute({ name: 'objectives' })).toEqual({ name: 'day' });
    expect(enabledRoute({ name: 'objective', id: 'o1' })).toEqual({ name: 'day' });
    expect(enabledRoute({ name: 'habits' })).toEqual({ name: 'day' });
    expect(enabledRoute({ name: 'projects' })).toEqual({ name: 'projects' });
  });

  it('keeps the screens when the features are on', () => {
    Object.assign(FEATURES, { objectives: true, habits: true });
    expect(enabledRoute({ name: 'habits' })).toEqual({ name: 'habits' });
  });
});
