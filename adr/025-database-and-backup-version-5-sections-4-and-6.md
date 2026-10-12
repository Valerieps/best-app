# ADR-025: Database and backup version 5 (sections 4 and 6)

**Date:** 2026-10-11
**Decision:** Version 5 adds `objectives`, `resources` (indexed by `ownerId`), `habits` and `habitLogs` (id `habitId:day`, indexed by `habitId` and `day`). Month priorities reuse the `priorities` table with ids `month:AAAA-MM`; monthly reflections reuse `reflections` with ids `month:AAAA-MM`. A task converted to a habit gets the status `converted`. `parseBackup` adds the four new tables empty to older backups.
**Why:** Same reasons as ADR-016; reusing `priorities` and `reflections` keeps one mechanism per concept.
**Update (2026-10-12):** month priorities no longer exist; version 6 turns them into week lists (ADR-035).
