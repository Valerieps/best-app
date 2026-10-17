# ADR-037: The sidebar remembers whether it is collapsed in the settings

**Status:** Accepted
**Date:** 2026-10-12
**Decision:** The top bar and the ☰ drawer are gone; `ui/Sidebar.tsx` is the only global bar, beside the screen in a `.shell` flex layout, sticky at full height. Whether it is collapsed is `Settings.sidebarCollapsed`, saved with `setSidebarCollapsed`, so it goes into backups like `projectPanelPinned`. The field is optional, so the version does not change for it. The toggle changes on screen at once and the write follows, as in ADR-036. The current place comes from a pure function, `sidebarPlace` in `ui/sidebarPlace.ts`, so a project page marks "Projetos" and an objective marks "Objetivos". The backup status became `BackupStatus`, a label inside the "Dados e backup" row, and resuming a paused backup moved to the "Dados e backup" panel.
**Why:** The owner asked for IndexedDB, not `localStorage`, for interface preferences (ADR-036). A status inside the row cannot be a second button, so the row's one click opens "Dados e backup", as the spec asks.
