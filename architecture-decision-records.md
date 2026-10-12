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
**Decision:** Every committed `Store` transaction schedules a write of the whole backup to the chosen file, debounced by `AUTO_BACKUP_DELAY_MS` (3 s), plus a flush when the tab is hidden and on startup. Before each automatic write, `decideAutoBackup` reads the file and refuses to write if the file holds records missing from the browser, newer versions of records, or events the browser lacks; a record missing from the browser does not count when the browser's history has a deletion event for it (`DELETION_EVENTS` in `application/backup.ts`), since deleting a line is a normal edit; it also never writes into a file that is not a valid backup. Import and undo set a persisted `autoBackupOverwriteAllowed` flag in `meta`, cleared after the next write, because there the user replaced the data on purpose. Picking a file is also explicit and writes without the guard. If Chrome has not granted write permission in this session, the backup pauses until the user clicks "Retomar" (`requestPermission` needs a user gesture).
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
**Update (2026-10-12):** month priorities no longer exist; version 6 turns them into week lists (ADR-035).

## ADR-026: Monthly metrics with open questions are left out

**Date:** 2026-10-11
**Decision:** The monthly "raio-x" shows active projects without objective, habits without objective, and how many day priorities of the month were tasks of month-priority projects. "Blocos sem projeto" (blocks vs. tasks is undecided) and "objetivos com pouco engajamento" (no definition yet) are not computed; the screen says so. The week-priority half of the last metric waits for week priorities.
**Why:** Computing a metric with a guessed definition would show numbers the user might trust.
**Update (2026-10-12):** the last metric now compares each day priority with the priority projects of that day's week (ADR-035).

## ADR-027: Synthetic data is played through the real use cases, dev only

**Date:** 2026-10-12
**Decision:** `src/dev/syntheticData.ts` builds about five weeks of use (a party, a software project and a kitchen remodel) by running the real use cases against an in-memory `MemoryStore`, with a clock that walks through the past relative to today. The result is a regular backup file, loaded by a "Carregar dados sintéticos" button in "Dados e backup" that only exists under `import.meta.env.DEV` and goes through the normal import dialog (loss warning, undo). The generator is imported dynamically, so it stays out of the production build. A test imports the result and checks each scenario the checkout and the assistants should show.
**Why:** Writing records by hand would drift from the use cases (events, postponement counts, triage state); running them keeps the data consistent with what the app would write. Dates relative to today keep the pending days and "há semanas" scenarios true whenever the data is loaded. Reusing the import flow means no new way to replace data, and it can be undone.

## ADR-028: Cleanup dashboard status is computed, with limits in the settings

**Date:** 2026-10-12
**Decision:** The color of each cleanup assistant is computed on read (`domain/cleanupStatus.ts`) from the number of items it finds, compared with three limits (yellow, orange, red). The limits live in the optional `Settings.cleanupLimits` field, one entry per assistant; a missing entry means the default. Since the field is optional and `settings` has no index on it, the database and backup stay at version 5. Editing a limit in the settings makes the edited value win and moves the other two out of its way. Each assistant opens on its own route (`#/ordem/dias-em-aberto` and so on), so the back button returns to the dashboard.
**Why:** A stored status would go stale whenever data changes; counting is cheap. Keeping the limits as settings means they travel with the backup.

## ADR-029: Top warnings are picked in the UI, snoozes stay in this browser

**Date:** 2026-10-12
**Decision:** Which warning shows at the top is a pure function, `pickTopNotice` in `src/ui/notices.ts`, fed by the backup state, the pending days and the snoozes; `App` renders the backup band or tells the day note to render the pending checkout band. "Lembrar depois" stores the day it was pressed per warning in `localStorage` (`best-app:snoozedNotices`), wrapped in try/catch, and a warning counts as snoozed only on that day. Nothing about it goes to the database or the event history.
**Why:** The queue spans a global band (backup) and a screen band (pending checkout), so it has to be decided where both are known. Snoozing is a convenience of one browser, like pinning the priorities; recording it as an event would put noise in the history and in the backup.

## ADR-030: Loading screens show the title and a delayed skeleton

