# ADR-029: Top warnings are picked in the UI, snoozes stay in this browser

**Date:** 2026-10-12
**Decision:** Which warning shows at the top is a pure function, `pickTopNotice` in `src/ui/notices.ts`, fed by the backup state, the pending days and the snoozes; `App` renders the backup band or tells the day note to render the pending checkout band. "Lembrar depois" stores the day it was pressed per warning in `localStorage` (`best-app:snoozedNotices`), wrapped in try/catch, and a warning counts as snoozed only on that day. Nothing about it goes to the database or the event history.
**Why:** The queue spans a global band (backup) and a screen band (pending checkout), so it has to be decided where both are known. Snoozing is a convenience of one browser, like pinning the priorities; recording it as an event would put noise in the history and in the backup.
