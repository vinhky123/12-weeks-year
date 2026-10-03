# Enhancement assessment and proposed roadmap

Date: 2026-10-03 · Status: discovery draft for discussion

## Purpose and understanding

The owner has used the app for daily execution and weekly reviews and feels that both functionality and UI remain inadequate. The purpose of this assessment is to make that feeling concrete and propose an order of improvements. This is a product roadmap; detailed implementation specs belong to the individual workstreams after the direction is agreed.

The working brief is a private, local-first companion for the owner's real 12-week cycles. It should help them create a credible plan, carry out today's actions, review a week honestly, and use the evidence to improve the next week and cycle. The local SQLite ownership model and the book's vision → goals → tactics → weekly execution → review system remain the foundation.

Confirmed preference: the owner already uses daily and weekly routines. Working assumption: improve those repeated routines first. Their relative interest in better plan design versus deeper analysis has not yet been established.

## What the feeling appears to describe

The project covers most named parts of the methodology. Its transitions, daily scheduling model, feedback, and interaction consistency are less complete. Five quality gaps explain the feeling more usefully than a longer feature list:

| Quality gap | What the user experiences | What a finished experience should provide |
|---|---|---|
| Trust | A checkmark, saved review, or final score may not stay as recorded | Recorded work persists; final history is stable; failures have clear recovery |
| Workflow | The user connects planning, execution, measures, WAM, and review across separate screens | The app carries the current cycle and week through each ritual |
| Daily scheduling | A repeated tactic sits as a weekly count on one day | Individual planned actions match the days they will actually happen |
| Understanding | Percentages and verdicts leave interpretation to the user | Explain work remaining, results, uncertainty, and useful corrective choices |
| UI quality | Equal-weight navigation, cramped boards, small controls, mixed language | Clear focus, readable layouts, consistent interactions, accessible controls |

These are evidence-backed product hypotheses, not a claim to know the owner's visual taste or every source of dissatisfaction.

## Evidence and limits of the assessment

Reviewed the book reference, project plan, frontend specifications, server rules/services, API contracts, page/component source, and E2E tests. Walked through Dashboard, Today, and Week against a separate SQLite copy. Inspected the weekly screen at the default browser width and at 390 CSS pixels. Ran isolated diagnostic probes; the original application database was not changed.

The existing unit/API suite passed 148 tests during the initial project review and again after this assessment. Passing those tests establishes the covered behavior, not the quality of the complete user journey. Several E2E tests stop at screen presence, opening a confirmation, or moving between wizard steps without asserting the final persisted result. This assessment did not rerun the full browser suite, audit script, production build, or measure performance.

### Confirmed defects and functional gaps

1. **Review answers are overwritten by later steps.** The UI sends one review section at a time; the service substitutes fresh automatic results and empty arrays for omitted sections. An isolated probe saved a result note and QoL rating, then saved breakthroughs: the note disappeared and QoL became empty. Sources: [ReviewWizard](../../src/components/review/ReviewWizard.tsx), [reviewService](../../src/server/services/reviewService.ts). This is a release blocker for trustworthy review.

2. **The added-task path is incomplete.** Week submits `{ label, dayOfWeek }`, but the contract requires `confirmPlanRevision`. Parsing the actual payload shape fails. Separately, revision items with no tactic only change local React state when checked in Today, so their completion cannot survive reload. Sources: [Week page](../../src/app/week/page.tsx), [contracts](../../src/lib/contracts.ts), [Today page](../../src/app/today/page.tsx). Decide explicitly whether these are unscored commitments or goal-linked tactics; make both the UI and persistence reflect that distinction.

3. **Historical scores can change after a plan edit.** A backdated tactic deactivation is accepted and scores are recalculated from the mutable tactic list. A root diagnostic changed a closed week's scored result to `null`; a second independent memory-only probe changed a closed score from 40% to 100%. Sources: [planService](../../src/server/services/planService.ts), [scoringService](../../src/server/services/scoringService.ts), [weekPlanService](../../src/server/services/weekPlanService.ts). Closed and archived history needs enforced integrity at every mutation path.

