# 12 Week Year Local

Your personal [12 Week Year](https://12weekyear.com) operating system — **local-first, self-hosted**. Not just a plan editor: the full execution system from the book (Brian P. Moran & Michael Lennington — [get it here](https://12weekyear.com)), with vision, 12-week planning, the weekly score→plan→execute loop, time blocking, accountability, and the week-13 review.

> A year is no longer 12 months. It's 12 weeks — plus a week 13 to celebrate, review, and reload.

## Quickstart (3 commands)

```bash
git clone https://github.com/vinhky123/12-weeks-year.git && cd 12-weeks-year
npm install
npm run dev          # → http://localhost:3000
```

For daily use after the first setup: `npm run build && npm start`.

## Your data is yours

Everything lives in a single local SQLite file: **`data/app.db`** (gitignored).

- **Back up** = copy that file, download a JSON export in Settings, or use the automatic checkpoints in `data/backups/`.
- **Move machines** = copy the repo + `data/` folder.
- Use a different location: set `TWY_DB_PATH=/path/to/app.db`.
- No cloud, no accounts, no telemetry. Ever.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` | Unit + API contract tests (domain rules — cycle math, scoring, core loop) |
| `npm run db:generate` | Generate SQL migrations after schema changes |
| `npm run db:migrate` | Apply migrations to the local DB |
| `npm run db:seed` | **Wipe & seed demo data** — the book's worked example on live dates (week 1 closed at 92%, week 2 in progress) |

## Try the demo

```bash
npm install
npm run db:seed
npm run dev   # then: curl http://localhost:3000/api/dashboard
```

## Roadmap

| Phase | Scope | Status |
|---|---|---|
| 0 | Foundations: scaffold, pure domain engine (cycle math + scoring), schema, app shell, Antigravity kit | ✅ done |
| 1 | Core loop backend: cycles, goals & tactics, weekly plans, completions, scoring, dashboard — 20 tested API endpoints + FE specs | ✅ done (backend + UI) |
| 2 | Vision, measures & charts, model week / time blocking | ✅ done (backend + UI + e2e) |
| 3 | WAM, week-13 review wizard, guardrails, history | ✅ done (backend + UI + e2e) |
| 4 | Backup/export, PWA, themes, EN/VI, print | ✅ done (backend + UI + e2e) — **v1 complete** |

## Backup & your data

- **Automatic**: closing a week writes a JSON checkpoint to `data/backups/` (newest 5 kept).
- **Manual**: `Settings → Data` (or `GET /api/export`) downloads the full database as one versioned JSON file.
- **Restore**: `Settings → Data → Import` (a pre-import snapshot is written automatically), or copy `data/app.db`.

Full plan: [`PROJECT-PLAN.md`](./PROJECT-PLAN.md) · Methodology source: [`12-week-year-book-content.md`](./12-week-year-book-content.md)

## Two-agent development

Backend, methodology rules, and tests are built in this repo. The UI is implemented by the **Antigravity agent** from functional specs in [`docs/fe-specs/`](./docs/fe-specs/README.md) and the API contract in `src/lib/contracts.ts`.

## Release scope — 2026-10-05

This release adds persistent extra-task completion, archived-cycle mutation guards, saved WAM facts, closed-week averages, dated week-13 recovery, explicit draft/final cycle reviews with resume/retry, atomic next-cycle creation from measured baselines, and a selected-cycle read-context endpoint.

Repeated tactics still use the existing bundled execution model. Separate occurrence scheduling, its backup upgrade, the new carryover preview UI, and the remaining workspace polish are deferred; unfinished source is preserved on `codex/project-completion`. See [release notes](RELEASE-NOTES.md) and [the updated plan](docs/superpowers/plans/2026-10-04-project-completion.md).
