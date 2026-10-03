# Small coding task queue

Owner: primary agent coordinates, reviews, and verifies. Coding workers use **GPT-5.6 Sol / medium** with fresh context and bounded file ownership. A worker gets one brief, writes one focused regression test cycle, commits its assigned files, and reports concisely. No worker reads the entire project or launches more agents. Tasks sharing files execute sequentially.

This is a delivery queue, not a claim that the product redesign is finished. The first batch implements three already confirmed repairs. Scheduling and visual redesign need their own design and migration decisions before workers receive final briefs.

| ID | Small deliverable | Main ownership | Acceptance | Dependency / status |
|---|---|---|---|---|
| R1 | Preserve partial review saves | reviewService + dedicated tests | Later saves preserve earlier answers; explicit empty sections clear deliberately | Implemented and verified — batch 1 |
| R2 | Local today date | cycleMath + WAM clock + tests | Saigon midnight picks Monday; date-only arithmetic stays stable | Implemented and verified — batch 1 |
| R3 | Atomic weekly close | weekPlanService + dedicated tests | Rejection/failure changes no plan or measurement | Implemented and verified — batch 1 |
| R4 | Previous-week close link | NextRitualCard | Link opens the exact week named on the card | Implemented and verified — UI workspace batch |
| R5 | Reset and cancel close wizard | CloseWeekModal | Reopen starts clean; cancel/Escape works before submit; pending submit protected | Implemented and verified — UI workspace batch |
| R6 | Submit confirmed extra task | Week page + contract regression | Explicit confirmation reaches the required API field | Implemented and verified — UI workspace batch (UI sends `confirmPlanRevision: true`; persistence of extra-task completion remains R7) |
| R7 | Persist unscored task completion | Item contract/route/service, then Today integration | Toggle/undo survives reload; denominator unchanged | Agree API first; split backend/UI |
| R8 | Protect closed scores from deactivation | planService + tests | Backdating never changes a closed score | Define allowed effective weeks first |
| R9 | Reject archived plan mutations | planService/weekPlanService + tests | Archived cycle history survives every mutation attempt | After R8 |
| R10 | Saved WAM export snapshot | wamService + tests | Saved exports retain saved facts after later measurements | Ready to specify |
| R11 | Week-13 catch-up | scoring rules/service + tests | Honest completion backfill for open week 12 works; closed weeks reject | Define date policy first |
| R12 | Review draft versus complete | review contract/schema/service, then Journey | Partial review does not mark the cycle review finished | Design/version compatibility first |
| D1 | Occurrence data migration | schema/migration + round-trip tests | Old counts and history preserved without invented dates | Scheduling spec required |
| D2 | Generate separate occurrences | planRules/service + tests | A 3x tactic produces three schedulable obligations | D1 |
| D3 | Reconcile open plans after revision | weekPlanService + tests | New dues appear; placements and completions survive | D2 |
| D4 | Complete/move an occurrence | contract/routes/service + tests | Moving changes no denominator; completion belongs to its occurrence | D2-D3 |
| U1 | Responsive navigation shell | AppShell | Today/This Week/Cycle hierarchy works at narrow widths | Implemented and verified — UI workspace batch |
| U2 | Today focus and overdue work | Today + small components | Current actions and unfinished earlier work are immediately visible | Partial — Today focus and earlier work delivered on count bundles; per-occurrence scheduling still needs D4 |
| U3 | Occurrence-based weekly layout | WeekBoard/DayColumn | Place Mon/Wed/Fri sessions independently with readable controls | Partial — readable 1/2/3-column grid delivered; per-occurrence placement still needs D4 |
| W1 | Progress versus final score | scoring DTO/rules, then score components | Current progress is distinguished from final/closed averages | Separate backend/UI briefs |
| W2 | Contextual feedback | measuresRules + tests, then copy | Advice reflects elapsed weeks and available evidence | W1 |
| W3 | Weekly ritual handoff | Week/WAM routing | Close -> next-week plan -> optional WAM retains context | R3-R5, U3 |
| W4 | Show model-week blocks | weekly DTO, then Week/Today | Time blocks appear alongside scheduling | U2-U3; agree read contract |
| G1 | Journey UI integration | Home/Guide | One consistent next action from existing Journey API | R12 |
| G2 | Latest baseline on carryover | reviewService + tests | Next cycle offers latest measured baseline | Ready to specify |
| G3 | Bilingual guide and examples | Guide + locale copy | Example and current journey are usable in EN/VI | G1 |
| Q1 | Persisted browser journeys | E2E isolated DB fixtures | Setup, completion/reload, close, review, archive verified | After each relevant workflow |
| Q2 | Accessibility/localization pass | One surface per task | Keyboard, focus, control state, EN/VI, narrow layout | After each relevant UI task |
| Q3 | Existing-data and backup verification | Migration/backup tests | Counts, scores, notes and history round-trip | D1, R12 |

