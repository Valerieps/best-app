# ADR-006: Backup format and import

**Date:** 2026-10-11
**Decision:** A backup is JSON with `format`, `schemaVersion`, `exportedAt` and every user table. `meta` and `snapshots` are excluded. Import validates the file, computes what would be lost (records missing from the backup, records the backup has in an older version, events newer than the backup), and replaces everything in a single transaction that first stores the current data as a snapshot. One snapshot is kept; undoing restores it and deletes it.
**Why:** The spec decision is "replace everything, with a prominent warning and a way to undo". A backup from a newer schema version is rejected instead of guessed at.
