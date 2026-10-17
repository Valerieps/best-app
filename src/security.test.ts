import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONTENT_SECURITY_POLICY, LIBRARY_URLS, stripLibraryUrls } from '../vite.config';

/**
 * Guards for SEGURANCA.md: the app must never make outbound requests or inject HTML.
 * Scans the app source (not tests) for APIs that would break those rules.
 */

const SOURCE_ROOT = join(__dirname);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'test' ? [] : sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

const FORBIDDEN: [string, RegExp][] = [
  ['fetch', /\bfetch\s*\(/],
  ['XMLHttpRequest', /\bXMLHttpRequest\b/],
  ['WebSocket', /\bWebSocket\b/],
  ['EventSource', /\bEventSource\b/],
  ['sendBeacon', /\bsendBeacon\b/],
  ['dangerouslySetInnerHTML', /dangerouslySetInnerHTML/],
  ['innerHTML', /\.(inner|outer)HTML\s*=/],
  ['insertAdjacentHTML', /insertAdjacentHTML/],
  ['eval', /\beval\s*\(|new Function\s*\(/],
  ['external URL', /https?:\/\/(?!www\.w3\.org\/)[a-z0-9-]+\.[a-z]/i],
];

describe('security rules', () => {
  const files = sourceFiles(SOURCE_ROOT);

  it('finds the source files', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(FORBIDDEN)('app source never uses %s', (_name, pattern) => {
    const offenders = files.filter((file) => pattern.test(readFileSync(file, 'utf8')));
    expect(offenders.map((file) => relative(SOURCE_ROOT, file))).toEqual([]);
  });

  it('the production CSP blocks every outbound connection', () => {
    expect(CONTENT_SECURITY_POLICY).toContain("connect-src 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("script-src 'self'");
    expect(CONTENT_SECURITY_POLICY).toContain("object-src 'none'");
  });

  it('the build drops the protocol from the libraries\' doc links (issue #25)', () => {
    const code = LIBRARY_URLS.map((url) => `"see ${url}"`).join(';');
    expect(stripLibraryUrls(code)).not.toMatch(/https?:\/\/(?!www\.w3\.org\/)[a-z0-9-]+\.[a-z]/i);
    expect(stripLibraryUrls('var t=`https://react.dev/errors/`+e')).toBe('var t=`react.dev/errors/`+e');
    expect(stripLibraryUrls('"https://"')).toBe('"https://"');
  });
});
