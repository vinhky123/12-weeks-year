# 12 Week Year Local

Your personal [12 Week Year](https://12weekyear.com) operating system — **local-first, self-hosted**. Not just a plan editor: the full execution system from the book (Brian P. Moran & Michael Lennington — [get it here](https://12weekyear.com)), with vision, 12-week planning, the weekly score→plan→execute loop, time blocking, accountability, and the week-13 review.

> A year is no longer 12 months. It's 12 weeks — plus a week 13 to celebrate, review, and reload.

## Quickstart (3 commands)

```bash
git clone <your-fork-url> && cd 12-weeks-planning
npm install
npm run dev          # → http://localhost:3000
```

For daily use after the first setup: `npm run build && npm start`.

## Your data is yours

Everything lives in a single local SQLite file: **`data/app.db`** (gitignored).

- **Back up** = copy that file (a `data/backups/` auto-backup and JSON export/import arrive in Phase 4).
- **Move machines** = copy the repo + `data/` folder.
- Use a different location: set `TWY_DB_PATH=/path/to/app.db`.
- No cloud, no accounts, no telemetry. Ever.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` | Unit tests (domain rules — cycle math & scoring) |
| `npm run db:generate` | Generate SQL migrations after schema changes |
| `npm run db:migrate` | Apply migrations to the local DB |

## Roadmap

| Phase | Scope | Status |
|---|---|---|
| 0 | Foundations: scaffold, pure domain engine (cycle math + scoring), schema, app shell, Antigravity kit | ✅ done |
| 1 | Core loop: cycles, goals & tactics, weekly plan, Today, execution scoring, dashboard | ⏳ next |
| 2 | Vision, measures & charts, model week / time blocking | planned |
| 3 | WAM, week-13 review wizard, guardrails, history | planned |
| 4 | Backup/export, PWA, themes, EN/VI, print | planned |

Full plan: [`PROJECT-PLAN.md`](./PROJECT-PLAN.md) · Methodology source: [`12-week-year-book-content.md`](./12-week-year-book-content.md)

## Two-agent development

Backend, methodology rules, and tests are built in this repo. The UI is implemented by the **Antigravity agent** from functional specs in [`docs/fe-specs/`](./docs/fe-specs/README.md) and the API contract in `src/lib/contracts.ts`.
