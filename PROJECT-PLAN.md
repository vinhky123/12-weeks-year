# 12 Week Year Local — Project Plan

> **For agentic workers:** This is the **project plan / spec** for the whole platform. Per-phase implementation plans (task-by-task, TDD, exact file paths) will be written separately under `docs/superpowers/plans/` using the `writing-plans` skill, one per phase, starting with Phase 0 + 1. Do not implement directly from this document; generate the phase plan first.
>
> **Division of labor (D8):** This repo's agents build the **idea, methodology rules, backend (schema, domain logic, API, tests) and the functional FE spec for every feature**. The **UI implementation is done by the external Antigravity agent**, strictly from our specs in `docs/fe-specs/` + the API contract in `src/lib/contracts.ts` — see §6.4.
>
> **Source of truth for methodology:** [`12-week-year-book-content.md`](./12-week-year-book-content.md) — every feature below traces to a book concept (see Appendix A coverage matrix).

**Goal:** A local-first, self-hosted web platform that implements the complete *12 Week Year* system — not just plan creation, but the full execution operating system: vision, planning, weekly loop, execution scoring, time blocking, accountability, and the week-13 review.

**Architecture:** A single self-hostable Next.js app (UI + API in one process) with all data in a local SQLite file inside the repo folder. No cloud, no accounts, no telemetry. Each user clones the repo, runs one command, and owns their data (plus JSON export/import for backup and portability).

**Tech Stack (recommended, see §6):** Next.js (App Router) + TypeScript + Drizzle ORM + better-sqlite3 + Tailwind CSS + shadcn/ui + Recharts + Vitest + Playwright.

---

## 1. Product Vision

**One sentence:** *Your personal 12 Week Year operating system — clone it, run it locally, execute better.*

**What it is NOT:** a generic to-do app or habit tracker. It is a faithful implementation of one methodology. Every screen exists to drive execution of a 12-week cycle; anything that doesn't ladder up to the book's system gets cut (see Non-goals, §5).

**Core product beliefs (from the book):**
1. Execution, not knowledge, is the gap — so the app's center of gravity is the **weekly loop** (score → plan → execute), not the plan editor.
2. The *why* (vision, goal reasons, commitments) must be surfaced at the moments of execution and scoring, not buried in a settings page.
3. The score measures **achievements, not effort or intentions** — the app must stay honest (no partial credit, no streak consolation).
4. It's a closed system — vision, plan, process control, measurement, and time use must all be present before the platform is "comprehensive".

## 2. Distribution & Runtime Model

- **Self-hosted, one instance per person.** `git clone` → `npm install` → `npm run dev` (or `npm run build && npm start` for daily use). Documented in README as the 3-command quickstart.
- **All data local:** single SQLite file at `data/app.db` (gitignored). Backing up = copying the file, or JSON export from the app.
- **No server dependencies, no auth, no lock screen** (decision D6 in §15). Single user per instance; a "profiles" feature is out of scope for v1 (decision log §15).
- **Works fully offline** on localhost. PWA installability is Phase 4 polish.
- Windows/macOS/Linux alike (the primary user is on Windows + Git Bash — keep shell commands Bash-compatible and document path handling).

## 3. Users & Usage Context

- **Primary user:** the developer/owner themselves — technically comfortable, running the app locally, planning real 12-week cycles of work, health, and personal goals. UI language English-first, Vietnamese i18n in Phase 4 (user is Vietnamese-speaking).
- **Usage rhythm the app must support** (drives the information architecture):
  - **Once per cycle (every ~3 months):** write/refresh vision, create cycle, set 2–3 goals + tactics, design model week (~30–60 min sessions)
  - **Once per week (~30 min):** score last week, plan this week, prepare/run WAM — this is the app's home ritual
  - **Every day (~5 min):** open Today, execute, check off
  - **Week 13 (~2 h):** review wizard, celebrate, build next cycle
- The app must be pleasant at weekly/daily cadence (fast, keyboard-friendly) and capable at cycle cadence (wizards, validation, history).

## 4. Feature Modules (scope)

Features are grouped into modules F1–F14. Each lists its book basis and acceptance criteria. Priorities: **[P0]** MVP must-have (Phases 0–1), **[P1]** core comprehensive (Phase 2), **[P2]** completes the system (Phase 3), **[P3]** polish (Phase 4).

### F1 · Cycle Management [P0]
Create, start, pause(archive), and reopen 12-week cycles.
- Book basis: "a year is 12 weeks"; each cycle is a complete year with its own goals, plan, deadline, review.
- Rules: a cycle = start date + 12 numbered weeks + a distinct **week 13 (review)**; at most one cycle `active` at a time; week numbering derived from start date (§8.1); switching/creating a new cycle archives history, never deletes.
- Acceptance: user creates a cycle with a start date (default: next Monday); dashboard shows "Week 4 · Day 2 — 59 days left in the year"; week 13 auto-detected and switches the app into review mode.

