# ADR-005: Day boundary

**Status:** Accepted
**Date:** 2026-10-11
**Decision:** A day is the local calendar date (`YYYY-MM-DD`) and turns over at local midnight. Date math runs at local noon to avoid daylight saving shifts.
**Why:** The spec says the day only turns after midnight; the user's machine time zone is the only one that matters for a single-user local app.
