# ADR-021: Weekly metrics come from events only

**Date:** 2026-10-11
**Decision:** `weeklyMetrics` reads `task.postponed` and `task.finished` events whose `day` falls in the week. "Fechar semana" stores the metrics shown in the `reflection.closed` event, so the past report stays as it was seen even if the formulas change.
**Why:** The spec requires metrics to come from the history. A snapshot keeps old reports stable.
