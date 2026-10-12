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
**Decision:** Every use case goes through `Store.transaction`, which writes entity changes and their events atomically. Events are written with `add`, so an existing event can never be overwritten. Counters on entities (e.g. `postponeCount`) are read caches rebuildable from events. `DexieStore` hands use cases tables taken from the Dexie `Transaction` object and wraps the work in `Dexie.waitFor`, so use cases can be plain nested async functions.
**Why:** The spec requires every change to be in the history; a change without its event would silently corrupt metrics. Without `waitFor`, Dexie aborted transactions whose async functions awaited other async functions (`PrematureCommitError`); tables bound to the transaction keep every write inside it, which the rollback test verifies.

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
**Decision:** The user picks the backup file once with `showSaveFilePicker`; its handle is stored in `meta`. "Baixar uma cópia" uses a Blob download. Import uses a plain file input.
**Why:** `google-safe.md` section 7: reach a synced Google Drive folder without OAuth or network calls.

## ADR-008: Automatic backup with an overwrite guard

**Date:** 2026-10-11 (replaces a 7-day manual backup reminder)
**Decision:** Every committed `Store` transaction schedules a write of the whole backup to the chosen file, debounced by `AUTO_BACKUP_DELAY_MS` (3 s), plus a flush when the tab is hidden and on startup. Before each automatic write, `decideAutoBackup` reads the file and refuses to write if the file holds records missing from the browser, newer versions of records, or events the browser lacks; it also never writes into a file that is not a valid backup. Import and undo set a persisted `autoBackupOverwriteAllowed` flag in `meta`, cleared after the next write, because there the user replaced the data on purpose. Picking a file is also explicit and writes without the guard. If Chrome has not granted write permission in this session, the backup pauses until the user clicks "Retomar" (`requestPermission` needs a user gesture).
**Why:** The user asked not to have to remember backups. The guard prevents the worst case of automatic backups: Chrome clears the site data, the app opens empty, and the next write destroys the only good copy. It also protects data saved to the same synced file from another computer.

## ADR-009: CSP as a meta tag in production builds only

**Date:** 2026-10-11
**Decision:** The CSP from `google-safe.md`, plus `object-src 'none'`, `base-uri 'none'` and `form-action 'none'`, is injected into `index.html` at build time. Cloudflare `_headers` sets the other security headers but not the CSP.
**Why:** The Vite dev server needs a websocket that `connect-src 'none'` blocks. A CSP header would also apply to `sw.js`, and `connect-src 'none'` there would stop the service worker from caching the app's own files. The page's CSP still blocks every outbound request before it reaches the worker.

## ADR-010: Hand-written service worker

**Date:** 2026-10-11
**Decision:** `public/sw.js` caches same-origin GET requests: network first for pages (new versions show up when online), cache first for hashed assets. Registered only in production builds.
**Why:** Offline support with no extra dependency. It never handles user data.

## ADR-011: Triage state per task (`lastTriagedDay`)

**Date:** 2026-10-11
**Decision:** A task shows up on the day it was written and on its intended day. It is pending on such a day while it is active, `lastTriagedDay` is earlier than that day, and its intended date is not later. Every checkout decision sets `lastTriagedDay` to the triaged day. Reopening a finished task moves `lastTriagedDay` back to yesterday at most, so it is pending today without reopening older days. Whether a day is pending is always computed, never stored.
**Why:** The spec allows several checkouts a day, late checkouts and "Fechar dias pendentes", and items added after a checkout make it pending again. A per-task marker answers "did this day's checkout decide this task?" in all of these cases; a per-day flag could not.

## ADR-012: Automatic triage decisions are applied on "Aceitar sugestões"

**Date:** 2026-10-11
**Decision:** The checkout shows the automatic decisions (finished tasks, notes of project sections) as already done, with "desfazer", but writes them together with the rest when the user accepts. Leaving the checkout without accepting changes nothing.
**Why:** Same experience as applying them on open, without half-finished checkouts in the database or an undo that has to write twice.

## ADR-013: The day's first section exists only on screen until something is written

