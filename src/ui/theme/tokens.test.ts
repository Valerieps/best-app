import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');

/** The declarations of the block that starts at `opener`, as a name -> value map. */
function declarations(opener: string): Map<string, string> {
  const start = css.indexOf(opener);
  if (start < 0) throw new Error(`Block not found: ${opener}`);
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  const result = new Map<string, string>();
  for (const match of body.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--?[\w-]+|color-scheme)\s*:\s*([^;]+);/g)) {
    result.set(match[1], match[2].trim());
  }
  return result;
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('tokens.css', () => {
  it('keeps the two dark theme blocks identical (ADR-055)', () => {
    const forced = declarations(':root[data-theme="dark"]');
    const system = declarations(':root:not([data-theme="light"])');
    expect(forced.size).toBeGreaterThan(20);
    expect([...system]).toEqual([...forced]);
  });

  it('keeps the warning status readable as text in light and dark', () => {
    const light = declarations(':root {');
    const dark = declarations(':root[data-theme="dark"]');
    expect(contrast(light.get('--color-status1-strong')!, light.get('--color-status1-bg')!)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(dark.get('--color-status1-strong')!, dark.get('--color-status1-bg')!)).toBeGreaterThanOrEqual(4.5);
  });
});
