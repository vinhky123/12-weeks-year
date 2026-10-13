# Final occurrence review

- [x] Independently review current uncommitted occurrence implementation against the approved spec, including previous review fixes.
- [x] Inspect completion identity, legacy reconciliation, migration/import and Week/Today controls.
- [x] Reproduce concrete findings where possible and run relevant checks.
- [x] Record findings, remaining limitations and verification results.

## Findings

Initial verdict: fixes required before treating legacy compatibility as complete. The findings below record the original review; their resolution is recorded at the end.

1. **P1 — valid old-app data can block startup/import.** `src/server/services/occurrenceMigration.ts:18` rejects `done > plannedCount`. Actual old HEAD services allow generating a due-3 bundled plan, editing frequency to 4, then recording four completions; the old bundle remains `plannedCount=3, done=4`. The current normalizer throws on this legitimate state. `createDb` invokes the normalizer unconditionally before returning handles; legacy imports invoke it inside their transaction. A compatibility repair should use completion records/current due to distinguish old-app state from malformed counts and preserve all completed work.

2. **P2 — upgrading an existing draft can hide pre-plan completions.** `src/server/services/occurrenceMigration.ts:28` distributes only the row's `done`, without reading aggregate completion records. Actual old HEAD services permit logging twice before generating a due-3 plan, whose bundled row starts with `done=0`. Normalization then yields `[0,0,0]` despite two unlinked completions. Completing one occurrence reaches the aggregate cap with rows `[1,0,0]`; the remaining visible incomplete rows cannot be completed, and explicit undo of either hidden legacy completion returns 404. Restore completion-backed done counts during startup/import normalization, including count-1 or missing-source rows; preserve links, closed rows, placements and historical dates.

3. **P2 — text-only rename skips missing-row reconciliation.** `src/server/services/planService.ts:155` calls label-only reconciliation. Verified using current public services: generate due-3 plan, remove its incomplete rows, log two legacy completions, rename tactic. The result remains two completion records with zero plan rows. Sending the unchanged due pattern restores `[1,1,0]`, but a rename alone no longer fulfills the spec's reconciliation rule. Restore missing completion-backed occurrences on rename without deleting existing completed rows or applying a destructive reduction guard to legacy over-due history.

## Evidence

- Fresh `npm test`: 41 files / 340 tests passed.
- Fresh `npx tsc --noEmit`: exit 0.
- Fresh `git diff --check`: exit 0; existing LF/CRLF warnings only.
- Independent read-only reviewer loaded actual old HEAD implementations of plan rules, plan, weekly-plan and scoring services via in-memory TypeScript transpilation to reproduce findings 1 and 2, then applied the current normalizer.
- Finding 3 reproduced in a temporary script using current public services and an in-memory database; no checkout/source mutations.
- Existing tests pass but do not cover these old-app histories. No new production build was needed because this turn changes review documentation only.

## Scope limits

- Independent reviewer focuses on the occurrence feature; the primary reviewer also inspected the Chapter 16 measures diff against its approved plan and found no additional concrete issue in that pass.
- No browser interaction or exhaustive UI verification performed in this review.

## Authorized fix wave

Owner requested agent `gpt-6-luna` to fix all three findings.

- [x] Luna implementer: regression tests demonstrate the failures.
- [x] Luna implementer: fix legitimate legacy overflow and completion-state normalization.
- [x] Luna implementer: restore missing occurrences safely on text-only rename.
- [x] Tests, production build, typecheck and whitespace checks verified.
- [x] Scoped independent review confirms the three findings addressed; its additional aggregate-validation finding was corrected by Luna and verified by the primary agent.

## Final resolution

All three original findings are resolved by `gpt-6-luna`. An independent scoped Luna review confirmed each original finding ADDRESSED and identified one aggregate-validation gap in the fix; the same implementer added a failing regression, fixed the guard and reran verification. The primary agent inspected the aggregate guard and rollback test, then independently ran the full suite and typecheck.

Final checks: 41 test files / 349 tests passed; production build passed after the last source change; typecheck and `git diff --check` passed. Existing Vite config/line-ending warnings remain. No commits were created. Detailed RED/GREEN evidence and implementation decisions: `.superpowers/sdd/2026-10-13-tactic-occurrences/final-fix-report.md`.

Compatibility decision: overflow is recoverable only when the tactic/week completion history supports its aggregate stored done count. Existing source rows are preserved on startup/import; missing completion-backed work is restored without recreating deliberately removed incomplete rows. Rename separately restores missing due obligations while preserving completed legacy work and custom labels.
