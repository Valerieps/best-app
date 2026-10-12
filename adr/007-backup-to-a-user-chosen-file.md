# ADR-007: Backup to a user-chosen file

**Date:** 2026-10-11
**Decision:** The user picks the backup file once with `showSaveFilePicker`; its handle is stored in `meta`. "Baixar uma cópia" uses a Blob download. Import uses a plain file input.
**Why:** `google-safe.md` section 7: reach a synced Google Drive folder without OAuth or network calls.
