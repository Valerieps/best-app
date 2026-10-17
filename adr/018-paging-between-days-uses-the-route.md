# ADR-018: Paging between days uses the route

**Status:** Accepted
**Date:** 2026-10-11
**Decision:** `#/dia/AAAA-MM-DD` shows a past day with pending items. On a past day the note does not show the empty first section, Enter does not create lines, and new sections cannot be added; text, checkboxes and shortcuts still work.
**Why:** New lines belong to today. Writing into a past day would create items that make that day pending forever.
