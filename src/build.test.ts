import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { serviceWorkerForBuild } from '../vite.config';

const SW_SOURCE = readFileSync(join(__dirname, '..', 'public', 'sw.js'), 'utf8');
const cacheName = (source: string) => source.match(/const CACHE = '([^']+)';/)?.[1];

describe('service worker cache name (issue #48)', () => {
  it('names the cache after the build files', () => {
    const built = serviceWorkerForBuild(SW_SOURCE, ['index.html', 'assets/index-abc.js']);
    expect(cacheName(built)).toMatch(/^best-app-[0-9a-f]{12}$/);
  });

  it('gives a new build a new name, and the same files the same name', () => {
    const first = cacheName(serviceWorkerForBuild(SW_SOURCE, ['assets/index-abc.js', 'index.html']));
    const same = cacheName(serviceWorkerForBuild(SW_SOURCE, ['index.html', 'assets/index-abc.js']));
    const next = cacheName(serviceWorkerForBuild(SW_SOURCE, ['index.html', 'assets/index-def.js']));
    expect(same).toBe(first);
    expect(next).not.toBe(first);
  });

  it('fails the build if sw.js stops declaring the cache name it replaces', () => {
    expect(() => serviceWorkerForBuild("const CACHE = 'other';", [])).toThrow();
  });
});
