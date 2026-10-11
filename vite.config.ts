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

// Lets tooling assign a port through the PORT environment variable.
const port = process.env.PORT ? Number(process.env.PORT) : undefined;

export default defineConfig({
  server: { port },
  preview: { port },
  // Relative base so the build works from any path (Cloudflare Pages, a subfolder, preview).
  base: './',
  plugins: [react(), contentSecurityPolicy()],
  build: {
    // Keep everything as files under 'self'; never inline assets as scripts.
    assetsInlineLimit: 0,
  },
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
  },
});
