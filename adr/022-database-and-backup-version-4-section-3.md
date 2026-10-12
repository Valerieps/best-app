# ADR-022: Database and backup version 4 (section 3)

**Date:** 2026-10-11
**Decision:** Version 4 adds `reminders` (indexed by `status` and `dueAt`). The day's opening state lives in optional fields of `days` (`startedAt`, `warmup`, `executionStartedAt`); active days and the warm-up checklist live in `settings`. `parseBackup` adds an empty `reminders` table to older backups.
**Why:** Same reasons as ADR-016.
