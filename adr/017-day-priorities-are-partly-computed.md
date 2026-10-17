# ADR-017: Day priorities are partly computed

**Status:** Accepted
**Date:** 2026-10-11
**Decision:** Only the priorities chosen by hand are stored (`priorities`, id `day:YYYY-MM-DD`). Tasks whose deadline is the day are added when reading (`buildDayPriorities`), so they never need a job that runs at midnight.
**Why:** The app has no background processes; computing on read keeps the rule exact for any day that is opened.
