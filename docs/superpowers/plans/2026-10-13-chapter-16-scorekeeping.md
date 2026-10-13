# Chapter 16 Process and Outcome Scorekeeping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show execution and lag outcomes as separate measures and replace premature diagnosis with a transparent interpretation based on closed-week evidence.

**Architecture:** Keep the rule pure in `measuresRules.ts`; have the measures service select closed score and lag observations and return the evidence with the diagnosis; render a localized status and its supporting values on each goal's Measures card. Do not add database fields or combine process and outcome into one score.

**Tech Stack:** TypeScript, Next.js, Zod contracts, Drizzle ORM, existing Vitest test suite, existing English/Vietnamese dictionary.

**Spec:** `docs/superpowers/specs/2026-10-13-method-reference-and-feature-roadmap-design.md` (Product design, item 2)

## Global Constraints

- Keep process/execution, outcome/lag, and optional lead measures distinct.
- Only closed weeks count as diagnosis evidence.
- The proposed thresholds are app heuristics, not book rules or outcome guarantees.
- Show dates or cycle week numbers and values behind every concern status.
- Preserve current local-first storage and avoid a blended score.

## Review Focus

- A week has a score but remains open: it must not affect diagnosis.
- Lag is logged for a week that is still open: it must not count as closed outcome evidence.
- Fewer than two closed scores or lag observations: return an insufficient-data status, not a problem label.
- A goal already at or past its target: do not label a flat, clamped progress series as a strategy concern.
- Downward goals (for example, reducing weight): compare normalized progress toward target, not raw values.
- Threshold boundaries at 65% and 85%: apply `<65` for execution concern and `>=85` for strategy concern.

---

### Task 1: Define evidence-based diagnosis rules

**Files:**
- Modify: `src/server/measuresRules.ts`
- Modify: `src/server/measuresRules.test.ts`

**Interfaces:**
- Produce `DiagnosisStatus = "INSUFFICIENT_DATA" | "EXECUTION_CONCERN" | "STRATEGY_CONCERN" | "REVIEW"`.
- Produce `diagnosisFor(execution: { week: number; scorePct: number }[], lag: { week: number; value: number }[], start: number, target: number): DiagnosisResult`.
- `DiagnosisResult` contains `status`, the two selected execution observations, and the two selected lag observations (empty arrays when insufficient).

- [x] **Step 1: Write rule tests** for insufficient observations, execution mean below 65%, exact 65% boundary, exact 85% boundary, lag progress flat/declining, lag progress increasing, descending targets, and a goal that already met its target.
- [x] **Step 2: Run the focused rule tests** with `npm test -- --run src/server/measuresRules.test.ts` and confirm the new cases fail against the old function. The run produced 8 expected failures because the old function returned a nullable enum rather than evidence-bearing results.
- [x] **Step 3: Implement the pure rule** using the latest two observations supplied by the service; normalize lag values through `lagProgress` before comparing progress. A goal already at target remains in `REVIEW` so clamped progress does not produce a false concern.
- [x] **Step 4: Re-run the focused rule tests** and confirm all cases pass: 12 tests passed.

### Task 2: Build diagnosis from closed cycle evidence

**Files:**
- Modify: `src/server/services/measuresService.ts`
- Modify: `src/lib/contracts.ts`
- Modify: `src/server/services/services.phase2.test.ts`

**Interfaces:**
- Measures goal DTO replaces nullable diagnosis enum with `DiagnosisResult` from the contract schema.
- Keep `currentWeekScore`, `lagSeries`, and `lagProgress` available as their existing separate fields.

- [x] **Step 1: Add service tests** with two closed weeks, one open week containing a high score, lag observations on open and closed weeks, and no closed evidence. Assert only closed observations appear in diagnosis evidence.
- [x] **Step 2: Run the focused service tests** with `npm test -- --run src/server/services/services.phase2.test.ts` and confirm the new assertions fail. The new calls failed because the service still used the old scalar rule; this confirms the service integration is not implemented.
- [x] **Step 3: Update the Zod diagnosis schema** and inferred DTO type to include the status plus selected execution and lag observations.
- [x] **Step 4: Update `getMeasuresOverview`** to pair score weeks with their `closed` flag, filter lag observations to closed week numbers, and call the pure rule with the goal's start and target values.
- [x] **Step 5: Re-run the focused service tests** and confirm current/open data cannot trigger a concern: 11 tests passed.

### Task 3: Show status and evidence in both locales

**Files:**
- Modify: `src/components/measures/DiagnosisBanner.tsx`
- Modify: `src/components/measures/GoalMeasuresSection.tsx`
- Modify: `src/lib/i18n.ts`
- Modify: `src/server/measuresRules.test.ts` only if UI formatting depends on a helper added in Task 1.

**Interfaces:**
- `DiagnosisBanner` accepts the contract's `DiagnosisResult` and locale dictionary access through the established `useI18n` context.

- [x] **Step 1: Add English and Vietnamese copy** for insufficient data, execution concern, strategy concern, and review status, including neutral language that frames concerns as prompts to inspect evidence.
- [x] **Step 2: Update the component** to display status, the selected week/score pairs, and lag week/value pairs; render insufficient evidence plainly without a warning banner.
- [x] **Step 3: Review the Measures page paths** for both locales and confirm execution score, lag result, and optional lead measures remain visually distinct.
- [x] **Step 4: Run the project verification commands** listed in `package.json` for lint, type checking, and tests; confirm existing Measures DTO consumers compile. The repo has no lint script; `npm test` passed 318/318, `npx tsc --noEmit` passed, and `npm run build` passed.

## Plan Review

- Spec coverage: this plan covers the proposed Chapter 16 diagnosis feature; the other roadmap workstreams remain ordered in the design spec and require their own scoped plans before implementation.
- Thresholds are explicit and boundary cases are assigned to Task 1.
- Closed-week selection is owned by Task 2; display and localization are owned by Task 3.
- No database migration is needed because this uses existing weekly scores and lag logs.
- Execution handoff and broader workflow gaps remain outside this plan's scope.

## Execution Log

- Ruling: A goal at or past target returns `REVIEW` even when normalized progress is flat — clamped progress otherwise makes a completed goal look like a strategy failure.
- Verification: rule tests passed 12/12; Measures service tests passed 11/11; full test suite passed 318/318; TypeScript check and Next.js production build passed.
