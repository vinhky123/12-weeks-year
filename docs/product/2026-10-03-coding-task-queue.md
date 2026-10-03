# Small coding task queue

Owner: primary agent coordinates, reviews, and verifies. Coding workers use **GPT-5.6 Sol / medium** with fresh context and bounded file ownership. A worker gets one brief, writes one focused regression test cycle, commits its assigned files, and reports concisely. No worker reads the entire project or launches more agents. Tasks sharing files execute sequentially.

This is a delivery queue, not a claim that the product redesign is finished. The first batch implements three already confirmed repairs. Scheduling and visual redesign need their own design and migration decisions before workers receive final briefs.

| ID | Small deliverable | Main ownership | Acceptance | Dependency / status |
|---|---|---|---|---|
| R1 | Preserve partial review saves | reviewService + dedicated tests | Later saves preserve earlier answers; explicit empty sections clear deliberately | Batch 1 |
| R2 | Local today date | cycleMath + tests | Saigon midnight picks Monday; date-only arithmetic stays stable | Batch 1 |
| R3 | Atomic weekly close | weekPlanService + dedicated tests | Rejection/failure changes no plan or measurement | Batch 1 |
| R4 | Previous-week close link | NextRitualCard | Link opens the exact week named on the card | Ready to specify |
| R5 | Reset and cancel close wizard | CloseWeekModal | Reopen starts clean; cancel/Escape works before submit; pending submit protected | After R4 |
| R6 | Submit confirmed extra task | Week page + contract regression | Explicit confirmation reaches the required API field | Ready to specify |
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
| U1 | Responsive navigation shell | AppShell | Today/This Week/Cycle hierarchy works at narrow widths | Approve visual/interaction direction |
| U2 | Today focus and overdue work | Today + small components | Current actions and unfinished earlier work are immediately visible | D4, U1 |
| U3 | Occurrence-based weekly layout | WeekBoard/DayColumn | Place Mon/Wed/Fri sessions independently with readable controls | D4, U1 |
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

Cost controls: short task-specific context; one coding worker at a time; focused tests while iterating; one full suite before each commit; one combined final review; no extra research agents, duplicate reviews, or automatic model escalation. The coordinator splits or clarifies a stuck task before spending on more context.
