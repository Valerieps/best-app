# ADR-006: Backup format and import

**Status:** Accepted
**Date:** 2026-10-11
**Decision:** A backup is JSON with `format`, `schemaVersion`, `exportedAt` and every user table. `meta` and `snapshots` are excluded. Import validates the file, computes what would be lost (records missing from the backup, records the backup has in an older version, events newer than the backup), and replaces everything in a single transaction that first stores the current data as a snapshot. One snapshot is kept; undoing restores it and deletes it.
**Why:** The spec decision is "replace everything, with a prominent warning and a way to undo". A backup from a newer schema version is rejected instead of guessed at.
**Update (2026-10-13, issue #37):** Importing and undoing each add an event to the history they put in place: `backup.imported` (with the file's `exportedAt` and `schemaVersion`) and `backup.importUndone` (with when the import happened), on the entity type `backup`. The history otherwise had no trace that its data came from a file. The event of an import goes away with an undo, since the undo restores the earlier history; the undo leaves its own event.
