# ADR-028: Cleanup dashboard status is computed, with limits in the settings

**Date:** 2026-10-12
**Decision:** The color of each cleanup assistant is computed on read (`domain/cleanupStatus.ts`) from the number of items it finds, compared with three limits (yellow, orange, red). The limits live in the optional `Settings.cleanupLimits` field, one entry per assistant; a missing entry means the default. Since the field is optional and `settings` has no index on it, the database and backup stay at version 5. Editing a limit in the settings makes the edited value win and moves the other two out of its way. Each assistant opens on its own route (`#/ordem/dias-em-aberto` and so on), so the back button returns to the dashboard.
**Why:** A stored status would go stale whenever data changes; counting is cheap. Keeping the limits as settings means they travel with the backup.