4. **Repeated tactics cannot be placed on separate days.** Generation produces one Monday item with a multi-count obligation. The UI moves the whole item. A 3× workout cannot naturally become Monday, Wednesday, and Friday sessions. In the live copy, Today showed an empty current day while unfinished count bundles were hidden in Monday's collapsed section. Sources: [planRules](../../src/server/planRules.ts), [WeekBoard](../../src/components/week/WeekBoard.tsx), [Today](../../src/app/today/page.tsx). This is a domain-model gap as well as a UI gap.

5. **Open plans and scoring can disagree after revisions.** Generating an already existing draft returns it unchanged, while scoring reads the updated tactics. A memory-only probe added a tactic after generation: visible dues remained three while scoring expected five. Sources: [weekPlanService](../../src/server/services/weekPlanService.ts), [planService](../../src/server/services/planService.ts). Revisions need reconciliation without silently discarding placements or completions.

6. **Feedback confuses current progress with a final judgment.** Completion so far is divided by all weekly dues and called projected score; the current week also contributes to the cycle average. A low early-week value can receive a plan-revision verdict. Strategy diagnosis uses goal progress below 50% without considering elapsed weeks or a results trend. Sources: [scoring](../../src/server/scoring.ts), [scoringService](../../src/server/services/scoringService.ts), [measuresRules](../../src/server/measuresRules.ts), [ScoreVerdict](../../src/components/week/ScoreVerdict.tsx). This can encourage the wrong response even when data is mathematically consistent.

7. **Dates and week transitions have edge cases that affect real use.** Today derives the UTC date, which is the previous day during the first seven hours of the day in Saigon. Arbitrary cycle start dates are accepted, while day labels assume Monday. Week 13 rejects backfilling an unclosed week-12 completion. Sources: [cycleMath](../../src/server/cycleMath.ts), [cycleService](../../src/server/services/cycleService.ts), [scoringService](../../src/server/services/scoringService.ts). These require an explicit local-date and finalization policy.

8. **Weekly close has unsafe handoffs and persistence boundaries.** The dashboard's previous-week close action omits the week parameter, so Week defaults to the current week. The close modal retains its local state across openings and has no cancel control before completion. Closing writes the closed status before completing lag validation/writes. Sources: [NextRitualCard](../../src/components/dashboard/NextRitualCard.tsx), [Week page](../../src/app/week/page.tsx), [CloseWeekModal](../../src/components/week/CloseWeekModal.tsx), [weekPlanService](../../src/server/services/weekPlanService.ts). Route context, atomic save, safe exit, and reopen behavior all need verification.

9. **Time allocation and learning are only partly connected to execution.** Model-week blocks do not appear in the weekly detail or Today. Historical WAM exports assemble current measurements rather than consistently honoring their saved snapshot. Next-cycle carryover uses the original goal baseline; any partially saved review row counts as a finished review in Journey. Sources: [modelWeekService](../../src/server/services/modelWeekService.ts), [wamService](../../src/server/services/wamService.ts), [reviewService](../../src/server/services/reviewService.ts), [guideService](../../src/server/services/guideService.ts).

### Confirmed UI observations

- The sidebar exposes 12 equally weighted destinations and remains fixed at 256px. On the 390px check, the work area became a narrow strip. Source: [AppShell](../../src/components/AppShell.tsx).
- The weekly board combines horizontal scrolling with tall independently scrolling columns. At the default width, action text wraps into several short lines and controls crowd together. Sources: [WeekBoard](../../src/components/week/WeekBoard.tsx), [DayColumn](../../src/components/week/DayColumn.tsx).
- Today renders all seven sections. Its main action can sit below earlier empty/collapsed sections; unfinished earlier work is easy to overlook. Source: [Today](../../src/app/today/page.tsx).
- Vietnamese UI includes English headers, principles, prompts, and buttons; Guide is English-only and Model Week hardcodes Vietnamese. Locale coverage is inconsistent across modules.
- Accordion headers, completion controls, and dialogs lack some keyboard/state/focus mechanics. Sources: [DaySection](../../src/components/today/DaySection.tsx), [TodayItem](../../src/components/today/TodayItem.tsx), [CloseWeekModal](../../src/components/week/CloseWeekModal.tsx).
- The live screenshots support improving hierarchy, readable density, and control consistency. Color palette, decorative style, and personality still need the owner's preference; they are not established defects.

