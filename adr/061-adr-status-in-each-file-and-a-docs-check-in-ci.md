# ADR-061: ADR status in each file, and a docs check in CI

**Status:** Accepted
**Date:** 2026-10-17
**Decision:** The ADR index (`architecture-decision-records.md`) is gone. Each ADR carries its own `**Status:**` line right under the title (Accepted; Superseded by ADR-NNN; Accepted, updated by ADR-NNN), and ADRs are found by grepping `adr/`. `scripts/check-docs.mjs` (`npm run docs:check`, run by CI after the build) fails when an ADR has no status line or when a relative Markdown link points to a file that does not exist.
**Why:** Keeping a separate table in sync with 60 files cost a commit in most ADR changes and still drifted. The status next to the decision is read together with it, and the check catches the links that break when docs move or are removed, as `DECISOES.md`, `INCOERENCIAS.md`, `DEBITO-TECNICO.md` and `AVALIACAO-UX.md` were on the same day (their open items went to GitHub issues).