**Date:** 2026-10-12
**Decision:** Screens that wait for a live query render `LoadingPage` (title, when known, plus gray lines) or `SkeletonLines` instead of nothing. The skeleton fades in with a 150 ms CSS delay, so fast queries never flash it, and the fade is skipped under `prefers-reduced-motion`. The day note builds its header before the query returns.
**Why:** A blank screen for half a second reads as an error (N4 in `AVALIACAO-UX.md`). A pure CSS delay avoids a timer per screen.

## ADR-031: Tasks written on a project page live in a hidden section of the project

**Date:** 2026-10-12
**Decision:** Every block needs a section, so `createProjectTask` puts the task in one section per project flagged `projectPage: true`, created on first use (kind `general`, already linked, `notesDestination: 'wiki'` since it never holds notes). `isDaySection` in `domain/projectPage.ts` keeps these sections out of `loadDayNote`, `loadDayTriage`, the pending days (the task has no origin day, only its intended date counts) and the project's section count. The task is recorded with the usual `block.created` event and the section with `section.created` (`projectPage: true`). The field is optional and unindexed, so the database and backup stay at version 5.
**Why:** The user decided the task stays out of today's note and checkout (SPEC.md, "Projetos"). A nullable `sectionId` or a new section kind would touch every reader of blocks and sections; one flag filtered in three queries keeps the change small, and the task behaves like any other once it gets an intended date.

## ADR-032: Project page details: icon, pinned column, tab in the route

**Date:** 2026-10-12
**Decision:** `Project.icon` stores an id from `PROJECT_ICONS` (domain); the drawings are inline SVG in `ui/components/Icon.tsx`, and each icon has a fixed tint from the existing tokens. Changing it records `project.iconChanged`. Whether the side column is pinned is `Settings.projectPanelPinned`, saved with `updateSettings` like the other settings, so it goes into backups. The notes tab is in the route (`#/projeto/<id>/notas`). Below 900 px the pinned column is not docked; it opens over the content from the rail. Task lines reuse the day note's `BlockLine` with `day: null`, so dates, deadline and the star behave as in the day note (SPEC.md, "Do item"), instead of the draft's hover that hides the metadata. Link titles start as the domain read from the URL text, and `resource.renamed` records later changes. The progress bar is a `<progress>` element, so the UI still has no `style` attribute.
**Why:** Storing only an id keeps the backup small and lets the drawings change; reusing the existing settings and event mechanisms avoids new storage. Following the line pattern of the day note keeps one way of acting on a task across the app.
**Update (2026-10-12):** The rail was removed; the side column opens only from the button on the tabs row, which shows the number of resources. The progress bar gave way to the "Ritmo" card (ADR-033), whose bars still avoid `style` attributes.

## ADR-033: Project pace comes from the finish events; a reopening cancels the latest finish

**Date:** 2026-10-12
**Decision:** The "Ritmo" card and the stalled state are computed by `projectPace` in `domain/projectPace.ts`, from the `task.finished` and `task.reopened` events of the tasks that belong to the project now (read with the new `Reader.eventsOfEntities`), never from the tasks' current status. Events are replayed in time order: a finish adds its `day`, and a reopening removes the latest finish of that task. So a reopened task stops counting in the week it was finished, and a task finished again counts once, on the day of its last finish. A finish counts on the event's `day` (the day the checkout decided, for late checkouts). The two-week window is today and the 13 days before it; the four bars are rolling 7-day weeks ending today, so the last two bars add up to the two-week count. An active project is stalled when the days from its last activity (a standing finish or a non-empty note written in one of its day sections; its creation day when there is none) to today reach 14, so exactly 14 days already shows "Parado há 14 dias". A finished project is never stalled. Bar heights are five CSS classes instead of inline styles.
**Why:** The SPEC asks for the pace from history, and the event log is the source of truth for metrics (ARQUITETURA.md). Cancelling only the latest finish keeps a task from counting twice without losing earlier legitimate weeks. Using the tasks that belong to the project now, instead of the `projectId` stored on the finish event, follows projects that were merged by the duplicates assistant. Rolling weeks avoid a half-empty current bar on Mondays.
**Superseded (2026-10-12) by ADR-034:** the "Ritmo" card was removed from the project page, and `domain/projectPace.ts` gave way to `domain/projectActivity.ts`. The replay of finishes and reopenings (`standingFinishDays`) and the 14-day stalled rule were kept.

