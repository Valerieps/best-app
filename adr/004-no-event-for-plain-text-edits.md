# ADR-004: No event for plain text edits

**Status:** Accepted
**Date:** 2026-10-11
**Decision:** Typing in a block updates the block but does not append an event. Events record structural changes (creation, kind change, dates, status, links, triage).
**Why:** No metric in the spec depends on text history, and an event per keystroke would bloat the history and the backups.
