# ADR-019: Database and backup version 3 (section 2)

**Date:** 2026-10-11
**Decision:** Version 3 adds `reflections` (id `week:AAAA-Www`) and `settings` (a single record `main`), both included in backups; `parseBackup` adds them empty to older backups. "Decidir na reflexão semanal" is a flag on the task (`awaitingReflection`) and a notes destination (`weeklyReflection`) on the section. Settling the task in the reflection clears the flag.
**Why:** Same reasons as ADR-016. A flag keeps the task's dates and history intact while it waits.
