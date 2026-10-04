# Project completion design — 2026-10-04

## Intent and authorization

The owner uses daily execution and weekly review, selected a calm, clean workspace, and explicitly requested a completion plan followed by small GPT-5.6 Sol coding tasks. This continues the accepted enhancement roadmap. The coordinator designs, reviews, verifies and integrates; Sol / medium implements. Existing authorization permits local implementation and integration; no repeated approval menu is needed. Publishing or pushing is outside this request.

Finish the existing private local-first app. Preserve Next/React/SQLite, local data ownership, the vision → goals → tactics → execution → learning method, and the delivered Today/Week design. Avoid a rebuild, new dependencies, accounts, cloud sync, AI coaching, or an expanded feature list.

## Definition of finished

A user can set up a cycle, schedule repeated actions separately, complete/undo today's work with persistence, record extra commitments, close a week atomically, plan the next week, save/export a historically accurate WAM, finish an explicit cycle review, archive and create the next cycle from current measured baselines. The core journey works in EN and VI, by keyboard, at desktop and narrow widths. Existing history, dates, counts, notes and backups survive migration. Final build, type checks, meaningful unit/API/browser journeys and independent review pass.

## Reliability policies

- Extra commitments persist in week_plan_items.done. They never add scored dues or completion rows. A completion patch is distinct from a placement/label patch; mixed intent is rejected. Closed plans and archived cycles reject writes.
- Preserve deactivatedAtWeek's existing inclusive last-active-week meaning. Compare dueForWeek before/after for every closed week before any scoring-affecting plan mutation. Reject a change that alters any closed due, including reactivation and late tactic additions. Drop-goal preflight and writes are atomic. Future-only revisions remain possible.
- All cycle-specific plan, execution, measurement, review and WAM mutations reject archived cycles. Global living vision/settings/global block templates remain editable. Archive remains idempotent.
- Cycle average uses closed weeks only. Open-week percentages are progress; unclosed historical weeks remain visibly unfinished. No early-week plan-revision verdict follows from progress alone.
- WAM auto facts freeze on first save; narrative edits retain that snapshot. Saved display/export uses it. Unsaved historical previews use measurements and lead values through the selected week, not today's latest values.
- During week 13, allow an explicit, valid completion date within week 12 for an open week-12 plan in a non-archived execution/review cycle. Reject week 1–11 catch-up in week 13, closed week 12, future/out-of-week dates, and post-week-13 writes. Undo follows the same eligibility and needs an explicit date for catch-up.
- New reviews default to draft; partial saves preserve omitted sections and deliberate empty values. Finalization is explicit, requires all defined sections, and is not inferred from row existence. Existing review rows migrate as complete to preserve recorded history. Journey/history use complete state.
- Next-cycle creation validates carryover IDs before writing, runs atomically, and offers the latest measured baseline (fallback to original). If the target now equals that baseline, require a deliberate new target or omit that goal, with clear feedback.

## Occurrence architecture

Reuse week_plan_items as schedulable obligations, with a nullable occurrenceIndex and nullable completions.weekPlanItemId link. New generated tactic obligations have plannedCount=1 and indices 0..due-1; extras retain null index. Stable item IDs identify occurrences. Add unique partial indices to prevent duplicate generated obligations and duplicate linked completions.

Normalize legacy tactic bundles deterministically: retain the original item ID as index 0, split its remaining count into sibling rows, copy placement/label/order, preserve every completion ID/date/timestamp, and associate existing completions in stable oldest-first order. Preserve unmatched completion rows without synthesizing dates or events. A legacy cached done count and real completion ledger disagreement must retain both original facts; scoring trusts recorded completion events, and the migration/backup test documents the discrepancy. Closed-plan state and aggregate historical scores must be identical before/after.

Existing drafts reconcile missing obligations on generation or plan revision, preserving all IDs, placements, labels, extras and completion links. Reconciliation is idempotent and never changes closed plans. Existing placed commitments are not silently erased by a due decrease/deactivation; future plans use the revised rules. Scored item removal is rejected: moving never reduces a denominator; extra tasks can be removed.

A plan's tactic-backed obligations define its dues; completion events define earned credit, capped to those dues. Weeks without plans retain rule-based dues. Legacy completion requests remain supported and allocate the first available obligation deterministically; new UI requests identify an exact occurrence. Generation after earlier unplanned completion attaches existing events without rewriting their dates. Completion and cached-item updates run atomically.

Backup v2 includes new fields and review state; import accepts v1 and v2 and applies the same deterministic normalization transaction. Export/import round-trips stable IDs and links; malformed references roll back. Never run migration/import against the owner's database during development.

## Feedback and workflow

Feedback considers closed-week execution and lag evidence. Execution <65% may prompt execution adjustments after a closed week. Strategy advice requires >=85% execution, a lag measurement, and lag progress behind elapsed closed weeks / goal deadline. With insufficient evidence, show neutral guidance; intermediate execution avoids categorical strategy claims.

Carry cycleId and selected week through close → next plan → optional WAM of the closed week → return to the next plan. Week 12 hands off to review. Today/Week show read-only model-week time blocks in time order without obscuring actionable tasks. Home and Guide share the canonical Journey API action rather than competing priorities.

## UI completion

Extend the calm hierarchy, roomy controls, restrained accent, responsive cards and visible saved/failed states to Plan, Measures, Review, WAM and Model Week, then polish Vision/History/Settings consistency. Keep documented interactions and focus restoration. Localize remaining copy and step labels through i18n.ts; server-error presentation gets a localized user-facing summary while preserving useful details. Complete the small Today controls/copy gaps in the queue. Display actual date-derived day names for legacy non-Monday cycle starts; keep Monday as the default for new cycles.

## Verification and delivery

Tests use temporary/in-memory DBs. Never npm test:e2e, never owner data/app.db, never destructive seed on it. Coordinator owns one isolated browser server, installed Edge, explicit port and isolated example DB. Worker tests are focused while iterating; coordinator runs each relevant combined gate and the final suite. No dependency installation or parallel Git mutations. Preserve the user's previous branches/worktrees. Integrate verified completion into local main and record remaining real limitations honestly; do not claim usability timings that were not measured.
