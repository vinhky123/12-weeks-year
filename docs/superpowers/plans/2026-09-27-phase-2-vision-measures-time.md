# Phase 2 — Vision, Measures & Time Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (or subagent-driven-development). Steps use checkbox syntax. Phase 1 integration checkpoint passed (63 unit/contract tests + 4/4 Antigravity e2e) before this plan.

**Goal:** The three "depth" modules of the book's system, backend-complete and spec'd for UI: the Vision engine (three horizons, editable mid-cycle per D7, snapshot at archive), full lag/lead measurement with the book's strategy-vs-execution diagnosis, and the Model Week time-blocking template with book-quantity validation.

**Architecture:** Same layering as Phase 1: pure rules modules (`modelWeekRules`, `measuresRules`) → services (`visionService`, `modelWeekService`, `measuresService`) → repositories → routes. Two new pure modules carry the book logic; services integrate with existing cycle/archive flow. Contract additions land in `src/lib/contracts.ts` before specs are written.

**Tech Stack:** unchanged (Next 15, Drizzle/better-sqlite3, zod, Vitest).

## Global Constraints

- All Phase 0/1 constraints apply.
- **D7 (vision editable mid-cycle):** the living vision is a singleton row (`cycle_id IS NULL`); edits apply immediately; an immutable snapshot row (`cycle_id` set) is written **once** when the cycle is archived. Snapshots never update.
- Model-week validation produces **warnings (nudges), not errors** — the book nudges, it doesn't block.
- Lead measures are optional per goal; logs are upserts per (measure, week 1–12).
- Diagnosis rules: cycle avg score ≥ 85 AND lag progress < 50% → `STRATEGY_PROBLEM`; avg < 65 → `EXECUTION_PROBLEM`; else null. Pure function, no DB access.

---

## Task 1: DB migration 0002

Schema additions in `src/server/db/schema.ts`; `npm run db:generate` → `drizzle/0002_*.sql`; `npm run db:migrate`.

- `visions`: `id`, `long_term` text, `three_year` text, `cycle_connection` text, `life_domains` text (JSON array of `{area, note}`), `cycle_id` integer nullable (snapshot link), `created_at`, `updated_at`.
- `block_templates`: `id`, `cycle_id` nullable, `type` text (`STRATEGIC|BUFFER|BREAKOUT|PLANNING|WAM`), `day_of_week` 0–6, `start_minute` int (minutes from midnight), `duration_minutes` int, `label` text nullable, `created_at`.
- `lead_measures`: `id`, `goal_id` fk, `name` text, `weekly_target` int ≥1, `created_at`.
- `lead_logs`: `id`, `lead_measure_id` fk, `week_number` 1–12, `value` real, `logged_at`; unique `(lead_measure_id, week_number)`.

## Task 2: Pure rules modules (TDD)

**Files:** `src/server/modelWeekRules.ts` + test; `src/server/measuresRules.ts` + test.

- `validateModelWeek(blocks: {type, durationMinutes}[]): {field, message}[]` — warnings: no STRATEGIC ≥ 180min → "Add a 3-hour strategic block — your most important work gets first claim on the week."; no BREAKOUT ≥ 180min → "Add a 3h+ breakout block — rest is what makes 12-week intensity sustainable."; no PLANNING → nudge "Reserve a weekly planning slot (15–20 min)."; no WAM → nudge "Reserve your Weekly Accountability Meeting slot."; no BUFFER → nudge "Add daily buffer blocks (30–60 min) to contain email and admin."
- `lagProgress(start, target, current): number` — signed progress toward target, works in both directions (weight down, revenue up), clamped 0–1; null when target === start.
- `diagnosisFor(averageScore: number | null, progress: number | null): "STRATEGY_PROBLEM" | "EXECUTION_PROBLEM" | null` — the book's diagnosis table.

## Task 3: Services (TDD, temp SQLite)

**Files:** `src/server/services/{visionService,modelWeekService,measuresService}.ts` + tests in `services.phase2.test.ts`; modify `cycleService.archiveCycle` to snapshot the living vision.

