# ADR-023: The day's stage is computed

**Status:** Accepted
**Date:** 2026-10-11
**Decision:** `dayStage` derives "start", "warmup", "dashboard" or "execution" from today's `days` record and the checklist; the app renders the matching screen at `#/`. Paging to past days and every other screen skip the opening.
**Why:** Nothing has to run at midnight; opening the app on a new day naturally shows "Iniciar Dia".
