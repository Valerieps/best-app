# ADR-030: Loading screens show the title and a delayed skeleton

**Date:** 2026-10-12
**Decision:** Screens that wait for a live query render `LoadingPage` (title, when known, plus gray lines) or `SkeletonLines` instead of nothing. The skeleton fades in with a 150 ms CSS delay, so fast queries never flash it, and the fade is skipped under `prefers-reduced-motion`. The day note builds its header before the query returns.
**Why:** A blank screen for half a second reads as an error (N4 in `AVALIACAO-UX.md`). A pure CSS delay avoids a timer per screen.