- `visionService`: `getVision` (living row or null), `updateVision(patch)` (upsert living; trims strings; lifeDomains JSON-validated), `snapshotVisionForArchive(cycleId, today)` (no-op when no living vision; copies values into a `cycle_id`-stamped row; idempotent — skip if snapshot exists), `getVisionForCycle(cycleId)` (snapshot, falling back to living for pre-archive views).
- `modelWeekService`: `listBlocks()` (global + active-cycle rows), `addBlock` (validates type enum, day 0–6, startMinute 0–1439, duration 15–480), `updateBlock`, `removeBlock`, `getModelState()` → `{ blocks, warnings }` (warnings from pure rules).
- `measuresService`: `addLeadMeasure(goalId, {name, weeklyTarget})`, `updateLeadMeasure`, `removeLeadMeasure`, `logLead({leadMeasureId, weekNumber, value})` (upsert; validates week 1–12, goal's cycle active or past), `getMeasuresOverview(cycleId, today)` → per goal: lag series (week 1–12 values), `lagProgress` (latest log vs start/target), lead measures with weekly series + this week's value, per-goal + cycle diagnosis, cycle averageScore (reuses `scoringService.getCycleScores`).

## Task 4: Contracts + API routes

`src/lib/contracts.ts` additions: `VISION_DTO`/`VISION_UPDATE_SCHEMA`, `BLOCK_TYPES`/`BLOCK_TEMPLATE_DTO`/`BLOCK_CREATE_SCHEMA`/`BLOCK_UPDATE_SCHEMA`, `LEAD_MEASURE_DTO`/`LEAD_MEASURE_CREATE_SCHEMA`, `LEAD_LOG_DTO`/`LEAD_LOG_CREATE_SCHEMA`, `WARNING_DTO`, `MODEL_WEEK_DTO`, `MEASURES_OVERVIEW_DTO`, `LIFE_DOMAIN_DTO`.

Routes (thin, `handle()`-wrapped):

| Method+Path | Body → Response |
|---|---|
| `GET /api/vision` | → `{ vision: VisionDto \| null }` |
| `PUT /api/vision` | `VisionUpdate` → `VisionDto` |
| `GET /api/cycles/:id/vision` | → `{ vision: VisionDto \| null }` (snapshot ?? living) |
| `GET /api/model-week` | → `ModelWeekDto` (blocks + warnings) |
| `POST /api/model-week` | `BlockCreate` → `ModelWeekDto` |
| `PATCH /api/model-week/:id` | `BlockUpdate` → `ModelWeekDto` |
| `DELETE /api/model-week/:id` | → `ModelWeekDto` |
| `GET /api/measures` | → `MeasuresOverviewDto` (active cycle) |
| `POST /api/goals/:id/lead-measures` | `LeadMeasureCreate` → `LeadMeasureDto` |
| `PATCH /api/lead-measures/:id` | `LeadMeasureCreate.partial` → `LeadMeasureDto` |
| `DELETE /api/lead-measures/:id` | → `{ ok: true }` |
| `POST /api/lead-logs` | `LeadLogCreate` → `LeadLogDto` |

Contract test additions in `tests/api/phase2.test.ts`: vision upsert round-trip; archive creates snapshot (and second archive doesn't duplicate); model-week warnings appear for empty state and clear after adding required blocks; lead measure CRUD + log upsert; measures overview shape with diagnosis on seeded-ish data.

## Task 5: Seed extension

`scripts/seed.ts`: add the living vision (long-term/3-year/cycle-connection lines from the book example), model week (STRATEGIC Wed 09:00 180min, BUFFER Mon–Fri 11:00 45min, BREAKOUT Sat 08:00 240min, PLANNING Mon 08:30 20min, WAM Mon 17:30 30min), lead measure on goal 1 ("Workouts completed", target 3) with week-1 log = 3 and week-2 partial. Re-run `npm run db:seed`; verify via `/api/vision`, `/api/model-week`, `/api/measures` curls.

## Task 6: FE specs (Antigravity handoff)

`docs/fe-specs/phase-2/{vision,measures,model-week}.md` per `_TEMPLATE.md`, with exact data contracts, states (no vision yet / archived snapshot view / empty measures / warnings panel), interactions, verbatim copy (diagnosis lines, model-week nudges, "what if?" vision prompt), acceptance per PROJECT-PLAN F7–F9.

## Task 7: Verification & close-out

`npm test` all green; `npx tsc --noEmit`; `npm run build`; dev-server curl smoke of the new endpoints; merge `phase-2-vision-measures-time` → main; **delivery report: "Phase 2 delivered → call Antigravity for `docs/fe-specs/phase-2/`"**.

## Self-Review

- Spec coverage: F7 → Tasks 1,3,4,6 (vision + D7 snapshot); F8 → Tasks 1,2,3,4,6 (lead/lag + diagnosis + chart data); F9 → Tasks 1,2,3,4,6 (model week + warnings). Cycle-start checklist integration (F9 acceptance) lands with the onboarding flow in Phase 3's wizard work — noted in the model-week spec as out of scope.
- Placeholders: none — all code steps fully specified by the task descriptions with exact tables/routes; implementations follow Phase 1's established patterns verbatim.
- Type consistency: DTO names match contracts; `TacticLike` reuse unchanged; warnings shape `{field, message}` consistent with planRules `ValidationError`.
