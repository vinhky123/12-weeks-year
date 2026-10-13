# Schedulable Tactic Occurrences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Represent every due repetition as its own schedulable item in open plans while preserving weekly scores and closed history.

**Architecture:** Expand `week_plan_items` into one row per tactic occurrence and add a nullable occurrence link to completions. A deterministic, transactional normalizer converts only draft plans (also after legacy backup imports); completion APIs retain the tactic/week fallback. Plan edits reconcile draft occurrences without changing completed work or owner placements.

**Tech Stack:** TypeScript, Next.js, Drizzle ORM, SQLite, Zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-13-tactic-occurrences-design.md`

## Global Constraints

- Normalize `week_plans.status = 'draft'` only; closed plans and saved scores remain untouched.
- Generated tactic occurrence rows have `plannedCount = 1`; weekly score stays aggregated by tactic and cycle week.
- Keep backup format version `1`; missing `week_plan_item_id` imports as `null`.
- Preserve existing `week_plan_items` row IDs as the first occurrence during normalization; preserve weekday, relative order, completed count and custom labels.
- Keep legacy completion calls with `tacticId + weekNumber` working; use next incomplete occurrence for POST and most recent completed for DELETE.
- Incomplete excess rows are removed from the end; completed occurrences and retained custom placements cannot be erased.

## Review Focus

- Draft plan has no source row, or a due pattern becomes zero in a draft week: normalization/reconciliation must add or remove only eligible occurrences (Task 1/2 tests).
- Legacy `done` is greater than `plannedCount`, malformed counts, or a second normalization run: migration must fail atomically or be idempotent without partial rows (Task 1 tests).
- A linked item belongs to another tactic, week or closed plan: occurrence-specific completion must reject it without changing score or rows (Task 3 tests).
- An owner lowered frequency below completed count or renamed an individual occurrence: reject only the destructive frequency change and preserve custom label (Task 2 tests).
- Old v1 backup omits the new link and contains bundled draft counts while closed legacy rows exist: import normalizes drafts, defaults the link to null, and leaves closed rows unchanged (Task 5 tests).

---

### Task 1: Schema, migration and draft-plan normalizer

**Files:**
- Modify: `src/server/db/schema.ts`
- Create: `drizzle/0005_tactic_occurrences.sql` and matching Drizzle snapshot/journal entry
- Create: `src/server/services/occurrenceMigration.ts`
- Create: `src/server/services/occurrenceMigration.test.ts`
- Modify: `src/server/db/repositories/execution.ts`

**Interfaces:**
- Produces `normalizeDraftPlanOccurrences(h: DbHandles): { plansChanged: number; itemsAdded: number }`; it is transaction-safe and idempotent.
- Adds nullable `weekPlanItemId` to `completions`, referencing `week_plan_items.id` with `ON DELETE RESTRICT` (legacy rows remain null).

- [x] Add tests for splitting a due-3 row into three rows preserving the old row ID, weekday, order and `done` total; leave null-tactic and closed-plan items unchanged.
- [x] Run `npx vitest run src/server/services/occurrenceMigration.test.ts`; confirmed RED because the normalizer module did not yet exist.
- [x] Add the nullable schema column and SQLite migration; update Drizzle metadata with `npm run db:generate`.
- [x] Implement the normalizer for draft plans only. Reject invalid legacy counts (`plannedCount < 1`, `done < 0`, or `done > plannedCount`) before writing; run each plan's changes transactionally and preserve custom labels.
- [x] Run the focused migration tests and `git diff --check`; 3/3 migration tests passed, including idempotence, and no whitespace errors were reported.

### Task 2: Generate and reconcile occurrences in editable plans

**Files:**
- Modify: `src/server/planRules.ts`, `src/server/planRules.test.ts`
- Modify: `src/server/services/weekPlanService.ts`
- Modify: `src/server/services/planService.ts`
- Create: `src/server/services/occurrenceReconciliation.test.ts`

**Interfaces:**
- `generateWeekPlanItems(...)` returns one descriptor per due repetition, with unique ascending `sortOrder` and `plannedCount: 1`.
- Reconciliation is applied after tactic add/edit/deactivation to affected draft weeks and never to closed weeks.

- [x] Add pure rule tests for due-count expansion, specific-week patterns, and stable Monday/default ordering.
- [x] Run the focused plan rules test and confirmed the multiplicity assertion failed against the old bundled generator.
- [x] Expand generation to emit one item per due count; tests assert generated plan rows and all have `plannedCount: 1`.
- [x] Add service tests for add/edit/deactivate reconciliation: add missing rows; remove only surplus incomplete rows from the end; reject a reduced due count below completed count; update only labels that still match the old tactic text; preserve placements/custom labels.
- [x] Implement transactional reconciliation for every affected draft plan when tactics are added, renamed, frequency-edited or deactivated; retain the existing closed-week guard.
- [x] Run planRules, planService integrity and occurrence reconciliation tests; 25/25 passed. Closed-week guard tests pass; reconciliation filters draft plans and leaves manual rows intact.

### Task 3: Occurrence-aware completion and undo

**Files:**
- Modify: `src/lib/contracts.ts`
- Modify: `src/server/db/repositories/execution.ts`
- Modify: `src/server/services/scoringService.ts`
- Modify: `src/server/services/scoringService.occurrences.test.ts` (create)
- Modify: `src/app/api/completions/route.ts` only if service contract requires route adaptation

**Interfaces:**
- Completion DTO accepts `{ tacticId, weekNumber, date?, weekPlanItemId? }`.
- `logCompletion` / `unlogCompletion` resolve explicit IDs or legacy fallback and return the existing aggregate response shape.
- New completion rows save `weekPlanItemId`; score aggregation continues by tactic/week.

- [x] Add tests for explicit completion and undo changing one occurrence only, legacy POST selecting next incomplete, legacy DELETE selecting most recent completed, and score preservation.
- [x] Add rejection tests for mismatched tactic/week, missing item, completed/empty target, and closed plan; tests assert no writes on rejection.
- [x] Run the focused scoring tests and confirmed 3 occurrence behaviors failed against the tactic/week-only implementation.
- [x] Implement Zod validation, repository lookups and transactional occurrence-aware updates. For linked records, update/delete only the selected completion and set the matching item's `done`; retain legacy aggregate fallback for null-linked historical records.
- [x] Run scoring occurrence tests plus existing scoring service/finalization and phase 2 service tests; 51/51 passed and aggregate score responses stayed compatible.

### Task 4: Today and Week UI operate on individual occurrences

**Files:**
- Modify: `src/app/today/page.tsx`
- Modify: `src/app/week/page.tsx` and/or `src/components/week/WeekBoard.tsx`, `PlanItemCard.tsx`, `DayColumn.tsx` as established by current ownership
- Modify: `src/lib/contracts.ts` if DTO typing needs the optional link
- Add/update UI tests only where the repository already has a component test pattern

**Interfaces:**
- Today and Week completion requests include the selected `weekPlanItemId`.
- Optimistic updates and canonical responses update only the matching row ID; move and rename continue to use the existing item API.

- [x] Update Today POST/DELETE payloads to include `weekPlanItemId`; update state by item ID rather than by tactic ID.
- [x] Update Week completion controls to send the selected row ID and keep all other same-tactic occurrences unchanged.
- [x] Add an editable completion date on past-week and week-13 catch-up tactic occurrences; send the selected date with completion and undo requests.
- [x] Review Today and Week completion/undo paths; draft-normalized rows use individual controls and completion by row ID.
- [x] Run UI helper tests and verify selected dates are included in occurrence requests; state updates by row ID.

### Task 5: Backup import compatibility and end-to-end verification

**Files:**
- Modify: `src/server/services/backupService.ts`
- Modify: `src/server/services/backupService.test.ts` and/or `backupService.occurrences.test.ts`
- Modify: `src/server/services/backupService.reviewStatus.test.ts` only if shared legacy fixture needs extension

**Interfaces:**
- v1 import supplies null for an omitted `week_plan_item_id`, then normalizes draft plans inside the import transaction.
- Export includes the new nullable column without changing format version.

- [x] Add import tests for a v1 backup omitting the new field with bundled draft counts, an idempotent current-format export/import round trip, and closed legacy plans untouched.
- [x] Run focused backup tests and confirmed the legacy normalization and malformed-count rollback cases failed before implementation.
- [x] Default missing completion links to null and invoke the draft normalizer inside the same transaction as import; import failures roll back all data.
- [x] Run the full test suite, `npx tsc --noEmit`, `npm run build`, and `git diff --check`; recorded results below.
- [x] Inspect implementation and tests against the acceptance criteria; fresh whole-change review is in progress.
- [x] Address review finding: restore legacy completion counts when generating/reconciling draft occurrences and reject due reductions below those completions, including weeks without a plan.
- [x] Address review finding: keep text-only renames on label reconciliation so legacy completed bundles do not block a rename.
- [x] Address review finding: let users choose a valid date for past-week and week-13 catch-up completion/undo.
- [x] Run focused regression tests, complete suite, type check, production build and diff whitespace check after review fixes.

## Execution Log

- [x] Task 1 complete
- [x] Task 2 complete
- [x] Task 3 complete
- [x] Task 4 complete
- [x] Task 5 complete

Review follow-up: independent whole-change review found three important edge cases in legacy completion reconciliation, historical/catch-up completion dates and text-only tactic renames. Added regression coverage and fixed all three; final verification is recorded in the SDD ledger.
