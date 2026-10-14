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

// Lets tooling assign a port through the PORT environment variable.
const port = process.env.PORT ? Number(process.env.PORT) : undefined;

export default defineConfig({
  server: { port },
  preview: { port },
  // Relative base so the build works from any path (Cloudflare Pages, a subfolder, preview).
  base: './',
  plugins: [react(), contentSecurityPolicy(), libraryUrls()],
  build: {
    // Keep everything as files under 'self'; never inline assets as scripts.
    assetsInlineLimit: 0,
  },
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
  },
});
