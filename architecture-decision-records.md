# Architecture Decision Records

Technical decisions that fill gaps in the spec. Product and business decisions go into the spec itself (`spec/`).

- **Goes here:** one file per decision in `adr/`, named `NNN-short-title.md`, with Date, Decision and Why. A later change to a decision is an **Update** paragraph in the same file; a decision replaced by a new one gets a **Superseded by ADR-NNN** paragraph. Keep this table in sync.
- **Does not go here:** product rules (`spec/`), the current design as a whole (`ARQUITETURA.md`) and known debt (GitHub issues labeled `t:debito-tecnico` or `t:bug`).

Read only the ADRs your task touches: find them in this table or by grepping `adr/`.

| ADR | Decision | Date | Status |
| --- | --- | --- | --- |
| [ADR-001](adr/001-vite-react-typescript-minimal-dependencies.md) | Vite + React + TypeScript, minimal dependencies | 2026-10-11 | Accepted; amended by ADR-054 (bundled font) |
| [ADR-002](adr/002-indexeddb-through-dexie-one-record-per-entity.md) | IndexedDB through Dexie, one record per entity | 2026-10-11 | Accepted |
| [ADR-003](adr/003-entity-change-and-event-saved-in-one-transaction.md) | Entity change and event saved in one transaction | 2026-10-11 | Accepted |
| [ADR-004](adr/004-no-event-for-plain-text-edits.md) | No event for plain text edits | 2026-10-11 | Accepted |
| [ADR-005](adr/005-day-boundary.md) | Day boundary | 2026-10-11 | Accepted |
| [ADR-006](adr/006-backup-format-and-import.md) | Backup format and import | 2026-10-11 | Accepted |
| [ADR-007](adr/007-backup-to-a-user-chosen-file.md) | Backup to a user-chosen file | 2026-10-11 | Superseded by ADR-047 |
| [ADR-008](adr/008-automatic-backup-with-an-overwrite-guard.md) | Automatic backup with an overwrite guard | 2026-10-11 | Accepted |
| [ADR-009](adr/009-csp-as-a-meta-tag-in-production-builds-only.md) | CSP as a meta tag in production builds only | 2026-10-11 | Accepted |
| [ADR-010](adr/010-hand-written-service-worker.md) | Hand-written service worker | 2026-10-11 | Accepted |
| [ADR-011](adr/011-triage-state-per-task-lasttriagedday.md) | Triage state per task (`lastTriagedDay`) | 2026-10-11 | Accepted |
| [ADR-012](adr/012-automatic-triage-decisions-are-applied-on-aceitar.md) | Automatic triage decisions are applied on "Aceitar sugestões" | 2026-10-11 | Accepted |
| [ADR-013](adr/013-the-day-s-first-section-exists-only-on-screen.md) | The day's first section exists only on screen until something is written | 2026-10-11 | Accepted |
| [ADR-014](adr/014-lines-appear-before-they-are-saved-editor-writes.md) | Lines appear before they are saved; editor writes run in order | 2026-10-11 | Accepted |
| [ADR-015](adr/015-reactivating-an-archived-task-clears-its-date.md) | Reactivating an archived task clears its date without counting a postponement | 2026-10-11 | Accepted |
| [ADR-016](adr/016-database-and-backup-version-2-1b.md) | Database and backup version 2 (1b) | 2026-10-11 | Accepted |
| [ADR-017](adr/017-day-priorities-are-partly-computed.md) | Day priorities are partly computed | 2026-10-11 | Accepted |
| [ADR-018](adr/018-paging-between-days-uses-the-route.md) | Paging between days uses the route | 2026-10-11 | Accepted |
| [ADR-019](adr/019-database-and-backup-version-3-section-2.md) | Database and backup version 3 (section 2) | 2026-10-11 | Accepted, updated by ADR-039 |
| [ADR-020](adr/020-weeks-are-iso-weeks-and-the-reflection-evaluates.md) | Weeks are ISO weeks, and the reflection evaluates a default week | 2026-10-11 | Accepted |
| [ADR-021](adr/021-weekly-metrics-come-from-events-only.md) | Weekly metrics come from events only | 2026-10-11 | Accepted, updated by ADR-039 |
| [ADR-022](adr/022-database-and-backup-version-4-section-3.md) | Database and backup version 4 (section 3) | 2026-10-11 | Accepted |
| [ADR-023](adr/023-the-day-s-stage-is-computed.md) | The day's stage is computed | 2026-10-11 | Accepted |
| [ADR-024](adr/024-reminder-signals-without-notifications.md) | Reminder signals without notifications | 2026-10-11 | Accepted |
| [ADR-025](adr/025-database-and-backup-version-5-sections-4-and-6.md) | Database and backup version 5 (sections 4 and 6) | 2026-10-11 | Accepted, updated 2026-10-12 |
| [ADR-026](adr/026-monthly-metrics-with-open-questions-are-left-out.md) | Monthly metrics with open questions are left out | 2026-10-11 | Accepted, updated 2026-10-12 |
| [ADR-027](adr/027-synthetic-data-is-played-through-the-real-use.md) | Synthetic data is played through the real use cases, dev only | 2026-10-12 | Accepted |
| [ADR-028](adr/028-cleanup-dashboard-status-is-computed-with-limits.md) | Cleanup dashboard status is computed, with limits in the settings | 2026-10-12 | Superseded in part by ADR-045 |
| [ADR-029](adr/029-top-warnings-are-picked-in-the-ui-snoozes-stay-in.md) | Top warnings are picked in the UI, snoozes stay in this browser | 2026-10-12 | Accepted |
| [ADR-030](adr/030-loading-screens-show-the-title-and-a-delayed.md) | Loading screens show the title and a delayed skeleton | 2026-10-12 | Accepted |
| [ADR-031](adr/031-tasks-written-on-a-project-page-live-in-a-hidden.md) | Tasks written on a project page live in a hidden section of the project | 2026-10-12 | Accepted |
| [ADR-032](adr/032-project-page-details-icon-pinned-column-tab-in.md) | Project page details: icon, pinned column, tab in the route | 2026-10-12 | Accepted, updated 2026-10-12 |
| [ADR-033](adr/033-project-pace-comes-from-the-finish-events-a.md) | Project pace comes from the finish events; a reopening cancels the latest finish | 2026-10-12 | Superseded by ADR-034 |
| [ADR-034](adr/034-project-activity-map-computed-from-events.md) | Project activity map, computed from events | 2026-10-12 | Accepted |
| [ADR-035](adr/035-priority-projects-belong-to-the-week-database-and.md) | Priority projects belong to the week; database and backup version 6 | 2026-10-12 | Superseded by ADR-038 |
| [ADR-036](adr/036-the-project-list-remembers-its-open-groups-in-the.md) | The project list remembers its open groups in the settings | 2026-10-12 | Accepted |
| [ADR-037](adr/037-the-sidebar-remembers-whether-it-is-collapsed-in-the.md) | The sidebar remembers whether it is collapsed in the settings | 2026-10-12 | Accepted |
| [ADR-038](adr/038-a-single-list-of-projects-in-focus-database-and.md) | A single list of projects in focus; database and backup version 7 | 2026-10-12 | Accepted |
| [ADR-039](adr/039-reviews-without-a-calendar-open-record-cadence-and.md) | Reviews without a calendar: open record, cadence and signals | 2026-10-12 | Accepted |
| [ADR-040](adr/040-reordering-lines-and-day-parts-without-events.md) | Reordering lines and the parts of a day, without events or a schema version | 2026-10-13 | Accepted |
| [ADR-041](adr/041-objectives-and-habits-hidden-behind-a-code-flag.md) | Objectives and habits hidden behind a code flag | 2026-10-13 | Accepted |
| [ADR-042](adr/042-screens-fail-alone-and-queries-report-errors.md) | Screens fail alone, and live queries report their errors | 2026-10-13 | Accepted |
| [ADR-043](adr/043-typed-event-details-with-legacy-shapes-and-version.md) | Typed event details, with legacy shapes and a version | 2026-10-14 | Accepted |
| [ADR-044](adr/044-the-checkout-saves-each-step-when-moving-on.md) | The checkout saves each step when moving on | 2026-10-14 | Accepted |
| [ADR-045](adr/045-cleanup-colors-measure-the-age-of-the-oldest-item.md) | Cleanup colors measure the age of the oldest item | 2026-10-14 | Accepted |
| [ADR-046](adr/046-day-note-focus-lives-in-the-settings.md) | Day note focus lives in the settings | 2026-10-14 | Accepted |
| [ADR-047](adr/047-backup-folder-with-dated-copies.md) | Backup folder with dated copies | 2026-10-14 | Accepted |
| [ADR-048](adr/048-markdown-per-line-kept-as-plain-text.md) | Markdown per line, kept as plain text and parsed in the app | 2026-10-15 | Accepted |
| [ADR-049](adr/049-archived-tasks-become-undated.md) | Archiving removed; archived tasks become active tasks without a date | 2026-10-15 | Accepted |
| [ADR-050](adr/050-no-wiki-notes-stay-in-their-sections.md) | No wiki; kept notes stay in their sections, edited and deleted on the project page | 2026-10-15 | Accepted |
| [ADR-051](adr/051-line-selection-list-markers-and-focus-view-transition.md) | Selecting whole lines, list markers outside the field, and focus mode as a view transition | 2026-10-15 | Accepted |
| [ADR-052](adr/052-people-and-waiting-tasks.md) | People are records, mentions are read from the text, and a waiting task reuses the intended date | 2026-10-15 | Accepted |
| [ADR-053](adr/053-rituals-screen-replaces-the-sidebar-list.md) | The "Rituais" screen replaces the rituals list in the sidebar | 2026-10-15 | Accepted |
| [ADR-054](adr/054-bundled-inter-font-and-brand-color-tokens.md) | Bundled Inter font and brand color tokens | 2026-10-16 | Accepted |
| [ADR-055](adr/055-dark-theme-tokens-and-appearance-setting.md) | Dark theme tokens, and the appearance setting mirrored in localStorage | 2026-10-16 | Accepted |
