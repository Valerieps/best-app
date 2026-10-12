# ADR-016: Database and backup version 2 (1b)

**Date:** 2026-10-11
**Decision:** Version 2 adds the `priorities` table and an index on `blocks.deadline`. New fields (`deadline`, `participants`, `docLink`, `mergedInto`, `keepSeparateFrom`) are optional, so records saved before 1b stay valid without a data migration. `parseBackup` upgrades version 1 backups by adding an empty `priorities` table.
**Why:** Optional fields avoid rewriting every record on upgrade; the backup upgrade keeps old backups importable.
