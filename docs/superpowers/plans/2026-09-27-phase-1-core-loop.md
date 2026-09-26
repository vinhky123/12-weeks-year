# Phase 1 — Core Loop MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The full 12-week core loop, usable end-to-end against the local API: create/start a cycle, add up to 3 goals with verb-first tactics, generate weekly plans, check off daily tactic actions, close weeks with the honest execution score, and see it all on a dashboard. Closes with FE specs handed to Antigravity (UI built by them; Playwright e2e runs at that integration checkpoint).

**Architecture:** Thin App Router route handlers (`src/app/api/**`) → services (`src/server/services/**`, orchestration + book rules) → repositories (`src/server/db/repositories/**`, Drizzle queries) → SQLite. Pure rules live in `src/server/planRules.ts` (joins `cycleMath` + `scoring`); services are tested against temp-file SQLite; one route-level test walks the full happy path. Completions are the single scoring source of truth; week-plan items carry day placement and mirror done-counts transactionally.

**Tech Stack:** as Phase 0 (Next 15, Drizzle/better-sqlite3, zod, Vitest).

## Global Constraints

- All Phase 0 constraints apply (strict TS, pure server modules, UTC ISO dates, conventional commits, Git Bash-compatible commands).
- Route handlers stay thin: parse (zod) → service → `json()`; no business logic in `src/app/api/**`.
- Every request body validated with a schema exported from `src/lib/contracts.ts`; every response type defined there too (Antigravity consumes exactly these).
- Book invariants enforced in services (PROJECT-PLAN Appendix B): max 3 active goals/cycle, goal `why` + measurable lag required, completions capped at due, closed weeks immutable, week 13 never scored, one active cycle.
- Completions only for weeks 1–12 of an **active** cycle, ≤ current cycle week, whose week plan is not closed (no plan yet ⇒ allowed).

---

## Task 1: `planRules.ts` pure module (TDD)

**Files:** Create `src/server/planRules.ts`, `src/server/planRules.test.ts`

**Interfaces — Produces:**
- `tacticsDueInWeek(tactics: TacticLike[], week): { tactic: TacticLike; dueCount: number }[]`
- `generateWeekPlanItems(tactics, week): { label: string; tacticId: TacticLike["id"] | null; dayOfWeek: 0; plannedCount: number; sortOrder: number }[]` (default Monday placement; sortOrder = tactic order received)
- `validateNewGoal(cycleGoalsActiveCount, input: { title; why; lagMetricName; lagUnit; lagStart; lagTarget; deadlineWeek? }): ValidationError[]` — non-empty title/why/metric, finite numbers, lagTarget ≠ lagStart, deadlineWeek 1–12, count < 3
- `validateNewTactic(input: { text; duePattern }): ValidationError[]` — non-empty ≤ 200 chars text, zod-valid pattern (reuse `DUE_PATTERN_SCHEMA` shape locally — pure module, no imports from lib)
- `nextRitual(state): 'create_cycle' | 'start_cycle' | 'plan_week' | 'close_last_week' | 'execute_today' | 'review_mode' | 'await_week_end'`

**Key tests:** due extraction (every-week vs specific-week vs inactive window); item generation label/plannedCount/order; goal validation rejects empty why, 4th goal, non-measurable (equal start/target), bad deadline; tactic validation rejects empty/long text, bad patterns; nextRitual ordering table.

## Task 2: DB additions

**Files:** Modify `src/server/db/schema.ts`, `src/server/db/index.ts`; new migration `drizzle/0001_*.sql`

- `lagLogs` table: `id, goalId (fk, unique with weekNumber), weekNumber int 1–12, value real, loggedAt text` (F5 close-week lag logging; charts arrive Phase 2).
- `getDb()` caches per resolved path (`Map<string, handles>`) so API tests can point `TWY_DB_PATH` at a temp file per test file.
- `createDb()` bootstraps the singleton `settings` row (`onConflictDoNothing`).
- Run `npm run db:generate` → migration 0001; `npm run db:migrate` to apply.

## Task 3: Repositories

**Files:** Create `src/server/db/repositories/{cycles,plan,execution,settings}.ts`

Thin Drizzle query functions, one aggregate each (no business rules): cycles (list/get/create/updateStatus/findActive), plan (goals/tactics CRUD, `listGoalsWithTactics(cycleId)`), execution (completions add/removeLatest/listByCycle, week plans get-or-create/list items/insert items/update item/close, lag log upsert/list), settings (get/updateCurrentCycle).

## Task 4: Services (TDD against temp SQLite)

**Files:** Create `src/server/services/{cycleService,planService,weekPlanService,scoringService}.test-aware.ts` (plain modules taking `(db, today?)`), tests colocated `*.test.ts`

**Interfaces — Produces (consumed by routes):**
- `cycleService`: `listCycles`, `createCycle({name, startDate?})` (default nextMonday), `startCycle(id)` (409-style `RuleError` if another active), `archiveCycle(id)`, `getActiveCycle(today)` → `{ cycle, weekNumber, weekLabel, daysRemaining, phase: 'pre'|'execution'|'review'|'post' }`, `getCycleDetail(id)` (goals+tactics)
- `planService`: `addGoal`, `updateGoal`, `deleteGoal` (status 'dropped', tactics deactivated), `addTactic` (JSON duePattern validated), `updateTactic`, `deactivateTactic(id, fromWeek)` — all enforcing planRules validations + max-3
- `weekPlanService`: `generateWeekPlan(cycleId, week, today)` (idempotent for draft; `RuleError` if closed — regenerating closed weeks is forbidden), `getWeekPlan(cycleId, week)` (items + completion counts + live score), `moveItem`, `addPlanRevisionItem` (requires `confirmPlanRevision`), `removeItem`, `closeWeek(planId, { reflection?, lagValues? })` (freezes; upserts lag logs; `RuleError` if week > current or already closed)
- `scoringService`: `logCompletion({tacticId, weekNumber, date}, today)` (validates active cycle, week ≤ current, not closed, **caps at due** with `RuleError`), `unlogCompletion({tacticId, weekNumber})`, `getCycleScores(cycleId)` → weeks 1–12 + average + per-goal current-week, `buildDashboard(today)` → phase, cycle summary, today info, current-week plan status + projected score, score history, average, goals with per-goal score, `nextRitual`
- Shared `RuleError extends Error { status: number; details? }` in `src/server/ruleError.ts`; routes map it to HTTP.

