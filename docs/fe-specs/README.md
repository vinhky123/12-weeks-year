# FE Specs — Antigravity Rules of Engagement

You (the **Antigravity agent**) implement the **UI** of the 12 Week Year Local app. This repo's agents implement everything else: the methodology rules, database, API, tests — and they write the specs you build from. This file is your entry point. Read it fully before writing any code.

## What you own

- `src/app/**` — pages and layouts (route files already exist as stubs; replace their contents per spec)
- `src/components/**` — UI components
- `src/app/globals.css` — global styles (Tailwind v4)

## What you must NOT touch

- `src/server/**`, `src/app/api/**`, `src/lib/contracts.ts`, `drizzle/**`, `scripts/**`, `tests/**`, `docs/**`, `*.config.*` files
- **Never import from `src/server/**` in UI code.** The ONLY backend-facing file you may import is `src/lib/contracts.ts` (types and constants). The UI talks to the backend exclusively through the HTTP API documented in each spec's `## Data contract` section.
- Never query SQLite, never read `data/`, never invent an endpoint that is not in a spec.

## How to work

1. Pick the phase folder you were pointed at (`phase-1/`, `phase-2/`, …). Each `*.md` inside is one feature.
2. Build **exactly** the spec'd behavior — screens, states, interactions, and copy as written. Copy text is specified verbatim in `## Copy & tone`; keep it verbatim (including the honest-but-supportive tone — no streak-consolation, no partial credit).
3. If a spec is wrong, ambiguous, or missing something you need, **do not improvise a product decision**. Add a note in that spec's `## Feedback` section and build the rest.
4. Follow the existing design baseline: Tailwind v4 utility classes, the `AppShell` sidebar layout (`src/components/AppShell.tsx`), slate palette, no new UI libraries unless a spec says so.
5. Keep components focused: one responsibility per file, colocate feature components under `src/components/<feature>/`.

## Running the app locally

```bash
npm install
npm run dev        # http://localhost:3000
```

The API serves from the same process. All data is local (`data/app.db`). Seeded demo data (the book's worked example) is available in Phase 1+ via the seed script.

## Book constants you will see everywhere

- A "year" = **12 execution weeks + week 13 (review)**. Week 13 is never scored.
- Execution score = completions ÷ due, per week. **85%+ = on track**, 65–84 = at risk, <65 = revise the plan. These thresholds live in `src/lib/contracts.ts`.
- Max **3 goals** per cycle; every goal has a required *why* and a measurable lag target.
- The score measures **achievements, not effort or intentions**.

## Definition of done (per spec)

Every item in the spec's `## Acceptance` checklist is true in the running app, with no console errors, no invented behavior beyond the spec, and no imports from `src/server/**`.

## Spec template

Use `docs/fe-specs/_TEMPLATE.md` (the format every spec follows). Phases land one folder at a time: specs are written by this repo's agents *after* the backing API is implemented and tested.