## Three possible approaches

| Approach | Benefit | Cost or limitation |
|---|---|---|
| **Recommended: improve complete daily/weekly workflows, with reliability repairs first** | Directly improves the owner's repeated use; fixes backend and UI together; preserves the existing foundation | Requires changes to scheduling, revisions, and workflow contracts |
| Finish current feature specs, then refresh all screens | Smaller initial changes; makes existing module coverage more consistent | Existing scheduling and disconnected rituals remain awkward unless separately addressed |
| Rebuild into one combined planning workspace | Can give strong visual and workflow consistency | Broadest change, migration/retest cost, and highest risk of replacing useful work before validating the new flow |

Use the first approach. Keep the stack and useful modules. Deliver one complete user outcome at each checkpoint, with the shared visual system introduced alongside the first daily/weekly redesign.

## Proposed experience

The primary surfaces should be **Today**, **This Week**, and **Cycle**. Setup tools, detailed measures, history, guide, and settings remain reachable as secondary destinations. This is a proposed organization, not a requirement to collapse every module into a large page.

- **Today:** today's scheduled actions first; unfinished earlier actions clearly separated; optional rescheduling; goal/why context; one completion action with visible saved/failed state; weekly progress below the work. A completed daily action and a weekly obligation must have clearly different meanings.
- **This Week:** schedule occurrences against available blocks, see remaining obligations, and run a guided review → next-week plan → optional WAM sequence. Carry cycle/week identity through every step. Rescheduling an action preserves its obligation; revising a tactic is a separate deliberate action.
- **Cycle:** vision, measurable goals, tactic strategy, remaining time, results, and the journey's current next action. Use Phase 5A rather than introducing another competing next-action engine.
- **Review and reload:** preserve drafts, distinguish draft from finished, resolve outstanding execution weeks, celebrate, review results/life/disciplines, record lessons, and offer the latest measured baseline and useful tactics for the next cycle.
- **Visual system:** readable typography, consistent spacing and control sizes, clear hierarchy, a deliberate accent color, quiet secondary metadata, complete EN/VI copy, consistent dialogs and feedback. Reserve warning/error colors for states that deserve them. Choose the visual personality through a small Today/Week comparison before expanding it across the product.

## Delivery roadmap

The first usable enhancement release comprises stages 1 and 2: dependable recorded work plus a coherent Today/Week experience. Stages 3 and 4 are subsequent releases, and stage 5 checks the combined product through real use. Each stage includes the relevant persistence, browser, migration, and backup checks before its release; verification does not wait until stage 5.

### 1. Restore trust in recorded work

Scope: preserve partial review saves and saved WAM snapshots; complete added-task persistence; enforce closed/archived integrity; fix local date handling and close links; make week close atomic; reset/cancel/resume close interactions; define week-13 catch-up and review completion states.

Acceptance: recorded completion and every review answer survive reload; saving one section preserves the others; exports of saved WAM reports retain their saved facts; a rejected operation changes no saved state; all plan mutations preserve every closed score; the selected week matches the action being submitted; Saigon midnight and Monday transitions are correct; unfinished final-week records have a deliberate completion path.

Likely code boundaries: server services/rules, contracts, relevant API routes, Today/Week/Review interactions, regression tests. Preserve existing backup compatibility or version any changed format explicitly.

### 2. Rebuild daily execution and weekly scheduling together

Scope: introduce separately schedulable occurrences for repeated tactics; reconcile draft plans after revisions; make Today focus on the current day and outstanding earlier work; add low-friction rescheduling; introduce the responsive navigation and shared interaction/visual baseline. Keep an optional unscheduled obligation visibly available while planning.

Acceptance: a 3× tactic can be placed Mon/Wed/Fri and still scores three total; completion attaches to the intended occurrence; moving Friday to Saturday changes no denominator or past completion; adding a tactic to an open plan reveals its new obligations; Today shows actionable work immediately without reviewing seven sections; the core routine works by keyboard and at narrow widths.