### F2 · Plan Builder: Goals & Tactics [P0]
The 12-Week Plan editor.
- Book basis: §4 of book content doc — 2–3 goals/cycle, goal quality criteria, verb-first tactics with due patterns.
- Goals: title, **why (required)**, lag indicator (metric name, unit, start value, target value), deadline (default end of week 12), status. Soft-enforce **max 3 goals** with an explicit "the vital few — are you sure?" confirmation.
- Goal validation (inline, book's six criteria): specific/measurable (target value required), positively framed, realistically stretching (self-check prompt), accountable (owner = you), time-bound.
- Tactics: verb-first sentence; **due pattern** = `EVERY_WEEK × N per week` **or** `SPECIFIC_WEEKS [week numbers]` (one-time milestone); belongs to exactly one goal; can be deactivated with an *effective-from week* (keeps past scores stable, §8.3).
- Acceptance: the worked example from book doc §4.4 can be entered verbatim in < 10 minutes; a tactic with no goal is impossible; ad-hoc tasks cannot be added to weekly plans without either linking to a goal or being explicitly marked as a plan revision.

### F3 · Weekly Plan [P0]
Auto-generated, human-edited plan for the current week.
- Book basis: weekly plan is rebuilt fresh each week from the 12-Week Plan (never copy-pasted), strategic tactics only, ~15–20 min weekly ritual.
- Behavior: "Plan Week N" action pulls all tactics due in week N (per due patterns), lets the user place each on a specific day (Mon–Sun) and add time-bound commitments; regenerates weekly; shows a "not from the plan — add to 12-Week Plan?" guard when users try to insert random tasks (process-control discipline).
- Acceptance: generating week 3 from the demo plan produces exactly the tactics due that week; the previous week's plan is frozen (read-only) once scored.

### F4 · Today (Daily Execution) [P0]
The 5-minute daily view.
- Book basis: daily actions determine results; ~5 minutes each morning.
- Shows: today's placed items with one-tap completion, tactic context (which goal it serves + the goal's *why*), a "greatness in the moment" daily principle line, and progress bar for the day. Multi-count tactics (3×/week) show `2/3` progress.
- Acceptance: checking off items updates the week's execution score in real time; view is usable in < 5 minutes.

### F5 · Execution Scoring & Weekly Review Screen [P0]
The system's signature metric.
- Book basis: §6 — score = completions ÷ due, weekly, 85% benchmark, achievements only.
- Behavior: per-week score auto-computed (§8.2); "Close Week" ritual = see score → log lag values → reflect (one-line journal optional) → generate next week; score history strip with 85% reference line; per-goal score breakdown; honest feedback copy per band (≥85 green "executing at a high level", 65–84 amber "goals at risk", <65 red "revise the plan — this is diagnosis, not judgment").
- Acceptance: scoring a fully-completed demo week yields 100%; a week with 4 of 5 due tactic-completions shows 80% amber; no partial credit exists anywhere in the codebase.

### F6 · Cycle Dashboard [P0]
Home page for the active cycle: current week number, days remaining, goals with lag progress, current-week score, trend sparkline, next ritual (what the system wants from you right now — plan week / close week / week 13 review).

### F7 · Vision Module [P1]
- Book basis: §3 — three horizons (long-term, 3-year, this-cycle connection), life domains, "what if not how", pitfalls guidance.
- Behavior: guided editor (long-term → 3-year → "why does this cycle matter?" connection), life-domain checklist prompts; **vision is editable mid-cycle** — refinements apply immediately to the active cycle (decision D7), while an immutable snapshot is written when a cycle is archived so history stays truthful; vision surfaced during plan building, week close, valley weeks, and week 13.
- Acceptance: vision is reachable in ≤ 1 click from Today and from the weekly close ritual.

### F8 · Measurement: Lag & Lead Tracking + Charts [P1]
- Book basis: §6.1 — lag vs lead; track weekly.
- Behavior: lag logs per goal per week (value entry at week close); optional lead measures per goal (name, weekly target, log); charts: lag progress toward target, weekly execution trend vs 85%, per-goal execution; strategy-vs-execution diagnosis hint (score ≥85 but lag flat → "strategy problem — change tactics"; score <65 → "execution problem — process control").

### F9 · Model Week & Time Blocking [P1]
- Book basis: §7 — strategic block (3h/week), buffer blocks (30–60 min/day), breakout blocks (3h+/week), model work week.
- Behavior: weekly template editor with typed blocks (`STRATEGIC | BUFFER | BREAKOUT | PLANNING | WAM`) placed on days/times; validation nudges toward the book's quantities (warn if no 3h strategic block or no breakout); week view shows template + placed weekly-plan items; weekly planning slot and WAM slot pre-suggested (default Monday 15 min).
- Acceptance: a user can reproduce the book's model week in < 10 min; cycle start checklist (§4 F11 flow) includes "model week defined".

