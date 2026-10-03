# UI review fixes and main integration

User authorization: fix the remaining review findings, then merge into main when verified. Coding stays with GPT-5.6 Sol / medium; the parent coordinates, reviews, tests and handles Git. Base UI commit: 184f4b8. The original checkout is clean on codex/reliability-repairs; main is an ancestor of the UI branch.

## Scope and decisions

- Preserve the calm workspace and the user's subsequent fixes. No backend, scoring, schema, dependency or occurrence-model changes.
- Reproduce findings in browser tests before changing production behavior. Use one coordinator dev server, isolated DB, installed Edge and explicit port3216. Never run the destructive test:e2e seed command or touch the owner's database.
- Week writes must be serialized at page scope, with a synchronous ref guard and rendered pending state. This covers card edits, additions, generation and closing, and preserves existing selected-week response guards and failure retries.
- Share an optional mutationPending boolean from WeekBoard through DayColumn to PlanItemCard. Task A owns the first two; Task B consumes it in the card. Defaults preserve existing consumers. Pending controls must remain accessible and prevent writes without losing the initiating control's focus.
- Only active goals reach Close Week measurements; retain historical dropped goals in the cycle DTO.
- Restore focus after rename Save/Cancel and move focus to the new close-wizard step. Protect repeated Escape during pending saves; investigate the reported Edge behavior before choosing a fix. Expose an accurate disclosure state on Today.
- Workers edit disjoint files, never stage/commit/switch branches, never launch servers or child agents. Parent serializes Git. New test files are separate so workers do not collide.
- Developer autonomy and existing explicit user authorization supersede additional skill confirmation menus. The requested integration target is main; no further merge approval is necessary.

## Task A: Week writes and active goals

Own: src/app/week/page.tsx, src/components/week/WeekBoard.tsx, src/components/week/DayColumn.tsx; new tests/e2e/week-write-safety.spec.ts.

- [x] Reproduce competing card writes and close-vs-card pending behavior with manually gated API responses, without sleeps.
- [x] Add page-wide mutation serialization and pending controls, propagate mutationPending, preserve selected-week guards and finally release locks after success/failure.
- [x] Filter measurement goals to status active; test active plus dropped fixtures.
- [x] Verify focused browser cases and report root cause, RED/GREEN output and changes.

## Task B: Card keyboard focus

Own: src/components/week/PlanItemCard.tsx; new tests/e2e/week-card-focus.spec.ts.

- [x] Reproduce lost keyboard focus for rename Save and Cancel, including pending and failed Save.
- [x] Restore focus to the Rename trigger after successful Save/Cancel; retain usable draft focus on failure. Consume mutationPending from Task A and guard all card writes while preserving focus, including the existing native day select fix.
- [x] Verify focused browser cases and report RED/GREEN output and changes.

## Task C: Dialog steps and disclosure

Own: src/components/week/CloseWeekModal.tsx, src/components/common/ModalDialog.tsx, src/app/today/page.tsx; new tests/e2e/dialog-disclosure-focus.spec.ts.

- [x] Reproduce lost close-wizard step focus; focus an accessible step heading or first field on Continue/Back and success, while retaining fresh-open focus restoration and answers on failure.
- [x] Test repeated Escape during a manually gated pending close save in Edge. Fix confirmed controlled/native dialog divergence while retaining normal Escape dismissal and close-trigger focus restoration.
- [x] Ensure the Rest-of-week disclosure exposes native or explicit expanded state accurately, without changing the established Today partitions and focus behavior.
- [x] Verify focused browser cases and report evidence for confirmed/rejected review claims and changes.

## Task D: Failures found by the full browser sweep

Initial sweep: 46 passed, two Phase 2 failures. The Vision save-feedback assertion found no Saved message; the Measures heading assertion matched four headings. Own tests/e2e/phase2.spec.ts initially; investigate production source read-only, and route confirmed source bugs before editing. Preserve meaningful save/persistence/CRUD checks.

- [x] Identify both causes; fix ambiguous or stale assertions without weakening user outcomes, or fix confirmed production behavior through a bounded source task.
- [x] Run all Phase 2 checks and scoped review of the changes, then rerun the full browser suite.

## Review focus and delivery

- [x] Pending writes block every other write, including across week selection, and unlock correctly after failure. No stale full-plan response can make a closed week editable.
- [x] Dropped goals have no measurement field or submitted lag value; active goals still work.
- [x] Rename and modal step keyboard focus remains meaningful; normal and repeated busy Escape are safe.
- [x] Current Today grouping, completion state and locale behavior stay intact.
- [x] Review owned diffs, run one fresh combined Sol review; route any concrete remaining findings through a bounded fix/re-review pass.
- [x] Run full unit suite, TypeScript, new and existing UI/browser checks, and production build with isolated data.
- [x] Commit verified fixes, fetch main, preserve local work and merge locally into main. Verify the merged checkout and record evidence; no push is requested.

Delivery: source/test fixes committed as ccf5ab3 and fast-forwarded into main. The merged primary checkout passed 160 unit tests, the production build with TypeScript validation, and all 48 Edge browser tests against isolated example data. The standalone TypeScript check passed before integration. One fresh Sol review approved all five findings; its scoped follow-up approved the Phase 2 selector corrections. See [delivery record](../../product/2026-10-04-ui-review-fixes-delivery.md).

Scheduling occurrences and persistent unscored-task completion remain in their existing product queue, outside these review fixes.
