# Reliability Batch 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve review answers, choose the correct local day, and prevent partially saved weekly closes.

**Architecture:** Keep the existing services and SQLite schema. Repair partial-update handling, isolate local clock formatting from UTC calendar arithmetic, and make weekly closing transactional.

**Tech Stack:** TypeScript, Drizzle, better-sqlite3, Vitest, Next.js 15.

**Spec:** `docs/superpowers/specs/2026-10-03-reliability-batch-1-design.md`

## Global Constraints

- No new dependency, database migration, backup-format change, or public response-shape change.
- Use temporary test databases; never open or seed the owner's database.
- Preserve the existing rule permitting closure of the current week; timing-policy changes belong to a later task.
- Do not change occurrence scheduling, score semantics, archived-history policy, or UI styling in this batch.
- GPT-5.6 Sol implements production code and regression tests. The coordinator owns the task queue, review, and integration checks.
- Workers do not spawn agents. Stage and commit only their assigned files.

## Review Focus

- A later review step must preserve earlier custom notes, grades, and anchors (Task 1).
- Deliberate empty sections must remain empty on subsequent unrelated saves (Task 1).
- Local midnight, year changes, and DST must affect date selection without changing date-only arithmetic (Task 2).
- A bad second measurement must preserve the open plan and pre-existing first measurement (Task 3).
- A database failure during close must roll back reflection, status, and all measurements (Task 3).

## Execution

Work directory: `D:/Data/Codes/12-weeks-planning-reliability-repairs`, branch `codex/reliability-repairs`.

Runtime: `C:/Users/Kyyy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`.

Use `git -c safe.directory=D:/Data/Codes/12-weeks-planning-reliability-repairs` for every Git command. Focused test command: invoke the runtime with `node_modules/vitest/vitest.mjs run <test file>`. Full suite: same without the test path. No install is required.

One implementer at a time keeps commit ranges and verification unambiguous. Context is fresh (`fork_turns: none`), model `gpt-5.6-sol`, reasoning `medium`. Reports are files, not long chat messages. The coordinator reviews each task, and one independent reviewer checks the completed batch.

### Task 1: Preserve partially saved cycle reviews

**Files:** Modify `src/server/services/reviewService.ts`; create `src/server/services/reviewService.persistence.test.ts`.

**Interfaces:** Keep `saveReview(h: DbHandles, cycleId: number, patch: ReviewInput, today?: string)` and `getReview(h, cycleId)` response shapes unchanged. Consume the existing JSON sections in `cycleReviews`.

- [ ] Write regression tests using a temporary file database. Save custom results, then Physical QoL with anchors, then Vision discipline, then breakthroughs/next-cycle notes; read back and assert all sections and custom values survive. Assert `createdAt` remains stable and `updatedAt` follows the latest save.
- [ ] Test explicit empty arrays clear only their section, remain empty after an unrelated save, and omitted sections on a first save use automatic results / empty QoL and disciplines. Test invalid ratings change no persisted section.
- [ ] Run the focused test and record the expected lost-data failures before production changes.
- [ ] Read the existing review before assembling values. Preserve the exact existing JSON for omitted array sections; compute/enrich result suggestions only for first-save defaults or explicitly submitted results. Explicit arrays replace their section, including `[]`. Keep text-section behavior and response shapes.
- [ ] Run focused tests and full suite; self-review and commit only assigned files with `fix: preserve partial cycle review saves`.
- [ ] Write the full report to the assigned report path: red/green command evidence, suite count, changed files, commit, concerns. Reply with status and a one-line summary.

### Task 2: Use the local calendar day for today

**Files:** Modify `src/server/cycleMath.ts` and `src/server/cycleMath.test.ts` only.

**Interfaces:** `todayIso(now: Date = new Date(), timeZone?: string): string`. Existing callers remain valid. `toIsoDate`, `toUtcMs`, `addDays`, and cycle/week arithmetic keep their behavior.

- [ ] Replace the UTC-only clock test with local-default behavior. Add explicit-zone cases: Asia/Ho_Chi_Minh at `2026-10-04T17:30:00Z` -> `2026-10-05`; at `2026-10-04T16:59:00Z` -> `2026-10-04`; at `2026-12-31T17:30:00Z` -> `2027-01-01`; UTC at `2026-10-04T17:30:00Z` -> `2026-10-04`.
- [ ] Add America/New_York cases around spring DST: `2026-03-08T04:30:00Z` -> `2026-03-07` and `2026-03-08T07:30:00Z` -> `2026-03-08`. Verify cycleWeekNumber(todayIso(Saigon instant, zone), `2026-10-05`) is week 1 and existing date-only arithmetic still passes.
- [ ] Run the focused test and record the expected UTC-date failures before production changes.
- [ ] Format the injected instant through `Intl.DateTimeFormat` date parts, using the host zone when omitted; concatenate padded YYYY-MM-DD. Update comments to distinguish local clock formatting from UTC date-only arithmetic. Do not hardcode Saigon for all users.
- [ ] Run focused tests and full suite; self-review and commit only assigned files with `fix: use local calendar dates for today`.
- [ ] Write the full report to the assigned report path and return the short status contract.

### Task 3: Make weekly close all-or-nothing

**Files:** Modify `src/server/services/weekPlanService.ts`; create `src/server/services/weekPlanService.close.test.ts`.

**Interfaces:** Keep `closeWeek(h: DbHandles, planId: number, input: { reflection?: string; lagValues?: { goalId: number; value: number }[] }, today?: string)` and its return shape unchanged. Use existing `getGoal`, `upsertLagLog`, and `h.sqlite.transaction`.

- [ ] Use a temporary database in its own temporary directory. Test an existing lag value, a valid first entry followed by a non-finite second entry, and assert rejection leaves plan draft, reflection unchanged, and lag rows unchanged.
- [ ] Test a goal from another cycle and a nonexistent goal both reject without saved changes. Test rollback under a real SQLite trigger that aborts insertion of the second valid measurement. Assert the first write and close both roll back.
- [ ] Test successful close persists reflection and all lag rows and retains current-week closure behavior. Keep test backup output inside the temporary directory and remove it during teardown; do not mock transactional repositories.
- [ ] Run the focused test and record expected partial-write / ownership failures before production changes.
- [ ] Validate all values and goal ownership before writes. Execute `closeWeekPlan` and every `upsertLagLog` inside one synchronous SQLite transaction. Call `writeAutoBackup` after the transaction returns successfully. Preserve existing future-week and duplicate-close guards.
- [ ] Run focused tests and full suite; self-review and commit only assigned files with `fix: close weekly plans atomically`.
- [ ] Write the full report to the assigned report path and return the short status contract.

## Coordinator completion

- [ ] Review task diffs and red/green evidence; delegate any fixes to the original coding agent.
- [ ] Independent review of the combined code diff against the spec.
- [ ] Run full suite, TypeScript no-emit check, and production build with an isolated temporary database.
- [ ] Update the coding queue and report exactly which fixes landed and what remains.
