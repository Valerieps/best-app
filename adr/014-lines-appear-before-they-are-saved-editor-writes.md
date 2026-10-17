# ADR-014: Lines appear before they are saved; editor writes run in order

**Status:** Accepted
**Date:** 2026-10-11
**Decision:** On Enter (and on the first keystroke in an empty section) the screen chooses the new block's id, shows the line right away and moves the focus to it; the database write follows. All editor writes go through a queue (`ui/writeQueue.ts`) that runs them one after another. Lines keep local text and save it 400 ms after the last keystroke.
**Why:** Testing showed text typed right after Enter landing in the previous line, a second section being created, and kind changes failing for blocks not yet saved. Choosing ids up front keeps the same React element (and the focus) when the saved block arrives; the queue guarantees each write sees the previous ones.
**Amendment (2026-10-15):** Importing a backup and undoing an import also run through the queue (`runAfterPendingWrites`), after the writes already queued and before any queued later. They show their own error message, so their failures do not count as failed saves. Without this, a line saved on blur when clicking "Importar" could be written after the import and mix the two states (issue #56).
