import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/*
 * Guards the styling conventions: every value comes from tokens.css, every stylesheet is imported,
 * and no class is left behind once the component that used it is gone.
 */

const themeDir = fileURLToPath(new URL('.', import.meta.url));
const cssDir = join(themeDir, 'css');
const srcDir = join(themeDir, '..', '..');

function walk(dir: string, keep: (name: string) => boolean): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walk(path, keep);
    return keep(entry.name) ? [path] : [];
  });
}

const stylesheets = walk(cssDir, (name) => name.endsWith('.css')).map((path) => ({
  name: relative(cssDir, path).replaceAll('\\', '/'),
  // Comments may mention anything, such as an issue number that looks like a color
  css: readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''),
}));
const tokens = readFileSync(join(themeDir, 'tokens.css'), 'utf8');
const source = walk(srcDir, (name) => /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name))
  .map((path) => readFileSync(path, 'utf8'))
  .join('\n');

/** Every `property: value` of the stylesheets, with the file it is in. */
const declarations = stylesheets.flatMap(({ name, css }) =>
  [...css.matchAll(/([\w-]+)\s*:\s*([^;{}]+);/g)].map(([, prop, value]) => ({ name, prop, value: value.trim() })),
);

function offenders(test: (d: { prop: string; value: string }) => boolean): string[] {
  return declarations.filter(test).map(({ name, prop, value }) => `${name}: ${prop}: ${value}`);
}

describe('stylesheets', () => {
  it('take every color from tokens.css', () => {
    expect(offenders(({ value }) => /#[0-9a-f]{3,8}\b|\b(rgba?|hsla?)\(/i.test(value))).toEqual([]);
  });

  it('take every z-index from the stacking tokens', () => {
    expect(offenders(({ prop, value }) => prop === 'z-index' && !/^var\(--z-[\w-]+\)$/.test(value))).toEqual([]);
  });

  it('take every duration from the motion tokens', () => {
    expect(
      // 0s is allowed: it is how reduced motion turns an animation off
      offenders(({ prop, value }) => /^(transition|animation)/.test(prop) && /(^|[\s,])(\d*\.?[1-9]\d*)m?s\b/.test(value)),
    ).toEqual([]);
  });

  it('take every shadow from the elevation tokens', () => {
    expect(
      // An inset shadow is a highlight bar, not elevation; it must still be made of tokens
      offenders(
        ({ prop, value }) =>
          prop === 'box-shadow' &&
          !/^(none|var\(--shadow-[\w-]+\))$/.test(value) &&
          !/^inset( (0|var\(--[\w-]+\)))+$/.test(value),
      ),
    ).toEqual([]);
  });

  it('only use custom properties that are defined', () => {
    const all = tokens + stylesheets.map(({ css }) => css).join('\n') + source;
    const defined = new Set(
      [...all.matchAll(/['"]?(--[\w-]+)['"]?\s*:/g), ...source.matchAll(/setProperty\(\s*'(--[\w-]+)'/g)].map((m) => m[1]),
    );
    const used = new Set(
      [...stylesheets.map(({ css }) => css).join('\n').matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]),
    );
    expect([...used].filter((name) => !defined.has(name))).toEqual([]);
  });

  it('are all imported by global.css, once', () => {
    const global = readFileSync(join(themeDir, 'global.css'), 'utf8');
    const imported = [...global.matchAll(/@import '\.\/css\/([^']+)'/g)].map((m) => m[1]);
    expect([...imported].sort()).toEqual(stylesheets.map(({ name }) => name).sort());
    expect(new Set(imported).size).toBe(imported.length);
  });

  it('have no class that the code never uses', () => {
    const classes = new Set(
      stylesheets.flatMap(({ css }) =>
        [...css.replace(/\{[^{}]*\}/g, '{}').matchAll(/\.([a-z][\w-]*)/g)].map((m) => m[1]),
      ),
    );
    // A class built from a variable, as `chip--${kind}`, counts when its stem is in the code
    const used = (name: string) =>
      source.includes(name) ||
      [...name].some((char, i) => (char === '-' || char === '_') && source.includes(`${name.slice(0, i + 1)}\${`));
    expect([...classes].filter((name) => !used(name))).toEqual([]);
  });
});