Execution details for R1-R3: [batch-1 plan](../superpowers/plans/2026-10-03-reliability-batch-1.md).

Cost controls: short task-specific context; parallel coding only with disjoint file ownership and serialized commits; focused tests while iterating; one full suite before each commit; one combined final review; no extra research agents, duplicate reviews, or automatic model escalation. The coordinator splits or clarifies a stuck task before spending on more context.


## First batch delivered

- R1: /root/review_save_fix, GPT-5.6 Sol medium, commit dec3cb0.
- R2: /root/local_date_fix, GPT-5.6 Sol medium, commit 51baa23.
- R3: /root/atomic_week_close_fix, GPT-5.6 Sol medium, commit 507f453.

Coordinator reviewed each task; one fresh combined review found no actionable issues. Final combined verification: 160 tests passed across 21 files; TypeScript no-emit check passed; Next.js production build passed against an isolated temporary database. Existing Vite config warning remains. Browser tests were not rerun for this server-only batch. The larger UI and scheduling work remains queued.


## UI workspace batch delivered

Plan: [UI workspace](../superpowers/plans/2026-10-03-ui-workspace.md), finished through the [completion plan](../superpowers/plans/2026-10-03-ui-workspace-completion.md). The completion plan records the walkthrough findings, the review triage and the executor's rulings. Commits on `codex/ui-workspace`:

- 29daef1 docs: plan ui workspace completion
- f3a0cf3 feat: calm daily and weekly workspace
- b007632 fix: match week dialog and frozen-board cues to their behavior
- 9b46b7e fix: keep Today items in place and focusable while saving
- b003d65 fix: show the Today week and day once in English
- 7efeda8 fix: wrap Today task and goal text between words
- 0a4ed53 fix: keep Today loaded when settings switch the language
- 2d3fbe0 fix: keep bundle steppers focusable at their limits
- baa50fc fix: switch weeks without reloading the Week page
- 6c2cc70 test: allow for dev-server compilation in browser tests
- 17b1520 fix: keep keyboard focus on a task's day select after moving it
- 81e7217 fix: reject unreadable week-close measurements instead of misreading them

Verification on 2026-10-03: TypeScript clean; 160 unit tests across 21 files; 36 browser tests (Edge, isolated seeded DB, cold dev server); production build with an isolated DB. A real-data walkthrough (44 screenshots: VI/EN, light/dark, 390px/1440px) found no page wider than its viewport. One independent review followed, and every accepted finding was fixed test-first.

Remaining limitations:
- Repeated tactics are still one count bundle (D1–D4). Extra-task completion is not persisted (R7). Only the UI half of W1 is done.
- Review wizard step labels are Vietnamese-only in English mode (`StepIndicator`).
- Measures, Plan, Review, WAM and Model Week are not yet restyled. Inline EN/VI copy is not yet in `src/lib/i18n.ts`.
- Deferred review minors:
  - The multi-count toggle name has no progress.
  - A second Escape can dismiss a dialog while it saves.
  - Today has no "Plan this week" link before the week is planned.
  - The "Rest of week" disclosure has no state, and its badge counts day sections.
  - Server errors stay English in Vietnamese.
  - Dialog focus and announcements after saves.
