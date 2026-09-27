# Phase 3 — Accountability, Review & History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (or subagent-driven-development). Steps use checkbox syntax. Phase 2 checkpoint passed (87 unit/contract tests + 7/7 e2e) before this plan.

**Goal:** Close the system's loop: weekly WAM self-accountability reports with one-click Markdown export, the week-13 review wizard's backend (celebrate-first → 4-part review → next-cycle carry-forward), valley-of-despair guardrails surfaced on the dashboard, and cycle history with cross-cycle insights.

**Architecture:** Same layering. One new pure module (`reviewRules`) holds grades, the QoL/discipline catalogs, valley logic, and celebration derivation. Services: `wamService` (report upsert + markdown export), `reviewService` (celebration, review upsert, next-cycle creation), `historyService` (archive list, cycle detail, insights). `buildDashboard` gains `valleyGuidance`. Commitment (F12) is a small cycle-scoped key/value service folded into `cycleService`.

**Tech Stack:** unchanged.

## Global Constraints

- All prior constraints apply.
- **Week 13 is never scored** — celebration/review read scores for weeks 1–12 only.
- **Celebrate before analysis** — the celebration endpoint is independent of the review; the review never overwrites scores.
- Review ratings are 1–10 integers; QoL anchors are free text (user-defined 1 and 10 meaning per area).
- `startNextCycle` requires the source cycle to be `archived`; the new cycle starts in `planning`; carried goals copy title/why/lag only (tactics are re-derived — the book reloads the plan, not the baggage).
- WAM free text ≤ 2000 chars; markdown export is a pure string builder (unit-tested, no I/O).

---

## Task 1: DB migration 0003

Schema additions; `npm run db:generate` → `drizzle/0003_*.sql`; migrate.

- `wam_reports`: `id`, `cycle_id` fk, `week_number` 1–12, `auto_json` (snapshot: score/goals at save time), `blockers` text nullable, `what_worked` text nullable, `encouragement` text nullable, `created_at`, `updated_at`; unique `(cycle_id, week_number)`.
- `cycle_reviews`: `id`, `cycle_id` fk **unique**, `results_json` (per-goal `{goalId, title, percentComplete, avgScore, grade, note}`), `qol_json` (6 areas × `{area, rating, anchor1, anchor10}`), `disciplines_json` (5 items × `{name, rating}`), `breakthroughs` text nullable, `next_cycle_notes` text nullable, `created_at`, `updated_at`.
- `commitments`: `id`, `cycle_id` fk unique, `costs` text (what it will cost in comfort/pleasure), `statement` text ("I choose to…"), `created_at`.

## Task 2: Pure `reviewRules.ts` (TDD)

**Files:** `src/server/reviewRules.ts` + test.

- `QOL_AREAS` (exact 6): `["Spiritual", "Spouse/Key Relationship", "Family", "Business", "Personal", "Physical"]`
- `DISCIPLINES` (exact 5): `["Vision", "12-Week Planning", "Weekly Routine (Score · Plan · WAM)", "Performance Time (Blocks)", "Key Measures"]`
- `goalGrade(percentComplete: number | null, avgScore: number | null): number` — 1–10; `round(10 * (0.5·completion + 0.5·avgScore/100))` clamped; null-safe (missing side defaults to the other; both null → 1).
- `valleyGuidance(currentWeek: number, averageScore: number | null): { headline, body } | null` — weeks 3–6 AND avg < 70 → the verbatim valley copy (see spec); else null.
- `buildCelebration(weeks: (WeekScore|null)[], goals: {status}[]): { bestWeek, scoredWeeks, averageScore, goalsCompleted, goalsTotal }` — pure derivation from scoring types.

## Task 3: Services (TDD, temp SQLite)

**Files:** `src/server/services/{wamService,reviewService,historyService}.ts` + tests in `services.phase3.test.ts`; modify `scoringService.buildDashboard` to add `valleyGuidance`; add commitment functions to `cycleService`.

