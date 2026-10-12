# ADR-011: Triage state per task (`lastTriagedDay`)

**Date:** 2026-10-11
**Decision:** A task shows up on the day it was written and on its intended day. It is pending on such a day while it is active, `lastTriagedDay` is earlier than that day, and its intended date is not later. Every checkout decision sets `lastTriagedDay` to the triaged day. Reopening a finished task moves `lastTriagedDay` back to yesterday at most, so it is pending today without reopening older days. Whether a day is pending is always computed, never stored.
**Why:** The spec allows several checkouts a day, late checkouts and "Fechar dias pendentes", and items added after a checkout make it pending again. A per-task marker answers "did this day's checkout decide this task?" in all of these cases; a per-day flag could not.