**Date:** 2026-10-11
**Decision:** The day note always shows a general section first; it is saved with the first line typed in it. Sections are ordered by creation time, so new sections always go at the end (the drafts' "+ Geral / + Reunião" between sections were left out, since a section cannot be placed in the middle).
**Why:** "O dia abre com uma seção geral já criada" without filling the database with empty sections on days the app was only opened.

## ADR-014: Lines appear before they are saved; editor writes run in order

**Date:** 2026-10-11
**Decision:** On Enter (and on the first keystroke in an empty section) the screen chooses the new block's id, shows the line right away and moves the focus to it; the database write follows. All editor writes go through a queue (`ui/writeQueue.ts`) that runs them one after another. Lines keep local text and save it 400 ms after the last keystroke.
**Why:** Testing showed text typed right after Enter landing in the previous line, a second section being created, and kind changes failing for blocks not yet saved. Choosing ids up front keeps the same React element (and the focus) when the saved block arrives; the queue guarantees each write sees the previous ones.

## ADR-015: Reactivating an archived task clears its date without counting a postponement

**Date:** 2026-10-11
**Decision:** "Reativar" puts the task back in the active list without an intended date. The event keeps the previous date.
**Why:** An old date would make the task overdue at once. It is not a postponement because the task was out of circulation, not moved.

## ADR-016: Database and backup version 2 (1b)

**Date:** 2026-10-11
**Decision:** Version 2 adds the `priorities` table and an index on `blocks.deadline`. New fields (`deadline`, `participants`, `docLink`, `mergedInto`, `keepSeparateFrom`) are optional, so records saved before 1b stay valid without a data migration. `parseBackup` upgrades version 1 backups by adding an empty `priorities` table.
**Why:** Optional fields avoid rewriting every record on upgrade; the backup upgrade keeps old backups importable.

## ADR-017: Day priorities are partly computed

**Date:** 2026-10-11
**Decision:** Only the priorities chosen by hand are stored (`priorities`, id `day:YYYY-MM-DD`). Tasks whose deadline is the day are added when reading (`buildDayPriorities`), so they never need a job that runs at midnight.
**Why:** The app has no background processes; computing on read keeps the rule exact for any day that is opened.

## ADR-018: Paging between days uses the route

**Date:** 2026-10-11
**Decision:** `#/dia/AAAA-MM-DD` shows a past day with pending items. On a past day the note does not show the empty first section, Enter does not create lines, and new sections cannot be added; text, checkboxes and shortcuts still work.
**Why:** New lines belong to today. Writing into a past day would create items that make that day pending forever.

## ADR-019: Database and backup version 3 (section 2)

**Date:** 2026-10-11
**Decision:** Version 3 adds `reflections` (id `week:AAAA-Www`) and `settings` (a single record `main`), both included in backups; `parseBackup` adds them empty to older backups. "Decidir na reflexão semanal" is a flag on the task (`awaitingReflection`) and a notes destination (`weeklyReflection`) on the section. Settling the task in the reflection clears the flag.
**Why:** Same reasons as ADR-016. A flag keeps the task's dates and history intact while it waits.

## ADR-020: Weeks are ISO weeks, and the reflection evaluates a default week

**Date:** 2026-10-11
**Decision:** Weeks run Monday to Sunday (ISO). Opened from Monday to Wednesday, the reflection evaluates the week that just ended; from Thursday on, the current week. The arrows on the reflection screen pick any other week. The scheduled reflection becomes "due" at the chosen weekday and hour and stays due until its week is closed; it only shows a banner in the day note.
**Why:** A reflection scheduled on Monday morning is about the past week, one on Friday afternoon about the current one. A fixed rule avoids asking which week every time.

## ADR-021: Weekly metrics come from events only

**Date:** 2026-10-11
**Decision:** `weeklyMetrics` reads `task.postponed` and `task.finished` events whose `day` falls in the week. "Fechar semana" stores the metrics shown in the `reflection.closed` event, so the past report stays as it was seen even if the formulas change.
**Why:** The spec requires metrics to come from the history. A snapshot keeps old reports stable.

## ADR-022: Database and backup version 4 (section 3)

**Date:** 2026-10-11
**Decision:** Version 4 adds `reminders` (indexed by `status` and `dueAt`). The day's opening state lives in optional fields of `days` (`startedAt`, `warmup`, `executionStartedAt`); active days and the warm-up checklist live in `settings`. `parseBackup` adds an empty `reminders` table to older backups.
**Why:** Same reasons as ADR-016.

## ADR-023: The day's stage is computed

**Date:** 2026-10-11
**Decision:** `dayStage` derives "start", "warmup", "dashboard" or "execution" from today's `days` record and the checklist; the app renders the matching screen at `#/`. Paging to past days and every other screen skip the opening.
**Why:** Nothing has to run at midnight; opening the app on a new day naturally shows "Iniciar Dia".

## ADR-024: Reminder signals without notifications

**Date:** 2026-10-11
**Decision:** Due reminders are checked every minute. They show in a band on the day note, as a counter in the tab title, as a dot on the favicon (an inline SVG `data:` URL, allowed by `img-src`), and as the installed app's badge (`navigator.setAppBadge`, local only). The checkout lists reminders due by the end of the day being checked out.
**Why:** SPEC section 3 asks for passive signals only; all of these stay on the machine.

## ADR-025: Database and backup version 5 (sections 4 and 6)

**Date:** 2026-10-11
**Decision:** Version 5 adds `objectives`, `resources` (indexed by `ownerId`), `habits` and `habitLogs` (id `habitId:day`, indexed by `habitId` and `day`). Month priorities reuse the `priorities` table with ids `month:AAAA-MM`; monthly reflections reuse `reflections` with ids `month:AAAA-MM`. A task converted to a habit gets the status `converted`. `parseBackup` adds the four new tables empty to older backups.
**Why:** Same reasons as ADR-016; reusing `priorities` and `reflections` keeps one mechanism per concept.

## ADR-026: Monthly metrics with open questions are left out

**Date:** 2026-10-11
**Decision:** The monthly "raio-x" shows active projects without objective, habits without objective, and how many day priorities of the month were tasks of month-priority projects. "Blocos sem projeto" (blocks vs. tasks is undecided) and "objetivos com pouco engajamento" (no definition yet) are not computed; the screen says so. The week-priority half of the last metric waits for week priorities.
**Why:** Computing a metric with a guessed definition would show numbers the user might trust.

## ADR-027: Synthetic data is played through the real use cases, dev only

**Date:** 2026-10-12
**Decision:** `src/dev/syntheticData.ts` builds about five weeks of use (a party, a software project and a kitchen remodel) by running the real use cases against an in-memory `MemoryStore`, with a clock that walks through the past relative to today. The result is a regular backup file, loaded by a "Carregar dados sintéticos" button in "Dados e backup" that only exists under `import.meta.env.DEV` and goes through the normal import dialog (loss warning, undo). The generator is imported dynamically, so it stays out of the production build. A test imports the result and checks each scenario the checkout and the assistants should show.
**Why:** Writing records by hand would drift from the use cases (events, postponement counts, triage state); running them keeps the data consistent with what the app would write. Dates relative to today keep the pending days and "há semanas" scenarios true whenever the data is loaded. Reusing the import flow means no new way to replace data, and it can be undone.

## ADR-028: Cleanup dashboard status is computed, with limits in the settings

**Date:** 2026-10-12
**Decision:** The color of each cleanup assistant is computed on read (`domain/cleanupStatus.ts`) from the number of items it finds, compared with three limits (yellow, orange, red). The limits live in the optional `Settings.cleanupLimits` field, one entry per assistant; a missing entry means the default. Since the field is optional and `settings` has no index on it, the database and backup stay at version 5. Editing a limit in the settings makes the edited value win and moves the other two out of its way. Each assistant opens on its own route (`#/ordem/dias-em-aberto` and so on), so the back button returns to the dashboard.
**Why:** A stored status would go stale whenever data changes; counting is cheap. Keeping the limits as settings means they travel with the backup.
