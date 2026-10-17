# ADR-009: CSP as a meta tag in production builds only

**Status:** Accepted
**Date:** 2026-10-11
**Decision:** The CSP from `SEGURANCA.md`, plus `object-src 'none'`, `base-uri 'none'` and `form-action 'none'`, is injected into `index.html` at build time. Cloudflare `_headers` sets the other security headers but not the CSP.
**Why:** The Vite dev server needs a websocket that `connect-src 'none'` blocks. A CSP header would also apply to `sw.js`, and `connect-src 'none'` there would stop the service worker from caching the app's own files. The page's CSP still blocks every outbound request before it reaches the worker.
