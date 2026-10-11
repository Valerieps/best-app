# Best App - Claude Code Context & Instructions

A personal productivity PWA: capture everything during the day without deciding where it goes,
and triage it at the daily checkout. Rituals (weekly, monthly) are added in phases and link the
day-to-day to projects and objectives.

## Docs (read before working)
- `SPEC.md` - the product spec and source of truth, organized in build order (1a, 1b, 2-6).
- `AUTO-TRIAGEM.md` - rules for the batch checkout (automatic, suggested, always manual).
- `ASSISTENTES.md` - cleanup assistants, built on the same batch mechanism as the checkout.
- `HANDOFF.md` - where the work stands, why decisions were made, and how the owner likes to work.
- `DEBITO-TECNICO.md` - technical debt left behind, starting with what depends on the owner.
  Remove an item when it is resolved; add one when you knowingly leave something behind.
- `google-safe.md` - security and compliance rules (local-only, no network, CSP, backups).
  Mandatory for every change.

## Architecture Overview
- Clean Architecture + Domain Driven Design (DDD)
- Local-only: data lives in the browser (IndexedDB via Dexie). No backend, no login, no
  outbound network calls. See `google-safe.md`.
- Every change is recorded in an append-only event history; metrics are computed client-side
  from it.

## Project Layout
- `src/domain` - entities, day math, event types. Pure TypeScript, no framework imports.
- `src/application` - use cases and ports (`Store`, `Clock`, `IdGenerator`), backup format.
- `src/infrastructure` - Dexie database, store implementation, backup files, browser APIs.
- `src/ui` - React components. All colors, fonts and spacing live in `src/ui/theme/tokens.css`.
- `public/` - static files: service worker, manifest, Cloudflare `_headers`.

## Commands
- `npm ci` - install exactly what the lockfile pins
- `npm run dev` - dev server (no CSP, no service worker)
- `npm test` - unit tests, including `src/security.test.ts` (no network APIs, no HTML injection)
- `npm run build` - typecheck and production build into `dist/` (CSP injected)
- `npm run preview` - serve the production build locally

## Deployment
Cloudflare Pages, from the private repository. Build command `npm run build`, output directory `dist`.

## Code Conventions
- Keep Domain Entities free of framework dependencies
- Write code, comments, and commit messages strictly in English
- All user-facing UI text must be in Brazilian Portuguese, matching the voice of `SPEC.md`
- Whenever you do implementation work, add unit tests for it wherever useful - don't leave new or
  changed logic untested just because the task didn't explicitly ask for tests.

## Handling Spec Gaps
- Whenever a decision is needed to fill a gap `SPEC.md` doesn't cover, register
  an entry in `architecture-decision-records.md`, so the reasoning stays
  traceable instead of living only in code comments or commit messages.
- Exception: if the gap depends on a business/domain rule rather than a technical/architectural
  choice, ask the user before deciding whenever that's possible - compile every such open
  question found during the task into a single batch and ask them together before proceeding to
  implementation, rather than stopping repeatedly or asking one at a time. Only decide
  unilaterally when asking genuinely isn't possible (e.g. a non-interactive/autonomous run). Once
  resolved - by the user's answer or, failing that, your own decision - record it as an amendment
  to `SPEC.md` itself, not an ADR - the spec should stay authoritative for
  anything a product/business decision would settle.
