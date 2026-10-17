# ADR-060: The reviews are removed; database and backup version 10

**Status:** Accepted
**Date:** 2026-10-17
**Decision:** The Revisão de Foco and the Revisão de Rumo leave the app (owner's decision, spec/prioridades.md, spec/checkout.md). The code goes with them: the screens (`ui/reviews/`), the routes `focusReview` and `directionReview`, the notice on the day note and its snooze, the reviews in the "Rituais" counter, the cadence in the settings, the availability (`application/reviewQueries.ts`, `domain/reviews.ts`), the use cases (`application/reviews.ts`), the metrics report (`domain/metrics.ts`, `domain/directionMetrics.ts`) and the history of the list in focus that only the raio-x read (`focusProjectsOnDay`). The triage option `{ kind: 'reflection' }` and the notes decision `weeklyReflection` are gone from `domain/triage.ts`, and with them the triage rows for notes, which only the review used.

What stays:
1. **Closed reviews.** The `reflections` table stays in the database, in `StoreTransaction` and in the backup format, untouched: nothing writes it and no screen reads it. Older backups keep importing as before.
2. **Events.** `reflection.closed`, `task.deferredToReflection` and `section.notesDeferredToReflection` stay in `EventData` as history only, like `task.archived` (ADR-049). The metrics snapshot of `reflection.closed` is typed as an opaque record, since its types left with the report. `section.notesReopened` keeps accepting `from: 'weeklyReflection'`.
3. **Settings.** Old records keep `reviewCadence`, unread, so no migration is needed (as ADR-039 did with `weeklyReflection`).
4. **Old addresses.** `#/foco`, `#/rumo`, `#/reflexao/…` and `#/mes/…` open the "Rituais" screen.

What was left for the Revisão de Foco is settled by a migration, **database version 10 and `BACKUP_SCHEMA_VERSION` 10**, chosen over a read-time fallback:
- Tasks with `awaitingReflection` lose the flag (`dropAwaitingReflection`) and are plain tasks without a date again; "Tarefas esquecidas" picks them up after 15 days. The field leaves the `Block` type.
- Sections with `notesDestination: 'weeklyReflection'` become `'wiki'` (`keepDeferredNotes`), the kept notes of a closed day, and show on the project page. `'weeklyReflection'` leaves `NotesDestination`.
- The Dexie `upgrade` calls `snapshotBeforeUpgrade` first, and `upgradeTables` in `application/backup.ts` runs the same pure functions from `domain/reviewsRemoved.ts` (ADR-059, rule 4). Neither records an event, as with the archived tasks (ADR-049).

The projects in focus now change at any time (spec/prioridades.md): `removeFocusProject` records `priority.removed` with the new reason `'removed'`, and `swapFocusProject` puts a project in the place of another in one change, recording a single `priority.added` with the optional field `replaced`. `'review'` stays as a reason of the history. `setFocusProjectInReview` is gone. `ProjectActions` (`application/queries.ts`) gains `swapTargets`, the projects in focus an active project can replace when the list is full; the "⋯" menu (`ui/projects/ProjectActions.tsx`) offers "Colocar em foco", "Colocar em foco no lugar de…" and "Tirar do foco".

**Why:** A migration settles the data once, so no reader has to remember that `weeklyReflection` means "kept" or that `awaitingReflection` means nothing; the rest of the code only sees today's shapes. A read-time fallback would have to live in every query that filters sections by destination, and in every future one. Clearing `awaitingReflection` and rewriting a destination value in the same release is safe under ADR-059, rule 3: older code treats a missing optional flag as false, and the version gate stops older code from opening the upgraded database anyway. Adding `'removed'` to a removal reason and an optional `replaced` field keeps the old event shapes valid (ADR-043), and one event per swap keeps the list's history from showing a moment with only two projects. Keeping `reflections` and the history events costs nothing and keeps the backup format and older backups intact, as the owner asked.

**Supersedes:** ADR-039 (reviews without a calendar). **Updates:** ADR-038 (the list in focus changes at any time) and ADR-041 (the Revisão de Rumo is no longer behind the objectives flag; it is gone).