**Key tests (integration, temp db):** start-blocked-while-another-active; 4th goal rejected; goal without why rejected; tactic duePattern round-trips; generate → items match due tactics; regenerate draft idempotent, closed 409; completion capped at due; completion on closed week rejected; completion for future week rejected; closeWeek freezes (unlog rejected after); scores match hand-calculated values (the book example: 6/7 = 86% ON_TRACK); lag upsert; dashboard `nextRitual` transitions.

## Task 5: API routes + contract happy-path test

**Files (16 route handlers under `src/app/api/`):**

| Method+Path | Body → Response |
|---|---|
| `GET /api/cycles` | → `Cycle[]` |
| `POST /api/cycles` | `CycleCreate` → `Cycle` |
| `GET /api/cycles/active` | → `ActiveCycleInfo` (404-style `ApiError` if none) |
| `POST /api/cycles/:id/start` | → `Cycle` |
| `POST /api/cycles/:id/archive` | → `Cycle` |
| `GET /api/cycles/:id` | → `CycleDetail` (goals+tactics) |
| `POST /api/cycles/:id/goals` | `GoalCreate` → `Goal` |
| `PATCH /api/goals/:id` | `GoalUpdate` → `Goal` |
| `DELETE /api/goals/:id` | → drop (soft) |
| `POST /api/goals/:id/tactics` | `TacticCreate` → `Tactic` |
| `PATCH /api/tactics/:id` | `TacticUpdate` → `Tactic` |
| `DELETE /api/tactics/:id` | `?fromWeek=` → deactivate |
| `GET /api/cycles/:id/weeks/:week` | → `WeekPlanDetail` |
| `POST /api/cycles/:id/weeks/:week/generate` | → `WeekPlanDetail` |
| `POST /api/week-plans/:id/close` | `CloseWeekBody` → `WeekPlanDetail` |
| `PATCH /api/week-plans/:id/items/:itemId` | `ItemPatch` (move/label) → `WeekPlanDetail` |
| `POST /api/week-plans/:id/items` | `AddItemBody` (plan-revision guard) → `WeekPlanDetail` |
| `DELETE /api/week-plans/:id/items/:itemId` | → `WeekPlanDetail` |
| `POST /api/completions` | `CompletionBody` → `TodayResult` (updated counts + projected score) |
| `DELETE /api/completions` | `CompletionBody` (identifies latest) → `TodayResult` |
| `GET /api/today` | → `TodayView` (day-grouped items with done/planned per item) |
| `GET /api/dashboard` | → `DashboardDto` |
| `POST /api/lag-logs` | `LagLogBody` → `LagLog` |

Helpers: `src/server/apiHelpers.ts` — `json(data, init?)`, `handle(fn)` wrapping RuleError → status + `ApiError` shape, zod failures → 400 with details.

**Route contract test** (`tests/api/coreLoop.test.ts`, temp db via `TWY_DB_PATH`, imports route handlers, calls with `Request` objects): the Phase 1 exit path — create cycle → start → 2 goals + 5 tactics → generate week 1 → log 4 of 5 due completions → close week 1 → score 80 AT_RISK → generate week 2 → dashboard shows history + next ritual. Plus one negative per invariant (4th goal 422/409, completion cap, closed-week immutability).

## Task 6: `contracts.ts` full schemas

Append zod schemas + inferred types for every entity (Cycle, Goal, Tactic, WeekPlan, WeekPlanItem, Completion counts, WeekScoreDto, LagLog), every request body above, `DashboardDto`, `TodayView`, `ActiveCycleInfo`, `RuleErrorDto` (= ApiError). Keep the file the single UI-facing import.

## Task 7: Seed script

`scripts/seed.ts` + `npm run db:seed`: resets `data/app.db`, inserts the book's worked example (book doc §4.4) with live dates — cycle starts **last Monday** (so today lands in week 2), goal 1 weight 180→170 lbs, goal 2 freelance $0→$1,000; week 1 plan closed at 6/7 (86% ON_TRACK) with lag logs; week 2 draft partially complete. Verify by hitting `/api/dashboard` shape via service call in a script assertion.

## Task 8: FE specs for Antigravity

`docs/fe-specs/phase-1/{dashboard,today,plan,week,close-week}.md` — each per `_TEMPLATE.md`, with exact data contracts from Task 6, states (no-cycle, planning, execution, review-week, closed-week), interactions, verbatim copy (honest score bands: ≥85 "Executing at a high level" / 65–84 "Goals at risk — execution problem" / <65 "Revise the plan — this is diagnosis, not judgment"), acceptance tied to PROJECT-PLAN F1–F6.

## Task 9: Refinement, verification, close-out

`npm test` (all suites), `npx tsc --noEmit`, `npm run build`, dev smoke of key API endpoints (curl), dead-code/TODO scan, README roadmap tick for Phase 1 backend, merge `phase-1-core-loop` → `main`, **delivery report: "Phase 1 delivered → call Antigravity for `docs/fe-specs/phase-1/`"**. Playwright e2e deferred to the integration checkpoint (after UI lands), per plan.