- `wamService`: `getWam(cycleId, week)` → `{ report | null, auto: {cycleName, weekNumber, weekScore, goals: [{title, lag latest, lead thisWeek}], nextWeekCommitments: [tactic texts due next week]} }` (auto composed live from scoring/measures/planRules); `saveWam(cycleId, week, {blockers?, whatWorked?, encouragement?})` (upsert + snapshot auto_json at save); `exportWamMarkdown(cycleId, week)` → string with sections: header (cycle/week/score), results, commitments, blockers, what worked, encouragement.
- `reviewService`: `getCelebration(cycleId)` (uses `buildCelebration` over `scoringService.getCycleScores`; goal statuses from planRepo); `getReview(cycleId)`; `saveReview(cycleId, patch)` (upsert; validates qol ratings 1–10 per the 6 areas, disciplines 1–10 per 5 items; results items get auto `grade` via `goalGrade` when not provided); `startNextCycle(sourceCycleId, {name?, startDate?, carryoverGoalIds?})` — requires archived source; creates planning cycle (name default "Next 12 Weeks"); copies selected goals via `planService.addGoal` (respects max-3); returns new cycle.
- `historyService`: `listCycles()` → per cycle: status, startDate, archivedAt, averageScore, scoredWeeks, goalsCompleted/total, hasReview; `getCycleDetail(cycleId)` → cycle + goals(with tactics) + scores + review + wam list (read-only shape); `getInsights()` → cycles compared: avgScore per cycle, best cycle, total goals achieved, QoL movement (avg of 6 areas: first vs latest reviewed cycle).
- `cycleService`: `getCommitment(cycleId)`, `setCommitment(cycleId, {costs, statement})` (both required non-empty; upsert).
- `buildDashboard` addition: `valleyGuidance: valleyGuidance(weekNumber, averageScore)` (null unless in-valley).

## Task 4: Contracts + API routes + contract test

`src/lib/contracts.ts` additions: `WAM_REPORT_DTO`, `WAM_AUTO_DTO`, `WAM_SAVE_SCHEMA`, `CYCLE_REVIEW_DTO`, `REVIEW_SAVE_SCHEMA` (incl. `QOL_ENTRY_SCHEMA`, `DISCIPLINE_ENTRY_SCHEMA`), `CELEBRATION_DTO`, `COMMITMENT_DTO`/`COMMITMENT_SCHEMA`, `NEXT_CYCLE_CREATE_SCHEMA`, `HISTORY_LIST_DTO`, `CYCLE_HISTORY_DTO`, `INSIGHTS_DTO`; `DASHBOARD_DTO` gains `valleyGuidance`.

Routes:

| Method+Path | Body → Response |
|---|---|
| `GET /api/cycles/:id/wam/:week` | → `WamReportDto` (report + live auto data) |
| `PUT /api/cycles/:id/wam/:week` | `WamSave` → `WamReportDto` |
| `GET /api/cycles/:id/wam/:week/export` | → `text/markdown` |
| `GET /api/cycles/:id/review/celebration` | → `CelebrationDto` |
| `GET /api/cycles/:id/review` | → `{ review: CycleReviewDto \| null }` |
| `PUT /api/cycles/:id/review` | `ReviewSave` → `CycleReviewDto` |
| `POST /api/cycles/:id/next` | `NextCycleCreate` → `CycleDto` |
| `GET /api/cycles/:id/commitment` | → `{ commitment: CommitmentDto \| null }` |
| `PUT /api/cycles/:id/commitment` | `Commitment` → `CommitmentDto` |
| `GET /api/history` | → `HistoryListDto` |
| `GET /api/history/:id` | → `CycleHistoryDto` |
| `GET /api/insights` | → `InsightsDto` |

Contract test `tests/api/phase3.test.ts`: WAM save→get round-trip (auto snapshot frozen), export contains headers/score, review save with validation errors (rating 0/11 rejected, grade auto-filled), start-next-cycle guard (non-archived 409; archived → new planning cycle with carried goals, max-3 enforced), commitment upsert, history/insights shapes after archiving.

## Task 5: Seed extension

`scripts/seed.ts`: after the active cycle, create "Q3 2026 — Completed Example": 6 weeks with descending-then-rising scores (realistic valley at weeks 3–4), 2 goals (one achieved, one missed), WAM report for week 4 (the valley week), full cycle review (QoL with anchors, breakthroughs), then archive. Verify `/api/history`, `/api/insights` shapes; active cycle untouched.

## Task 6: FE specs (Antigravity handoff)

`docs/fe-specs/phase-3/`: `wam.md` (weekly report + export), `review.md` (week-13 wizard: celebration → results → QoL → disciplines → breakthroughs → next cycle), `history.md` (archives, cycle detail, insights), `guardrails.md` (amendments: dashboard valley banner + commitment step in the plan/start flow). Exact data contracts, states, verbatim copy, acceptance per F10–F13 + F12.

## Task 7: Verification & close-out

`npm test`; `npx tsc --noEmit`; `npm run build`; dev smoke of new endpoints; README roadmap tick; merge → main; **delivery report: "Phase 3 delivered → call Antigravity for `docs/fe-specs/phase-3/`"**.

## Self-Review

- Spec coverage: F10 → Tasks 1,3,4,6 (WAM + export); F11 → Tasks 1,2,3,4,6 (celebration, 4-part review, next-cycle carry); F12 → Tasks 2,3,4,6 (valley on dashboard, commitment builder); F13 → Tasks 3,4,6 (history + insights).
- Placeholders: none — catalogs and formulas are specified verbatim; routes fully tabulated.
- Type consistency: reuses `WeekScore`, `DashboardDto` extension additive; DTO names match contracts; `RuleError` statuses consistent with Phase 1/2 conventions.
