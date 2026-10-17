# ADR-036: The project list remembers its open groups in the settings

**Status:** Accepted
**Date:** 2026-10-12
**Decision:** Whether "Outros ativos" (open by default) and "Finalizados" (closed by default) are open is `Settings.projectListGroups`, saved with `updateSettings`, so it goes into backups like `projectPanelPinned`. The field is optional, so the version does not change for it. The toggle changes on screen at once and the write follows, because the list query takes a moment to rerun.
**Why:** The owner asked for IndexedDB, not `localStorage`, and the settings already hold the other interface preferences.
