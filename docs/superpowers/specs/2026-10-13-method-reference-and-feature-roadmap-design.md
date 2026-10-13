# Method Reference and Product Feature Roadmap — Design

Date: 2026-10-13

Status: proposed design for owner review

## Intent

Improve the existing local-first 12 Week Year app based on the owner's real use, starting from verified gaps in the current code and carrying the newly identified Chapter 16 need into the roadmap: make process execution and outcome progress visible together, and avoid diagnosing a strategy problem too early.

In the same work, correct and expand the repository's book reference so it distinguishes the book's framework from editorial explanation and app-specific proposals. The reference remains a summary, not a reproduction of the book.

## Current product context

The current `main` branch already includes cycles, goals and tactics, weekly plans, Today execution, execution scores, lag measures, optional lead measures, model-week blocks, WAM reports, cycle review/history, import/export/backups, locale and theme settings, and a Guide/Journey API. Recent reliability work protects saved reviews, WAM snapshots, closed scores and archived cycles.

The product still uses bundled counts for repeated tactics. `generateWeekPlanItems` makes one item per tactic with a `plannedCount`; a tactic due three times per week cannot yet be placed as three separate dated obligations. The release notes and completion plan defer the occurrence migration, connected time-block/weekly-ritual UI, carryover preview, shared Journey/Guide work and remaining workspace/localization polish.

The Measures screen already displays weekly execution score, lag values and progress toward target, and manually logged lead measures. These remain separate measures. The current strategy diagnosis compares execution thresholds with lag progress below 50%, without requiring closed-week evidence, a lag trend, or accounting for elapsed time. An open/current week can therefore contribute to a categorical diagnosis prematurely.

## Goals

1. Make the book reference accurate, more useful chapter by chapter, and explicit about which statements are author guidance, editorial summary, or app design.
2. Preserve the current local-first architecture and improve existing user workflows rather than expanding into unrelated product areas.
3. Keep process and outcome measures distinct, show both clearly, and make any interpretation depend on sufficient, closed historical evidence.
4. Order future work around the largest documented functional gap and the owner's repeated daily/weekly use.

## Book-reference update

Update `12-week-year-book-content.md` to:

- Rename it as a methodology reference and state that it is not the full book.
- Correct the vision structure: aspirational vision (not time-bound), three-year personal/business visions, optional 12-month vision, then separate 12-week goals and plan.
- Add concise lessons for all 21 chapters while identifying them as paraphrases synthesized from the reference, not chapter-specific quotations.
- Qualify or remove unsupported claims and numerical guarantees, including resolution-abandonment statistics, visualization/neuron claims, fixed emotional-valley timing, and claims that an 85% score predicts goal attainment.
- Label time-block durations and score bands as guidance/heuristics rather than universal evidence-based rules.
- Add a short, balanced reader-feedback section and source list that separates primary author/publisher materials from independent reviews and anecdotal forum reports.
- Keep §18's database, UI, scoring and guardrail ideas explicitly labeled as app-specific proposals.

## Product design and proposed delivery order

### 1. Separate repeated tactic occurrences

Represent each due instance as a schedulable obligation so a three-times-per-week tactic can be assigned to three different days. Design the migration to preserve legacy counts, completion history, closed scores, backup compatibility and existing placements. Reconcile open plans after tactic edits without losing completions or user placement.

### 2. Make process and outcome scorekeeping truthful and useful

Keep the measures distinct:

- **Process/execution:** completed planned actions divided by actions due, reported by week and over closed weeks.
- **Outcome/lag:** the recorded result for each goal and its progress toward the target.
- **Lead measures:** optional weekly activity measures that help explain the process.

Do not create an arbitrary blended score. Update Measures so a reader can compare execution and results over the same cycle and understand missing data. Replace premature categorical diagnosis with this proposed, evidence-gated app heuristic:

1. Use closed weeks only. Show a neutral “not enough closed data” status until there are at least two closed execution scores and two distinct closed lag observations for the goal.
2. Show an execution concern when the mean of the two most recent closed execution scores is below 65%. Show the two weeks and scores that support the status.
3. Show a strategy concern only when the mean of those same two closed execution scores is at least 85%, and the latest two distinct closed lag observations show no progress or a decline. Show both dates/values and the score window.
4. In all other cases, show a descriptive “review the evidence” status without assigning a problem category. Do not infer progress from a single lag reading, an open week, or an assumed linear target trajectory.

These thresholds are reviewable product defaults, not rules or guarantees from the book. Keep execution and outcome values separate in both data and presentation.

### 3. Connect time blocks and weekly rituals

Show relevant model-week blocks with Today/Week planning context and carry cycle/week identity across close-week → next-week plan → optional WAM. Distinguish a scheduled obligation from a weekly count and distinguish execution progress from a closed final score.

### 4. Complete cycle carryover and Journey

Expose the existing measured-baseline preview before next-cycle creation. Make the Guide/Journey surface use one canonical next action and localize the guidance and examples in English and Vietnamese.

### 5. Finish workspace polish and full journey checks

Extend the calmer, accessible interaction patterns to Plan, Measures, Review, WAM and Model Week, then resolve remaining locale and error-copy gaps. Review real persisted journeys, migration/backups, keyboard access and narrow-screen behavior at workstream checkpoints.

## Non-goals

- Rebuild the application or add dependencies, cloud sync, accounts or telemetry.
- Add an AI coach or use an opaque single score combining unrelated process and outcome units.
- Treat individual forum posts or commercial review articles as efficacy evidence.
- Implement the roadmap in this design-review stage.

## Acceptance criteria for the planned work

- The methodology reference states its limits, names sources, includes 21 chapter lessons and corrects the vision/goal distinction.
- Repeated tactics can eventually be placed and completed as separate obligations without corrupting legacy history or closed results.
- Measures presents execution, lead measures and lag outcomes separately with aligned dates and clear missing-data states.
- No categorical strategy diagnosis is based solely on an open-week execution score or a single lag value; every diagnosis shows its supporting closed observations.
- Weekly actions preserve selected cycle/week through the close, next-plan and WAM handoff.
- Carryover preview uses the latest recorded baseline and requires a deliberate target update when that baseline already meets the old target.
- The core journey remains local-first, bilingual, keyboard-operable and usable at desktop and narrow widths.

## Review questions

1. Does the proposed delivery order match the most painful gaps in the owner's use?
2. Are the proposed defaults (two closed weeks, <65% execution concern, ≥85% execution plus flat/declining lag for strategy concern) acceptable, or should the app show only the raw comparison and leave diagnosis to the user?
3. Should reader feedback stay in the book reference, or be kept in a separate product-research note?
