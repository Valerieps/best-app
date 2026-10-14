# Best App - Claude Code Context & Instructions

A personal productivity PWA: capture everything during the day without deciding where it goes,
and triage it at the daily checkout. Rituals (weekly, monthly) are added in phases and link the
day-to-day to projects and objectives.

## Docs

### What to read

Do not read every doc up front: together they are about 60k tokens. Read only what the task
needs, and only the relevant section: find it with Grep on the doc's headings (`^#`) or a key
term, then Read with `offset`/`limit`. Re-read a doc only if it may have changed since (the owner
edits docs between messages).

| Task | Read |
| --- | --- |
| Any code change | The hard rules below; `google-safe.md` in full only when the change touches storage, backup, links or rendered user text, dependencies, or anything network-like |
| Implementing or changing a feature | Its file in `spec/` (the table in `SPEC.md` says which); its row in `ROADMAP.md`; the matching part of `ARQUITETURA.md`; ADRs found in the index or by grepping `adr/` |
| Answering a product question or deciding a rule | The relevant file in `spec/` and its "Em aberto"; `GLOSSARIO.md` for the terms; `DECISOES.md` only when the "why" matters |
| Working on a feature request | Its GitHub issue (`gh issue view <n>`; open requests carry the `enhancement` label) and the `spec/` files it cites |
| Fixing a bug or refactoring | Its GitHub issue (`gh issue list --label bug` or `--label debito-tecnico`) and the relevant ADRs |
| Reviewing or reorganizing the docs | All of them; this is the only task that needs the whole set |

Never read `AVALIACAO-UX.md` (frozen) unless the task cites one of its codes (N1, P4...).

Hard rules from `google-safe.md`, valid for every change:
- No outbound network calls, analytics, telemetry or remote storage; `connect-src 'none'`.
- Data stays in IndexedDB; backups go only to local files the user picks (File System Access
  API), never through a server or OAuth.
- Never insert user text as HTML; links open with `target="_blank" rel="noopener noreferrer"`.
- Minimize dependencies; bundle them, never load from a CDN.

### Where information lives

Each kind of information has exactly one home. Before writing anything into a doc, find its home
in this table. Never copy content between docs: link to the home instead (see `spec/projetos.md`,
"Lista de projetos"). If two docs disagree, the home wins, and the conflict goes to `INCOERENCIAS.md`.

| Kind of information | Home | Notes |
| --- | --- | --- |
| Product rules (what the app does) | `spec/`, one file per feature | Source of truth. `SPEC.md` is the index: which file covers what, and the phases (1a, 1b, 2-6). Each rule says from which phase it applies, as *(1b)* |
| Open product questions | Top of the relevant file in `spec/` ("Em aberto") | Other docs point to them, never restate them |
| Terms | `GLOSSARIO.md` | One term, one meaning. Use these names in UI text and docs |
| Why product decisions were made; origin; product risks | `DECISOES.md` | The rule itself stays in `spec/` |
| What is built, what is missing, where code lags behind the spec, what is deferred | `ROADMAP.md` | The only place that tracks progress. Update it whenever you build or skip something |
| Feature requests not yet decided | GitHub issues of the repository, label `enhancement`, one per request | Each issue holds what changes in the spec, its "Em aberto" questions and its incoherences with the current model. When decided: rule to `spec/`, progress to `ROADMAP.md`, issue closed |
| Contradictions between docs | `INCOERENCIAS.md` | Temporary: remove an item once it is resolved |
| Technical design (data model, events, editor, triage, metrics) | `ARQUITETURA.md` | Design only, no progress. Keep it in sync when the design changes |
| Technical decisions | `adr/`, one file per decision | `architecture-decision-records.md` is the index, with each ADR's status. Technical only; product rules go to `spec/` |
| Known bugs, technical debt, known limitations | GitHub issues, label `bug` or `debito-tecnico`, plus a priority label (`p:alta`, `p:media`, `p:baixa`) | Every new bug or debt issue gets a priority label. Close the issue when resolved; open one when you knowingly leave something behind |
| Checks and setup only the owner can do | `DEBITO-TECNICO.md` | Checks in her Chrome, configuration and publishing. Remove an item when done |
| Security and compliance (local-only, no network, CSP, backups) | `google-safe.md` | Mandatory for every change |
| Screen drafts and implementation briefs | `rascunhos/` | `rascunhos/README.md` gives each draft's status; the spec wins over a draft |
| UX review of 12/10/2026 | `AVALIACAO-UX.md` | Frozen report; do not update. Open items live in issue [#19](https://github.com/Valerieps/best-app/issues/19) |

New docs start with what goes in them and what does not ("Entra aqui" / "Não entra aqui"). Product docs are written in Brazilian
Portuguese; ADRs, code and this file in English.

## Working with the owner
- The owner (Valeria) answers questions as a numbered list in the chat, or as nested items under
  each "Em aberto" question. Fold each answer into the text of its section and remove the
  answered question.
- Open questions sit at the top of each section, as a checklist.
- She edits the docs directly between messages. Re-read a doc before editing it and preserve
  what she wrote.
- The spec is written in the first person ("eu posso..."), in Brazilian Portuguese, keeping her
  voice, as in "triga" and "plim".
- When she asks what you think of the app, she wants a frank assessment, including the risks.

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
- `src/dev` - dev-only tools, such as the synthetic data behind "Carregar dados sintéticos" in
  "Dados e backup" (only in `npm run dev`).
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
- All user-facing UI text must be in Brazilian Portuguese, matching the voice of the spec (`spec/`)
- Whenever you do implementation work, add unit tests for it wherever useful - don't leave new or
  changed logic untested just because the task didn't explicitly ask for tests.

## Handling Spec Gaps
- Whenever a decision is needed to fill a gap the spec (`spec/`) doesn't cover, register
  an entry in `architecture-decision-records.md`, so the reasoning stays
  traceable instead of living only in code comments or commit messages.
- Exception: if the gap depends on a business/domain rule rather than a technical/architectural
  choice, ask the user before deciding whenever that's possible - compile every such open
  question found during the task into a single batch and ask them together before proceeding to
  implementation, rather than stopping repeatedly or asking one at a time. Only decide
  unilaterally when asking genuinely isn't possible (e.g. a non-interactive/autonomous run). Once
  resolved - by the user's answer or, failing that, your own decision - record it as an amendment
  to the right file in `spec/` itself, not an ADR - the spec should stay authoritative for
  anything a product/business decision would settle. When you decided it yourself, also list it
  under "Revisar as lacunas que o agente decidiu" in `ROADMAP.md`, so the owner can review it.
