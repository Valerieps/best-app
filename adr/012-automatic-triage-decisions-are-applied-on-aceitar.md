# ADR-012: Automatic triage decisions are applied on "Aceitar sugestões"

**Status:** Accepted
**Date:** 2026-10-11
**Decision:** The checkout shows the automatic decisions (finished tasks, notes of project sections) as already done, with "desfazer", but writes them together with the rest when the user accepts. Leaving the checkout without accepting changes nothing.
**Why:** Same experience as applying them on open, without half-finished checkouts in the database or an undo that has to write twice.
