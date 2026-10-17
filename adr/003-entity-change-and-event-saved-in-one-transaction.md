# ADR-003: Entity change and event saved in one transaction

**Status:** Accepted
**Date:** 2026-10-11
**Decision:** Every use case goes through `Store.transaction`, which writes entity changes and their events atomically. Events are written with `add`, so an existing event can never be overwritten. Counters on entities (e.g. `postponeCount`) are read caches rebuildable from events. `DexieStore` hands use cases tables taken from the Dexie `Transaction` object and wraps the work in `Dexie.waitFor`, so use cases can be plain nested async functions.
**Why:** The spec requires every change to be in the history; a change without its event would silently corrupt metrics. Without `waitFor`, Dexie aborted transactions whose async functions awaited other async functions (`PrematureCommitError`); tables bound to the transaction keep every write inside it, which the rollback test verifies.
