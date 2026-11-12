# ADR-074: Postponements are deprecated

**Status:** Accepted
**Date:** 2026-11-12
**Decision:** The app stops counting postponements and no longer shows them. Like the intended date (ADR-072), the stored data stays in place and no database version is added. What changes:

- **Counting.** `moveIntendedDate` and `closePendingDays` no longer record `task.postponed` nor change `postponeCount`. `isPostponement`, `POSTPONE_ATTENTION_THRESHOLD`, the `postpone` option of `moveIntendedDate` and `postponedLabel` are gone.
- **UI.** The "Adiamentos" column, group-by and sort-by of the task table (`TaskListKey`, `TaskSortKey`, `TaskColumn`), the row in the task details and the "contam como adiamento" note of "Fechar dias pendentes" are gone. A saved table view that still names the column is cleaned by `parseView`, which already drops unknown values.
- **Checkout.** The triage highlight (`attention`) now comes only from the deadline.
- **Kept on purpose.** `Block.postponeCount` (new tasks stay at 0), the `task.postponed` event type and the `postponeCount` in `task.finished` stay in the model, the backup format and old backups. Events are append-only, and removing the field would need a migration for a value nothing reads.
- **Synthetic data.** The simulation keeps its own counter (`carried`) to send a task back to the task list after it was carried over several times, since the app no longer counts that.

**Why:** The owner decided that postponing no longer matters: without the intended date (ADR-072), almost no task is postponed, and the counter and its highlight only added noise.