This work needs a data/migration design. Older count bundles and completion records must be preserved; historical completion dates or placements must not be invented during migration.

### 3. Make the weekly ritual and feedback useful

Scope: one guided close → next plan → optional WAM flow; integrate model-week blocks into planning; clearly separate completion to date from final score and closed-week average; replace premature verdicts with contextual feedback; show the journey's single next action consistently on Home/Guide; make unsaved historical WAM previews use measurements through their selected week.

Acceptance: a Monday 0% shows remaining work; closing a week produces a final score plus saved measurements/reflection; the next week's plan opens in the right cycle/week; strategic/planning/WAM blocks are visible during planning; past WAM data remains historically accurate; advice names the period and evidence supporting it, and says when the evidence is insufficient.

A capacity estimate or action duration field can follow if the owner wants help judging an overloaded week. Define that need before adding more planning inputs.

### 4. Improve plan quality and the cycle learning loop

Scope: guided checks for specific/measurable goals and their why; examples of actionable tactics and due patterns; readiness prompts; full bilingual journey/example guide; review-to-next-cycle carryover using current baselines and retained lessons.

Acceptance: the owner can tell whether a goal is measurable and which tactics are intended to move it; readiness identifies concrete gaps and links to them; a partially saved review is visibly incomplete; creating the next cycle offers the latest measured baseline and review lessons; archived data remains readable and truthful.

Keep guidance explainable and local. Coaching text should suggest a decision and show its evidence; it should not assert that a score guarantees an outcome.

### 5. Finish through real use and release verification

Scope: consistent layouts across remaining modules; full locale pass; keyboard/focus/contrast/reflow checks; meaningful browser tests through persisted results; existing-data migration and backup round-trip checks; one real daily/weekly usage checkpoint with the owner; update roadmap/docs to reflect verified delivery.

Acceptance: complete a fresh cycle setup, a weekly plan with repeated actions, completion/undo/reload, weekly close and next plan, WAM export, week-13 review, archive, and next-cycle creation. Repeat the critical paths in both locales, on desktop and at narrow widths. Existing data and imports preserve counts, scores, notes, and history. The owner can complete daily use in about five minutes and the weekly ritual in about 20–30 minutes without needing external explanations; these are proposed product targets to validate, not current measured results.

## Target product quality

1. Every exposed action succeeds, or fails clearly without losing data.
2. Every recorded action and review answer persists across refresh and restart.
3. Scored daily actions map to an actual schedule and connect to a goal; additional commitments persist and are clearly distinguished from scored obligations.
4. Progress, final score, and outcome measurements have distinct, accurate meanings.
5. Each ritual leads to the right next step with cycle/week context intact.
6. Closed and archived history cannot drift through later edits.
7. The core workflows are readable and operable in both languages, with keyboard and narrow-screen support.
8. Browser tests assert final persisted outcomes; the owner's real weekly use confirms the experience.

## Workstream boundaries and collaboration

Treat reliability, occurrence scheduling, weekly ritual/feedback, and cycle guidance as separate specs and implementation plans. Give each a complete usable deliverable and an integration checkpoint. Preserve the established backend/rules/contracts/spec ownership and Antigravity UI ownership; agree shared contracts before either side implements a changed workflow.

Build and review UI and functionality together for each workstream. The checkpoint must verify the real journey, including reload, failure, historical context, and subsequent steps. A collection of passing module tests does not close a workflow checkpoint.

The best first design slice is **Today + This Week**, following the reliability repairs. Validate their interaction model and visual direction before applying that design to the rest of the app.

## Supporting design references

The app-specific findings above come from this repository and the local walkthrough. General design criteria draw on [Nielsen Norman Group's usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) for visible state, user control, consistency, and reduced recall, and [W3C's reflow guidance](https://www.w3.org/WAI/WCAG21/Understanding/reflow) for narrow layouts. These support practical design criteria; they do not establish the owner's preferred style or replace usability checks.
