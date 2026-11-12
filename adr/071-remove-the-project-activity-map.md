# ADR-071: Remove the project activity map; focus projects are rows

**Status:** Accepted
**Date:** 2026-11-12
**Decision:** The activity map (heatmap) of the project list is gone: `ActivityMap.tsx`, `activityGrid`, `activityLevel`, `CARD_MAP_WEEKS`, `activityDetail`, the `--color-activity-*` and `--activity-*` tokens and their CSS. The projects in focus are no longer cards: they are rows, the same `ProjectRow` as "Outros ativos", with a "Colocar em foco" button under them while a slot is free. `activityByDay`, `stalledDays`, `lastActivityDay` and `recentlyFinished` stay, since "Parado há N dias" and the project queries still use them.
**Why:** The owner found the map and the cards heavy for what the list is for: seeing which projects are in focus and which are stalled. One kind of row is simpler to read and to keep. Supersedes the map part of ADR-034.
