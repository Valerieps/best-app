# ADR-001: Vite + React + TypeScript, minimal dependencies

**Status:** Accepted; amended by ADR-054 (bundled font)
**Date:** 2026-10-11
**Decision:** Runtime dependencies are React, React DOM and Dexie only. Build/test tooling: Vite, TypeScript, Vitest, fake-indexeddb. All versions are pinned exactly and installed with `npm ci`.
**Why:** `SEGURANCA.md` asks to minimize supply-chain risk. No icon library (inline SVG), no web fonts (system font stack), no ESLint (a source-scanning test covers the security rules instead), no `vite-plugin-pwa` (its Workbox dependency tree is large; a hand-written service worker is enough).
**Amended:** ADR-054 (2026-10-16) adds the bundled Inter font as a runtime dependency; it is a static asset served by the app, never a web font from a CDN.
