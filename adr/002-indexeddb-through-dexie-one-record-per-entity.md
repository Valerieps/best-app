# ADR-002: IndexedDB through Dexie, one record per entity

**Status:** Accepted
**Date:** 2026-10-11
**Decision:** Tables `blocks`, `sections`, `projects`, `days`, `events`, plus `meta` (settings, file handles) and `snapshots` (pre-import copy). Entities use string UUIDs from `crypto.randomUUID()`. Block order inside a section is a fractional index (`position`) on the block itself.
**Why:** One record per block keeps multiple open tabs from overwriting each other and leaves room to merge data from several devices later. Dexie gives atomic multi-table transactions and cross-tab live queries.
