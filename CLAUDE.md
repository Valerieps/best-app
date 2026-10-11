# App Receitinhas - Claude Code Context & Instructions

## Architecture Overview
- Clean Architecture + Domain Driven Design (DDD)
- Offline-First with Firebase Firestore sync
  

## Code Conventions
- Keep Domain Entities free of framework dependencies
- Write code, comments, and commit messages strictly in English
- All user-facing UI text (screen titles, labels, button text, hints, validation/error messages,
  dialog copy, etc.) must be in English
- Whenever you do implementation work, add unit tests for it wherever useful — don't leave new or
  changed logic untested just because the task didn't explicitly ask for tests.

## Handling Spec Gaps
- Whenever a decision is needed to fill a gap `SPEC.md` doesn't cover, register
  an entry in `architecture-decision-records.md`, so the reasoning stays
  traceable instead of living only in code comments or commit messages.
- Exception: if the gap depends on a business/domain rule rather than a technical/architectural
  choice, ask the user before deciding whenever that's possible — compile every such open
  question found during the task into a single batch and ask them together before proceeding to
  implementation, rather than stopping repeatedly or asking one at a time. Only decide
  unilaterally when asking genuinely isn't possible (e.g. a non-interactive/autonomous run). Once
  resolved — by the user's answer or, failing that, your own decision — record it as an amendment
  to `SPEC.md` itself, not an ADR — the spec should stay authoritative for
  anything a product/business decision would settle.
