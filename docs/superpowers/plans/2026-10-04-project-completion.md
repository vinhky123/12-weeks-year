# Project Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Read only your task brief and binding constraints; the coordinator maintains this plan.

**Goal:** Complete the existing personal 12-week planning app's reliable daily, weekly and cycle journeys.
**Architecture:** Incremental service/API repairs, compatible occurrence migration, connected rituals, then consistent UI. Reuse existing tables and components. Small Sol tasks own disjoint files; shared interfaces run in dependency order.
**Tech Stack:** Next.js 15, React 19, TypeScript, Drizzle/SQLite, Vitest, Playwright with installed Edge; no new dependencies.
**Spec:** ../specs/2026-10-04-project-completion-design.md

## Release decision — 2026-10-05

The owner stopped further feature development to conserve quota and requested a verified release, main integration, push, and worktree cleanup. This release includes C01-C07, C09, the confirmed/resumable review wizard from C08a, and the read-only selected-cycle endpoint from C17b. The existing bundled tactic execution model is retained.

The unfinished occurrence upgrade, measured carryover UI, and Journey changes are preserved at `codex/project-completion` (snapshot `fa3e257`) and are excluded from this release. C10-C16, the remaining C17/C18 UI, and C19-C23 enhancements are deferred. No further feature work is authorized by this release decision.
## Global constraints

- GPT-5.6 Sol / medium codes and reviews. Parent only plans, reviews, runs verification and handles Git.
- Owner DB is untouched. All test/build/browser databases are isolated. Never npm test:e2e.
- No worker commits, stages, switches branches, starts servers or spawns helpers. Coordinator serializes Git.
- Existing UI fixes, review merge semantics, local dates, atomic close and keyboard focus survive.
- Release authorization: integrate verified scope into main and push to https://github.com/vinhky123/12-weeks-year.git; preserve unfinished work separately.
- Parallel coding is limited to disjoint ownership; shared contracts/schema/services run sequentially.

## Review focus

1. A late/backdated/reenabled tactic must not alter a closed score; archive blocks every cycle-specific mutation.
2. Legacy inconsistent done caches, unplanned completions, dates and IDs survive migration without invented events.
3. Reconcile/regenerate/failure/retry preserves placements, completions, extras and unique occurrence identity.
4. Draft review and open-week progress never present as final; selected historical report uses its saved facts.
5. Keyboard, language switch and 390px reflow preserve visible state and usable controls across the complete journey.

## Task queue and dependencies

Each task has a bounded brief in .superpowers/sdd/2026-10-04-project-completion. Each brief pins interfaces, files, assertions and a RED → minimal implementation → GREEN → coordinator review/commit cycle. Detailed dependent briefs are finalized from the preceding verified interface, never guessed in parallel.

| ID | Deliverable | Ownership boundary | Dependencies | Status |
|---|---|---|---|---|
| C01 | Closed score and archived plan integrity | planService + cycleMutationPolicy + integrity tests | none | complete |
| C02 | Extra completion API and archived week guards | weekPlanService + item contract/route + service/API tests | C01 | complete |
| C03 | Immutable WAM snapshots and week-specific preview | wamService + snapshot tests | none | complete |
| C04 | Extra completion UI with reload/rollback | Today + TodayItem + dedicated browser spec | C02 | complete |
| C05 | Closed-only averages and dated week-13 catch-up | scoringService + completion contract/route + tests | C01 | complete |
| C06 | Review draft/final schema and compatibility | schema/migration + reviewService/contracts + guide/history + backup compatibility | C05 | complete |
| C07 | Latest baseline and atomic next-cycle creation | reviewService + dedicated tests | C06 | complete |
| C08 | Finalize/resume review and bilingual steps | Review wizard/page/components + dedicated browser spec | C06,C07 | wizard released; remaining polish deferred |
| C09 | Remaining archived measurement/report/block guards | measures + lag route + modelWeek + WAM/review guard tests | C01; review guard owned C06 | complete |
| C10 | Occurrence schema and deterministic legacy migration | schema/migration + normalization + migration tests | C06 | deferred from release |
| C11 | Occurrence repos and backup v1/v2 compatibility | execution repository + backup service/tests | C10 | deferred from release |
| C12 | Separate obligations and open-plan reconciliation | planRules + weekPlanService + planService + tests | C11 | deferred from release |
| C13 | Exact occurrence completion and plan-based scoring | scoring service/rules + contracts/completion route + tests | C12,C05 | deferred from release |
| C14 | Today/Week occurrence controls and dated catch-up | Today/Week components + dedicated browser tests | C13,C04 | deferred from release |
| C15 | Model-week scheduling context DTO | weekPlan/Today DTO + service tests | C13 | deferred from release |
| C16 | Contextual diagnosis from closed evidence | measures rules/service + tests | C05,C13 | deferred from release |
| C17 | Time blocks and weekly ritual handoff UI | Today/Week/close/WAM query routing + browser spec | C15,C03,C14 | read context released; handoff UI deferred |
| C18 | Shared Journey action and bilingual Guide/examples | shared Journey + Home/Guide + locale keys | C08,C17 | deferred from release |
| C19 | Calm Plan workspace | Plan components/page + locale keys owned namespace | C12,C18 | deferred from release |
| C20 | Calm Measures workspace and feedback copy | Measures components/page + locale keys owned namespace | C16,C19 | deferred from release |
| C21 | Calm WAM and Model Week workspaces | WAM/ModelWeek components/pages + locale namespaces | C17,C20 | deferred from release |
| C22 | Review/History/Vision/Settings polish and locale minors | remaining UI components/pages + i18n + localized error display | C08,C21 | deferred from release |
| C23 | Persisted full journeys, migrations and backup gates | E2E fixtures/specs + QA repairs routed to owners | C18-C22 | deferred from release |
| C24 | Independent final review and verified local integration | coordinator docs, tests, Git; Sol scoped fixes | all | release verification passed; integration authorized |

## Stage gates

- [ ] Stage 1 C01-C09: saved completion/review/report integrity, final score meaning and honest week-13 recovery.
- [ ] Stage 2 C10-C14: legacy-safe separately scheduled obligations with exact completion and idempotent reconciliation.
- [ ] Stage 3 C15-C18: evidence-based feedback, visible time blocks, connected weekly/cycle rituals and shared Journey.
- [ ] Stage 4 C19-C24: remaining calm UI/EN-VI, complete persisted journey QA, independent review, local main integration.

## Verification commands

Use bundled node: C:/Users/Kyyy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe.
Vitest: node node_modules/vitest/vitest.mjs run [focused files]. TypeScript: node node_modules/typescript/bin/tsc --noEmit --incremental false. Build: node node_modules/next/dist/bin/next build with TWY_DB_PATH set to a temp DB. Browser: direct node node_modules/@playwright/test/cli.js test, PLAYWRIGHT_CHANNEL=msedge, explicit coordinator port; no destructive npm test:e2e wrapper.

The final persisted matrix covers setup/start, separate Mon/Wed/Fri schedule, complete/undo/reload, extra completion/reload, failed mutation rollback, close and next-plan/WAM routing, snapshot export, draft/final review, archive mutation rejection, measured-baseline carryover, v1 upgrade/v2 backup, EN/VI and narrow/desktop keyboard workflows.