## ADR-034: Project activity map, computed from events

**Date:** 2026-10-12
**Decision:** `domain/projectActivity.ts` turns the event history into activity per day with pure functions. A day's activity is the sum of tasks created (`block.created` of the project's tasks), tasks finished (standing finishes, ADR-033: a `task.reopened` cancels the latest finish of that task), notes written (`block.created` of non-empty notes in the project's day sections) and sections opened (`section.created` of the project's day sections; the hidden section of the project page is left out). "Belongs to the project" is the current state: a task linked to the project at checkout counts on the day it was written. The map (`activityGrid`) has one column per ISO week (Monday to Sunday), oldest first, ending with the current week; days after today are empty slots. Intensity uses fixed steps, the same for every project: 0, 1, 2–3, 4–5, 6 or more (four tints of the project lilac, tokens `--color-activity-0..4`), instead of quartiles of each project's maximum. A project is stalled when its last activity (or its creation, with none) is 14 days or more before today; a finished project never is. "Finalizadas nas últimas 2 semanas" are the standing finishes from today back 13 days. `loadProjectList` reads the events of all projects' tasks, notes and sections in one `eventsOfEntities` call. The map is plain `<span>` elements in a flex/grid layout; the hover detail is a CSS tooltip from `data-tip`, so the UI still has no `style` attribute and no chart library.
**Why:** The SPEC asks for activity from history and no streaks. Fixed steps keep colors comparable across projects and over time; quartiles would make a quiet project look as busy as a busy one. A CSS tooltip avoids positioning code and inline styles.

## ADR-035: Priority projects belong to the week; database and backup version 6

**Date:** 2026-10-12
**Decision:** The priority projects (up to 3) are stored in `priorities` with ids `weekProjects:AAAA-Www` and scope `weekProjects`, leaving `week:` for the future task priorities of the week. Lists carry over: a week without its own list uses the latest earlier one (`listInEffect`), so "Fechar semana" does not need to copy anything and a skipped reflection keeps the list. Shown lists keep only active projects, in the order chosen. Use cases in `application/priorityProjects.ts`: `addPriorityProject` takes a free slot of the current week outside the reflection, and also of a later week already defined by a reflection while it has room (Valeria's answer, SPEC.md); `setPriorityProjectInReflection` adds or removes in the week after the evaluated one (step 6), and is disabled in the UI when that week is already over; `releasePriorityProject` runs inside `setProjectFinished` and removes the project from the current week and later weeks, so reopening does not bring it back. Each change materializes the week's own list and records `priority.added` or `priority.removed` with `{ projectId, week, itemIds }`. The monthly "raio-x" checks each day priority against the list in effect for that day's week, as recorded (a project finished later still counts in the weeks it was chosen). `StoreTransaction` gained `priorityListsBetween`. Migration: database version 6 (Dexie `upgrade`) and `BACKUP_SCHEMA_VERSION` 6 (`parseBackup` for older files) both run `migrateMonthPriorityLists`: each `month:AAAA-MM` list becomes the list of the ISO week of that month's 1st day, keeping its first 3 distinct projects, and the month lists are dropped. Through the carry-over, the current month's list becomes the current week's list. Past `priority.*` events about month lists stay in the history untouched.
**Why:** The SPEC moved the priority projects to the week (SPEC.md, "Projetos prioritários da semana"). Carry-over on read is simpler and more robust than copying at close. Mapping each month to the week of its 1st keeps the history usable by the monthly metric instead of throwing it away. One pure function serves both the database and old backups, so they cannot diverge.

## ADR-036: The project list remembers its open groups in the settings

**Date:** 2026-10-12
**Decision:** Whether "Outros ativos" (open by default) and "Finalizados" (closed by default) are open is `Settings.projectListGroups`, saved with `updateSettings`, so it goes into backups like `projectPanelPinned`. The field is optional, so the version does not change for it. The toggle changes on screen at once and the write follows, because the list query takes a moment to rerun.
**Why:** The owner asked for IndexedDB, not `localStorage`, and the settings already hold the other interface preferences.
