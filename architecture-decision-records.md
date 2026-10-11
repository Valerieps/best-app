# Architecture Decision Records

Technical decisions that fill gaps in `SPEC.md`. Product and business decisions go into the spec itself.

## ADR-001: Vite + React + TypeScript, minimal dependencies

**Date:** 2026-10-11
**Decision:** Runtime dependencies are React, React DOM and Dexie only. Build/test tooling: Vite, TypeScript, Vitest, fake-indexeddb. All versions are pinned exactly and installed with `npm ci`.
**Why:** `google-safe.md` asks to minimize supply-chain risk. No icon library (inline SVG), no web fonts (system font stack), no ESLint (a source-scanning test covers the security rules instead), no `vite-plugin-pwa` (its Workbox dependency tree is large; a hand-written service worker is enough).

## ADR-002: IndexedDB through Dexie, one record per entity

**Date:** 2026-10-11
**Decision:** Tables `blocks`, `sections`, `projects`, `days`, `events`, plus `meta` (settings, file handles) and `snapshots` (pre-import copy). Entities use string UUIDs from `crypto.randomUUID()`. Block order inside a section is a fractional index (`position`) on the block itself.
**Why:** One record per block keeps multiple open tabs from overwriting each other and leaves room to merge data from several devices later. Dexie gives atomic multi-table transactions and cross-tab live queries.

## ADR-003: Entity change and event saved in one transaction

**Date:** 2026-10-11
**Decision:** Every use case goes through `Store.transaction`, which writes entity changes and their events atomically. Events are written with `add`, so an existing event can never be overwritten. Counters on entities (e.g. `postponeCount`) are read caches rebuildable from events.
**Why:** The spec requires every change to be in the history; a change without its event would silently corrupt metrics.

## ADR-004: No event for plain text edits

**Date:** 2026-10-11
**Decision:** Typing in a block updates the block but does not append an event. Events record structural changes (creation, kind change, dates, status, links, triage).
**Why:** No metric in the spec depends on text history, and an event per keystroke would bloat the history and the backups.

## ADR-005: Day boundary

**Date:** 2026-10-11
**Decision:** A day is the local calendar date (`YYYY-MM-DD`) and turns over at local midnight. Date math runs at local noon to avoid daylight saving shifts.
**Why:** The spec says the day only turns after midnight; the user's machine time zone is the only one that matters for a single-user local app.

## ADR-006: Backup format and import

**Date:** 2026-10-11
**Decision:** A backup is JSON with `format`, `schemaVersion`, `exportedAt` and every user table. `meta` and `snapshots` are excluded. Import validates the file, computes what would be lost (records missing from the backup, records the backup has in an older version, events newer than the backup), and replaces everything in a single transaction that first stores the current data as a snapshot. One snapshot is kept; undoing restores it and deletes it.
**Why:** The spec decision is "replace everything, with a prominent warning and a way to undo". A backup from a newer schema version is rejected instead of guessed at.

## ADR-007: Backup to a user-chosen file

**Date:** 2026-10-11
**Decision:** "Salvar backup em…" uses `showSaveFilePicker` and stores the file handle in `meta`, so the top-bar quick backup writes to the same file (Chrome asks for write permission once per session). Without the File System Access API, it falls back to a Blob download. Import uses a plain file input.
**Why:** `google-safe.md` section 7: reach a synced Google Drive folder without OAuth or network calls.

## ADR-008: CSP as a meta tag in production builds only

**Date:** 2026-10-11
**Decision:** The CSP from `google-safe.md`, plus `object-src 'none'`, `base-uri 'none'` and `form-action 'none'`, is injected into `index.html` at build time. Cloudflare `_headers` sets the other security headers but not the CSP.
**Why:** The Vite dev server needs a websocket that `connect-src 'none'` blocks. A CSP header would also apply to `sw.js`, and `connect-src 'none'` there would stop the service worker from caching the app's own files. The page's CSP still blocks every outbound request before it reaches the worker.

## ADR-009: Hand-written service worker

**Date:** 2026-10-11
**Decision:** `public/sw.js` caches same-origin GET requests: network first for pages (new versions show up when online), cache first for hashed assets. Registered only in production builds.
**Why:** Offline support with no extra dependency. It never handles user data.

## ADR-010: Backup reminder after 7 days

**Date:** 2026-10-11
**Decision:** When there is data and no backup in the last 7 days, a discreet banner offers "Salvar agora". It never blocks.
**Why:** Data lives only in the browser. The threshold is a starting guess; change `BACKUP_REMINDER_DAYS` if it feels wrong.