### F10 · WAM (Weekly Accountability Meeting) Module [P2]
- Book basis: §5.3 — weekly report-out (results, score, next-week intentions), feedback, techniques, encouragement; 2–4 people, supportive tone.
- Behavior (solo-first, local): a guided **self-accountability review** producing a WAM report per week (auto-filled: results to date, this week's score, next week's commitments; free-text: blockers, what worked, encouragement); **export as Markdown/text** to bring to an external peer group (the app can't host group meetings — non-goal); WAM slot reminder via model week.
- Acceptance: one-click export produces a clean standalone WAM report for the week.

### F11 · Week 13 Review & Next-Cycle Wizard [P2]
- Book basis: §13 — celebrate → 4-part review (Results, Quality of Life, Success Disciplines, Breakthroughs) → build next plan.
- Behavior: week 13 detected automatically → celebration summary first (wins, best week, goal completions) → guided review: **Results** (per-goal grade auto-suggested from % complete + score average), **Quality of Life** (6 areas: Spiritual, Spouse/key relationship, Family, Business, Personal, Physical — 1–10 sliders with user-defined 1/10 anchors), **Success Disciplines** (5 items: vision, planning, weekly routine, performance time, key measures — 1–10), **Breakthroughs** (what must change in thinking/actions to 2× results; work *on* vs *in*) → next-cycle wizard carries forward the living vision, suggests goals/tactics based on review notes, links back to history.
- Acceptance: completing a cycle end-to-end (weeks 1–13) produces an archived cycle with review and a drafted next cycle.

### F12 · Guardrails: Emotional Cycle & Commitment [P2]
- Book basis: §12 (valley of despair ≈ weeks 3–6), §9 (commitment keys: desire, keystone actions, count the costs, act on commitments not feelings), §10 (greatness in the moment).
- Behavior: in-app encouragement at weeks 3–6 ("the valley is normal — data point, not verdict", surface vision + goal whys); cycle-start **commitment builder** (count-the-costs prompt: what will this cost in comfort/pleasure? confirm "I choose to"); daily principle line on Today; never gamified into dishonesty (no streak soothing).
- Acceptance: a demo cycle at week 4 with score <70 shows the valley guidance, not a generic error state.

### F13 · History & Insights [P2]
Archived cycles with their plans, scores, reviews; cross-cycle trends (score by cycle, goal completion rate, QoL area movement); "last cycle's breakthrough actions" surfaced during next-cycle planning.

### F14 · Portability, PWA & Polish [P3]
- JSON export/import of **all** data (full fidelity, versioned format) + one-click backup file download + auto-backup on week close (rolling N copies in `data/backups/`).
- PWA: installable, offline-capable, works with the local server stopped after first load.
- Dark/light theme; print-friendly plan & WAM exports; i18n (English + Vietnamese); demo data seeder (the book's worked example, §4.4 of book doc).

## 5. Non-Goals (v1)

- **No cloud, no sync, no multi-device**, no accounts/auth server, no multi-tenant hosting.
- **Not a group-collaboration tool** — WAM is solo review + export; no real-time sharing.
- **Not a general task manager** — no projects/labels/inbox GTD features; the 12-Week Plan is the only source of weekly work (ad-hoc tasks go through plan revision).
- **No gamification beyond the book** (no points, badges, social feeds).
- **No mobile native app** (PWA only). Tauri desktop wrapper is a stretch idea, not planned.
- **No AI features in v1** (decision log §15).

## 6. Architecture & Stack

### 6.1 Recommended stack (locked for Phases 0–2; revisit at Phase 3)

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | UI + API routes in one process; one-command local run; first-class TS; huge ecosystem |
| Database | **SQLite** via **better-sqlite3** + **Drizzle ORM** | Single local file (`data/app.db`); zero setup; durable across browsers; backup = copy file; Drizzle gives typed schema + migrations |
| Styling / UI | **Tailwind CSS + shadcn/ui** | Fast to a decent, consistent design; components are copy-in (self-hostable, no runtime dependency on a component service) |
| State / data fetching | **TanStack Query** (server state) + **Zustand** (light UI state) | Server data lives in SQLite; client just queries |
| Charts | **Recharts** | Score trends, lag progress, QoL radar |
| Validation | **Zod** | Shared schemas for API + forms |
| Testing | **Vitest** (unit) + **Testing Library** (components) + **Playwright** (e2e) | Scoring/week math are pure functions → heavily unit-tested; e2e covers the ritual loop |
| Date handling | **date-fns** + custom `cycleMath` module | All cycle/week logic centralized and unit-tested (§8.1) |

### 6.2 Alternatives considered (decision log §15 has details)

- **Static SPA + IndexedDB (Dexie)** — simplest run (any static server), but data is bound to one browser profile and silently lost if the profile is cleared; SQLite file is more durable and backup-able. Rejected for data-durability risk; revisit only if run-experience proves painful.
- **SvelteKit + SQLite** — leaner, smaller community for shadcn-style components; no decisive advantage for a solo local app.
- **Tauri desktop app** — best "own your data" story but heavy tooling (Rust, per-OS builds) for v1; possible Phase 5 wrap-around since the web app stays framework-agnostic in its data layer.

### 6.3 App shape

```
Next.js app
├─ src/app/** pages + src/components/**        # UI — built by ANTIgravity from docs/fe-specs/
├─ src/app/api/* routes                        # thin controllers — THIS repo
├─ src/server/ (domain layer — pure, testable) # THIS repo
│   ├─ cycleMath.ts        (dates → week numbers; pure)
│   ├─ scoring.ts          (due/completed/score; pure)
│   ├─ planRules.ts        (due patterns, effective-from, plan revision guard; pure)
│   └─ repositories/       (Drizzle queries, thin)
├─ src/lib/contracts.ts                        # API contract: zod schemas + TS types — THIS repo authors, UI consumes
└─ data/app.db                                 (gitignored; user's own data)
```
The **domain layer is pure TypeScript with no I/O** — this is where the book's rules live and where most tests point. UI and API stay thin.

### 6.4 Collaboration Model — this repo (idea + backend + FE specs) ⇄ Antigravity (UI implementation)

**Ownership table (binding, decision D8):**

| Concern | Owner |
|---|---|
| Book methodology, product ideas, business rules | This repo (book doc + this plan + domain modules) |
| DB schema, domain logic (`cycleMath`/`scoring`/`planRules`), `/api` routes, seed & backup scripts, all backend tests | This repo's agents |
| API contract — endpoints, request/response types (`src/lib/contracts.ts`) | This repo (single source of truth; UI may not invent endpoints) |
| **UI implementation & UI testing** — `src/app/**` pages, `src/components/**`, `tests/e2e/**` (Playwright E2E tests) | **Antigravity**, built strictly from `docs/fe-specs/**` |
| Design system baseline (Tailwind + shadcn tokens, layout shell) | This repo sets it in Phase 0; Antigravity follows it |

**Per-feature workflow — repeats for every feature in every phase:**

1. **Idea** — extract the book concept and its exact rules (book doc → rules)
2. **Backend** — schema + pure domain module + `/api` route + tests, TDD (this repo)
3. **FE function spec** — write `docs/fe-specs/phase-N/<feature>.md` using the template below (this repo)
4. **Handoff** — Antigravity implements the UI from the spec + `contracts.ts` against the real local API
5. **Integration checkpoint** — Antigravity implements and runs Playwright e2e on the real UI; wire-up review and Appendix B fidelity check close the phase

**FE spec template** — every spec file contains ALL of these sections, no placeholders:

```markdown
# FE Spec — <Feature> (F#, Phase N)
## Idea & why (book basis)    # 2–4 sentences; link the book-doc section this serves
## Screens & routes           # exact routes (from §9); what the user sees on each
## Components & layout        # key components, hierarchy, responsive behavior
## States                     # empty / loading / error / edge (frozen week, valley week, no active cycle...)
## Interactions               # click-by-click flows, keyboard shortcuts, optimistic updates (or not)
## Data contract              # exact endpoints used: METHOD /api/path + request/response types copied from src/lib/contracts.ts
## Copy & tone                # honest-but-supportive; required book lines (e.g. the 85% benchmark) verbatim
## Acceptance                 # checklist tied to the module's acceptance criteria in §4
```

**Rules for Antigravity (repeated in the header of every spec file):**
- Consume ONLY the documented API through the types in `src/lib/contracts.ts`. Never import from `src/server`, never query SQLite from UI code.
- Build exactly the spec'd behavior — no new product features, no invented endpoints.
- **Contract conflict escalation:** If Antigravity encounters any conflict, gap, or ambiguity between the FE spec and `src/lib/contracts.ts` / `/api/*`, Antigravity **flags it directly to the user** (and notes it in the spec's `## Feedback` section). The user instructs the functional agent to refine the contract/endpoint and respond back to Antigravity. Antigravity never improvises or patches over contract conflicts with client-side hacks.
- Follow the established design system (Tailwind + shadcn, existing layout shell); keep copy verbatim from the spec.

**Functional backend phase delivery protocol (mandatory, every phase — D9):**

1. **Structure** — scaffold the phase's files per its implementation plan
2. **Implement with unit tests** — TDD; domain rules tested as specified in §11
3. **Refinement pass** — refactor/polish where needed: dead code out, naming, all tests green, no TODOs left in delivered code
4. **Write the phase's FE specs** — `docs/fe-specs/phase-N/<feature>.md`, one per UI surface in the phase
5. **Delivery report to the user** that ends with an explicit handoff call-out, one of:
   - *"Phase N delivered → **call the Antigravity agent** to build the UI from `docs/fe-specs/phase-N/` (screens: …)"*
   - *"Phase N delivered → no UI handoff needed this phase"*
6. The user dispatches Antigravity; UI work proceeds while the **next phase's backend starts**; the phase's integration checkpoint completes once that UI lands.

**Antigravity UI phase delivery protocol (mandatory, every phase — D10):**

When dispatched for a phase, Antigravity executes through a parallel, disciplined lifecycle:
1. **Structure** — scaffold UI component and page files per `docs/fe-specs/phase-N/` and import types from `src/lib/contracts.ts`.
2. **Implement** — build UI components (`src/components/**`) and route pages (`src/app/**`) strictly against specs, handling all states (empty, loading, error, edge) and verbatim copy.
3. **Test (UI & E2E)** — author and run Playwright E2E tests in `tests/e2e/` testing the complete user workflows on the real UI against the local server; all tests must pass green.
4. **Refine** — polish styling, layout responsiveness, accessibility, remove dead code, and ensure zero linter errors/TODOs.
5. **Escalate contract adjustments (if needed)** — if any contract conflict or omission is encountered, halt and notify the user immediately so the functional agent can resolve it.
6. **Deliver** — submit a structured UI delivery report to the user summarizing delivered screens, passing Playwright E2E test suite, and completed integration checkpoint.

**Cadence rule:** phases never block on UI delivery — backend + specs keep advancing; each phase closes at its integration checkpoint when Antigravity's UI lands and tests pass.

## 7. Data Model (v1 schema)

SQLite via Drizzle. Snake_case tables, camelCase TS fields. All rows soft-archived via cycle references (no hard deletes of scored history).

| Table | Key fields | Notes |
|---|---|---|
| `settings` | `id` (singleton), `currentCycleId`, `weekStartsOn` (default 1=Mon), `theme`, `locale`, `backupPrefs` | App-level config |
| `visions` | `id`, `longTerm`, `threeYear`, `cycleConnection`, `lifeDomains` (JSON), `cycleId?` (snapshot link), `createdAt` | Living vision (editable mid-cycle, per D7) + immutable snapshot written at archive time |
| `cycles` | `id`, `name`, `startDate`, `status`: `planning \| active \| review \| archived`, `createdAt`, `archivedAt` | ≤1 `active` |
| `goals` | `id`, `cycleId`, `title`, `why`, `lagMetricName`, `lagUnit`, `lagStart`, `lagTarget`, `deadlineWeek` (default 12), `status`, `sortOrder` | Max 3 enforced at UI + service level |
| `tactics` | `id`, `goalId`, `text`, `duePattern` (JSON: `{type:'EVERY_WEEK', timesPerWeek}` \| `{type:'SPECIFIC_WEEKS', weeks:number[]}`), `keystone` (bool), `createdAt`, `activeFromWeek`, `deactivatedAtWeek?` | Belongs to exactly one goal |
| `completions` | `id`, `tacticId`, `cycleWeek` (1–12), `date`, `createdAt` | One row per completion event (3×/week tactics → up to 3 rows); never edited, only added/removed before week close |
| `week_plans` | `id`, `cycleId`, `weekNumber`, `status`: `draft \| closed`, `closedAt`, `reflection` (one-liner) | One per week; frozen when closed |
| `week_plan_items` | `id`, `weekPlanId`, `tacticId?`, `label`, `dayOfWeek` (0–6), `done`, `plannedCount` | tacticId null only for plan-revision items |
| `block_templates` | `id`, `cycleId?` (null = global default), `type`: `STRATEGIC \| BUFFER \| BREAKOUT \| PLANNING \| WAM`, `dayOfWeek`, `startMinute`, `durationMinutes`, `label` | The model week |
| `lag_logs` | `id`, `goalId`, `weekNumber`, `value`, `loggedAt` | Weekly lag values |
| `lead_measures` / `lead_logs` | goal-linked optional lead tracking | Phase 2 |
| `wam_reports` | `id`, `cycleId`, `weekNumber`, `autoJSON` (results/score/commitments snapshot), `blockers`, `whatWorked`, `encouragement` | Phase 3 |
| `cycle_reviews` | `id`, `cycleId`, `resultsJSON`, `qualityOfLifeJSON` (6 areas × rating + anchors), `disciplinesJSON` (5 items), `breakthroughs`, `nextCycleNotes` | Phase 3 |
| `backups_meta` | exported-at tracking for auto-backup | Phase 4 |

Derived (not stored): weekly execution score, due counts, projections, trends — always computed from tactics + completions so scores can't drift from raw data.

## 8. Core Business Rules (the book's laws, as code)

### 8.1 Cycle math (`cycleMath.ts` — pure)
- `cycleWeek(date, cycleStart)`: weeks are 1–12; week N starts at `cycleStart + 7·(N−1)` days; week 13 = review window; before start → 0 ("pre-cycle"); after week 13 ends → "expired" (prompt to review/archive).
- Default start = next Monday; `weekStartsOn` configurable but cycle math is anchored to `startDate` (not calendar weeks) so mid-week starts still produce clean 12 weeks.
- `today()` injected as parameter (testability — no hidden `new Date()`).

### 8.2 Scoring (`scoring.ts` — pure)
```ts
dueForWeek(tactic, week, cycle): number
  // EVERY_WEEK → timesPerWeek (for weeks ≥ activeFromWeek, ≤ deactivatedAtWeek)
  // SPECIFIC_WEEKS → 1 if week ∈ weeks else 0

weekScore(cycle, week): { due, completed, scorePct, band } | null   // null when due === 0
  // completed = min(count(completions in week), due)   ← no partial credit above due
  // scorePct = round(100 * completed / due)
  // band: ≥85 'ON_TRACK' · 65–84 'AT_RISK' · <65 'REVISE_PLAN'

goalScore(cycle, week, goalId)   // same, filtered to goal's tactics
cycleAvgScore(cycle)             // mean over scored weeks
```
- Current (in-progress) week shows a **projected score** clearly labeled as such.
- Completions belonging to a closed week are frozen (UI blocks edits; service rejects with explicit error).

### 8.3 Plan-change integrity
- Deactivating a tactic takes `deactivatedAtWeek` (default = current week) → historical dues unchanged.
- New tactic takes `activeFromWeek` (default = current week) → past weeks' scores never retroactively change.
- Adding a non-plan item to a week plan requires either linking to a goal (making it a tactic) or confirming "add as plan revision" — logged and visible in cycle history.

### 8.4 Cycle lifecycle
`planning` (editable freely) → `active` (weeks run; scoring live) → week 13 auto-enters `review` (wizard) → `archived` (read-only snapshot + review). Only one active cycle. Starting a new cycle requires the previous one to be archived or explicitly deferred.

## 9. UX: Screens & Key Flows

*(This section is the master screen map. Each `docs/fe-specs/**` file zooms into one feature of it — Antigravity builds from those specs, never from this section alone.)*

### Screen map
```
/               → Cycle Dashboard (active cycle) or /onboarding or /review (week 13)
/onboarding     → first-run: vision → first cycle → goals → tactics → model week
/today          → Today view (daily driver)
/plan           → 12-Week Plan editor (goals + tactics)
/week           → current Weekly Plan (generate/edit/close)  +  week history
/vision         → Vision editor
/model-week     → time block template editor
/measures       → lag/lead logs + charts
/wam            → weekly accountability report
/review         → week 13 review wizard (also /history/:cycleId)
/history        → archived cycles + cross-cycle insights
/settings       → data (export/import/backups), theme, locale, PIN
```

### Flow 1 — Onboarding (first run)
Welcome (the 12-week premise in 5 bullets) → Vision builder (3 horizons + life domains) → Create cycle (start date) → Add up to 3 goals (why + lag target) → Add tactics (due patterns, with the worked example as inline inspiration) → Model week (with book-default template offered) → Commitment builder (count-the-costs, "I choose to") → Dashboard.

### Flow 2 — Weekly ritual (every week, the app's core loop)
Dashboard nudges "Close week N" → score review (auto score + lag logging + one-line reflection) → close week (freeze) → "Plan week N+1" (auto-pull due tactics → place on days) → optional WAM report → done in ~30 min.

### Flow 3 — Daily
Open `/today` → see today's items (goal + why context) → check off → daily principle line → progress bar. Nothing else competes for attention.

### Flow 4 — Week 13
Auto-detected → celebration summary → 4-part review wizard → next-cycle wizard (carry vision, propose goals from breakthrough notes) → new cycle `planning`.

## 10. Phased Roadmap

Sizes assume solo development with agent assistance. Each phase ends with **working, testable software** and a commit point. Before each phase begins, write its implementation plan via `writing-plans` into `docs/superpowers/plans/YYYY-MM-DD-phase-N-*.md`.

**Every phase runs the same delivery protocol (§6.4, D9):** structure → implementation with unit tests (TDD) → refinement pass → FE specs → **delivery report that explicitly tells the user to call Antigravity for `docs/fe-specs/phase-N/`** (or "no UI handoff this phase"). Backend work never waits on UI.

### Phase 0 — Foundations (S, ~2–4 days)
Scaffold Next.js + TS + Tailwind + shadcn; Drizzle schema for settings/cycles/goals/tactics/completions/week_plans; `cycleMath` + `scoring` pure modules **fully unit-tested**; app shell + navigation; README quickstart (3 commands); Vitest + Playwright wired; **collaboration setup per §6.4** — `src/lib/contracts.ts` skeleton, `docs/fe-specs/` folder + spec template, Antigravity handoff README (rules for Antigravity).
**Exit criteria:** `npm run dev` boots an empty dashboard; `npm test` green with cycle/scoring tests covering §8.1–8.2; `data/` gitignored; **an Antigravity agent reading `docs/fe-specs/README.md` knows exactly what it may build, where, and from which contract.**
**Antigravity handoff at delivery:** *none* — the app shell & design baseline are ours; this phase creates the handoff materials (spec template, rules README, `contracts.ts` skeleton) that later phases' calls rely on.

### Phase 1 — Core Loop MVP (L, ~1.5–2.5 weeks) → *enough to run a real 12-week cycle*
F1 cycles, F2 plan builder (goals+tactics+validation), F3 weekly plan generate/edit/freeze, F4 Today, F5 scoring + close-week ritual, F6 dashboard. Seed script with the book's worked example. **Antigravity handoff at delivery:** specs for all five core screens (`docs/fe-specs/phase-1/`) — the delivery report tells the user to call Antigravity; UI builds in parallel with Phase 2's backend.
**Exit criteria (e2e-tested):** create cycle → add 2 goals with 5 tactics → generate week 1 → check off items across the week → close week → score matches hand calculation → generate week 2. Honest-score rules verified (over-completion capped, frozen weeks immutable). *(Until Antigravity's UI lands, this exact path is covered by API contract tests; Playwright runs it for real at the integration checkpoint.)*

### Phase 2 — Vision, Measurement, Time (M, ~1–1.5 weeks)
F7 vision module (+surfacing), F8 lag/lead logs + charts + diagnosis hints, F9 model week editor + week view + cycle-start checklist integration. **Antigravity handoff at delivery:** vision page, measures & charts, model week editor (`docs/fe-specs/phase-2/`).
**Exit criteria:** onboarding flow complete end-to-end; lag chart shows progress vs target; model week validates book quantities; vision reachable in one click from Today and close-week.

### Phase 3 — Accountability, Review, Guardrails (M, ~1–1.5 weeks)
F10 WAM (solo report + export), F11 week-13 wizard + archive + next-cycle carry-over, F12 valley/commitment guardrails, F13 history + cross-cycle insights. **Antigravity handoff at delivery:** WAM view, review wizard, history/insights (`docs/fe-specs/phase-3/`).
**Exit criteria:** a full simulated cycle weeks 1–13 (Playwright) ends with archived review and drafted next cycle; valley guidance appears in the simulated week-4 dip; history renders past cycles read-only.

### Phase 4 — Portability & Polish (S/M, ~1 week, sliceable)
F14: JSON export/import (full fidelity) + auto-backup on week close; PWA (installable/offline); dark/light; print exports (plan, WAM); i18n EN/VI; demo seeder. **Antigravity handoff at delivery:** polish pass over all existing screens per updated `docs/fe-specs/phase-4/` specs.
**Exit criteria:** export → wipe → import reproduces identical state; Lighthouse PWA-installable; VI locale complete.

Post-v1 candidates (parking lot): Tauri wrapper, profiles, calendar (.ics) export of model week, local-only AI coach grounded in the user's own score data.

## 11. Testing & QA Strategy

- **Unit (Vitest) — the doctrine layer:** `cycleMath`, `scoring`, `planRules` get exhaustive tests: partial weeks, 3×/week tactics, specific-week tactics, over-completion capping, frozen weeks, deactivation mid-cycle, week with zero dues, cycle boundaries, week 13 exclusion. *These tests ARE the book-fidelity check.*
- **Contract tests (Vitest, API-level):** every `/api` route is tested directly (request → response + DB state), so each phase's backend completes and verifies **without waiting for Antigravity's UI**. These double as executable documentation of the FE data contracts.
- **Component (Testing Library):** written at integration checkpoints for the Antigravity-built screens (plan builder validation, close-week ritual, review wizard steps).
- **E2E (Playwright):** the three rituals — onboarding, weekly loop (Phase 1 exit), full cycle 1→13 (Phase 3 exit) — run against the real UI at each integration checkpoint.
- **Manual fidelity checklist** (Appendix B invariants) run before releasing each phase; Appendix A coverage matrix reviewed at each phase gate to catch drift.
- **Data safety:** any destructive operation (wipe, import-over) requires explicit confirmation and an auto-backup first.

## 12. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Scope creep toward generic task manager | Non-goals §5 enforced at plan level; every new feature must cite a book concept to enter scope |
| Building everything before running a real cycle | Phase 1 is deliberately a usable MVP — start a real 12-week cycle on it; Phases 2–4 improve the live product |
| Data loss (SQLite corruption, accidental delete) | Auto-backup on week close + JSON export + gitignored-but-copyable file; export tested in CI |
| Over-engineering / analysis paralysis | YAGNI per phase; parking lot for ideas; each phase ships working software |
| Emotional-design failure (app feels like a cold judge) | Copy tone: honest but supportive; valley guardrails; celebration-first week 13; user testing on self each week |
| Scoring edge cases erode trust in the metric | Pure-function scoring + exhaustive unit tests; score always re-derivable from raw completions |

## 13. Repository Structure (target)

```
12-weeks-planning/
├─ 12-week-year-book-content.md     # methodology source of truth (done)
├─ PROJECT-PLAN.md                  # this file
├─ docs/
│  ├─ superpowers/plans/            # per-phase implementation plans (this repo)
│  ├─ fe-specs/                     # ★ functional UI specs handed to Antigravity (this repo authors)
│  │  ├─ README.md                  # Antigravity rules of engagement (§6.4)
│  │  └─ phase-N/<feature>.md       # one spec per feature, template §6.4
│  └─ architecture.md               # (grown as needed, not upfront)
├─ src/                             # Next.js app
│  ├─ app/                          # routes (screen map §9) — UI by Antigravity
│  ├─ app/api/                      # API routes — this repo
│  ├─ components/                   # UI components — Antigravity
│  ├─ server/                       # domain layer (pure) + repositories — this repo
│  └─ lib/contracts.ts              # shared API contract (zod + TS) — this repo authors, UI consumes
├─ data/                            # app.db + backups/ (gitignored)
├─ scripts/                         # seed.ts (book worked example), backup helpers
├─ tests/                           # e2e (Playwright); unit + API contract tests colocated in src
└─ package.json / drizzle.config.ts / ...
```

## 14. Documentation Deliverables

- `README.md` — the 3-command quickstart (clone/install/run), backup instructions ("your data is yours"), 2-minute method primer with a link to the book (buy it).
- `docs/fe-specs/README.md` — the **Antigravity handoff guide**: ownership boundaries, rules of engagement, spec template, and where the API contract lives. Every spec file links back to it.
- `docs/DATA-AND-BACKUP.md` — where data lives, how to back up/restore/migrate.
- Each phase's implementation plan in `docs/superpowers/plans/`.

## 15. Decision Log & Open Questions

| # | Decision | Status |
|---|---|---|
| D1 | Stack: Next.js + SQLite (vs static+IndexedDB) | **Decided** — durability of a file DB beats zero-backend simplicity; revisit only on real friction |
| D2 | Single-user per instance (no profiles) | **Decided for v1** — profiles parked |
| D3 | WAM = solo report + export (no group features) | **Decided** — matches local-first constraint |
| D4 | UI English-first, VI i18n Phase 4 | **Decided** |
| D5 | AI features | **Deferred** — parking lot; must stay local to honor the ethos |
| D8 | UI implementation delegated to the **Antigravity agent** | **Decided (user, 2026-09-27)** — this repo owns idea/rules/backend/API/contracts/tests **and writes the functional FE spec for every feature** (`docs/fe-specs/`, template §6.4); Antigravity owns `src/app/**` pages + `src/components/**` and builds only from those specs; integration checkpoints close each phase |
| D9 | Phase delivery protocol | **Decided (user, 2026-09-27)** — each phase: structure → implement with unit tests → refine code → write FE specs → delivery report that **explicitly tells the user to call Antigravity** for that phase's specs (or states "no UI handoff this phase"); backend of the next phase starts without waiting for the UI |
| D10 | UI delivery protocol & UI testing ownership | **Decided (user, 2026-09-27)** — Antigravity owns UI implementation AND UI testing (Playwright E2E in `tests/e2e/`); follows structured delivery: structure → implement → test (Playwright E2E) → refine → contract escalation if needed → deliver; contract conflicts are escalated directly to the user for functional agent refinement |
| D6 | No PIN lock / lock screen | **Decided (user, 2026-09-27)** — dropped; local single-user app needs no lock |
| D7 | Vision editable mid-cycle | **Decided (user, 2026-09-27)** — yes, refinements apply immediately to the active cycle; an immutable snapshot is still written at archive time so archived cycles keep the vision that ended them |

## Appendix A — Book Concept → Feature Coverage Matrix

| Book element | Feature(s) | Phase |
|---|---|---|
| Year = 12 weeks, week 13 review | F1 cycles, F11 review wizard | 1 / 3 |
| Vision: 3 horizons, life domains, pitfalls | F7 vision module (+ onboarding) | 2 |
| 2–3 goals, quality criteria, *why* | F2 plan builder | 1 |
| Tactics: verb-first, every-week/specific-week | F2 due patterns | 1 |
| Weekly plan (fresh, strategic-only) | F3 + plan-revision guard | 1 |
| Daily actions (~5 min) | F4 Today | 1 |
| Process control: score → plan → WAM loop | F5 close-week ritual, F10 WAM | 1 / 3 |
| Execution score, 85% benchmark, bands | F5 scoring | 1 |
| Lag vs lead indicators, diagnosis | F8 measures | 2 |
| Time blocking: strategic/buffer/breakout, model week | F9 | 2 |
| Accountability as ownership | F10 self-report framing, copy tone | 3 |
| Commitment (costs, choose-to) | F12 commitment builder | 3 |
| Greatness in the moment | F4 daily principle line | 1 |
| Intentional imbalance (6 QoL areas) | F11 review step 2 | 3 |
| Emotional cycle / valley of despair | F12 guardrails | 3 |
| Breakthroughs (work on vs in) | F11 review step 4 | 3 |
| History / four years per year | F13 insights | 3 |
| Local ownership of data | F14 export/backup | 4 |

## Appendix B — Invariants the App Must Enforce (fidelity checklist)

1. A year is 12 weeks; week 13 is review, never scored.
2. Max 3 goals per cycle (soft gate with explicit override confirmation).
3. Every tactic traces to exactly one goal; every goal has a required *why* and a measurable lag target.
4. Weekly plans regenerate from the 12-Week Plan each week — never copied.
5. The score counts completions only; over-completion caps at due; no effort/intent credit.
6. 85% is always visible as the benchmark; bands: ≥85 / 65–84 / <65 with revise-plan guidance.
7. Historical scores are immutable — plan changes apply from the current week forward.
8. The vision is ≤ 1 click away from every execution surface (Today, close-week, valley weeks, review).
9. Celebration precedes analysis in week 13.
10. All data exportable/importable in full fidelity; nothing leaves the machine.
