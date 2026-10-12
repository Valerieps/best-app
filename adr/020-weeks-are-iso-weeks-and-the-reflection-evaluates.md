# ADR-020: Weeks are ISO weeks, and the reflection evaluates a default week

**Date:** 2026-10-11
**Decision:** Weeks run Monday to Sunday (ISO). Opened from Monday to Wednesday, the reflection evaluates the week that just ended; from Thursday on, the current week. The arrows on the reflection screen pick any other week. The scheduled reflection becomes "due" at the chosen weekday and hour and stays due until its week is closed; it only shows a banner in the day note.
**Why:** A reflection scheduled on Monday morning is about the past week, one on Friday afternoon about the current one. A fixed rule avoids asking which week every time.
