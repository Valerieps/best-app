import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Strict CSP from google-safe.md, plus object-src/base-uri/form-action hardening.
// Injected only in production builds: the dev server needs a websocket for hot reload,
// which `connect-src 'none'` would block.
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'none'",
  "img-src 'self' data:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function contentSecurityPolicy(): Plugin {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: {
      order: 'pre',
      handler: () => [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
          injectTo: 'head-prepend',
        },
      ],
    },
  };
}

// Links to the libraries' docs inside their error messages (React, Dexie). They are text, never
// requested, and the CSP would block them anyway, but they show up in an audit of the bundle
// (issue #25). Without the protocol the reference stays readable and is no longer a link.
export const LIBRARY_URLS = ['https://react.dev/errors/', 'https://tinyurl.com/y2uuvskb', 'http://bit.ly/2kdckMn'];

export function stripLibraryUrls(code: string): string {
  return LIBRARY_URLS.reduce((result, url) => result.split(url).join(url.replace(/^https?:\/\//, '')), code);
}

function libraryUrls(): Plugin {
  return {
    name: 'strip-library-urls',
    apply: 'build',
    renderChunk: (code) => {
      const stripped = stripLibraryUrls(code);
      return stripped === code ? null : { code: stripped, map: null };
    },
  };
}

// The service worker's cache is named after the build (issue #48): a new version gets a new
// cache, and the worker's `activate` deletes the old ones instead of letting them pile up.
const CACHE_NAME_IN_SOURCE = "const CACHE = 'best-app-v1';";

export function serviceWorkerForBuild(source: string, fileNames: readonly string[]): string {
  if (!source.includes(CACHE_NAME_IN_SOURCE)) throw new Error('sw.js no longer declares its cache name as expected');
  const version = createHash('sha256').update([...fileNames].sort().join('\n')).digest('hex').slice(0, 12);
  return source.replace(CACHE_NAME_IN_SOURCE, `const CACHE = 'best-app-${version}';`);
}

function serviceWorkerCache(): Plugin {
  let outDir = 'dist';
  let fileNames: string[] = [];
  return {
    name: 'service-worker-cache',
    apply: 'build',
    configResolved: (config) => {
      outDir = config.build.outDir;
    },
    generateBundle: (_options, bundle) => {
      fileNames = Object.keys(bundle);
    },
    // Public files are copied as they are, so sw.js is rewritten once the build is on disk.
    closeBundle: () => {
      const path = resolve(outDir, 'sw.js');
      writeFileSync(path, serviceWorkerForBuild(readFileSync(path, 'utf8'), fileNames));
    },
  };
}

// Lets tooling assign a port through the PORT environment variable.
const port = process.env.PORT ? Number(process.env.PORT) : undefined;

export default defineConfig({
  server: { port },
  preview: { port },
  // Relative base so the build works from any path (Cloudflare Pages, a subfolder, preview).
  base: './',
  plugins: [react(), contentSecurityPolicy(), libraryUrls(), serviceWorkerCache()],
  build: {
    // Keep everything as files under 'self'; never inline assets as scripts.
    assetsInlineLimit: 0,
  },
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
  },
});
