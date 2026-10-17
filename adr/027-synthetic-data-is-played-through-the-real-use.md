# ADR-027: Synthetic data is played through the real use cases, dev only

**Status:** Accepted
**Date:** 2026-10-12
**Decision:** `src/dev/syntheticData.ts` builds about five weeks of use (a party, a software project and a kitchen remodel) by running the real use cases against an in-memory `MemoryStore`, with a clock that walks through the past relative to today. The result is a regular backup file, loaded by a "Carregar dados sintéticos" button in "Dados e backup" that only exists under `import.meta.env.DEV` and goes through the normal import dialog (loss warning, undo). The generator is imported dynamically, so it stays out of the production build. A test imports the result and checks each scenario the checkout and the assistants should show.
**Why:** Writing records by hand would drift from the use cases (events, postponement counts, triage state); running them keeps the data consistent with what the app would write. Dates relative to today keep the pending days and "há semanas" scenarios true whenever the data is loaded. Reusing the import flow means no new way to replace data, and it can be undone.
