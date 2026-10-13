# Schedulable Tactic Occurrences — Design

Date: 2026-10-13

Status: approved by owner on 2026-10-13

## Intent

Let the owner schedule repeated tactics as separate weekly obligations. A tactic due three times in a week should appear as three individually placeable and completable items, while its weekly score still counts the same three planned actions.

The selected history policy is to convert draft/open plans and newly generated plans only. Closed week plans remain unchanged as historical records. The app remains local-first, and existing completion totals and closed scores must remain stable.

## Current behavior and gap

`generateWeekPlanItems` currently creates one `week_plan_items` row per tactic and puts its repeat count in `planned_count`. Today and Week show the row on one day with an `x/y` counter. `scoringService.syncItemDone` also finds only the first row for a tactic, and completion requests identify a tactic and week rather than a specific planned instance. This prevents moving each repetition to a different day and makes individual undo ambiguous.

## Goals

1. Generate a separate row for every due repetition in an open or new plan, each with `plannedCount = 1`.
2. Let Today and Week mark, undo, move and rename an occurrence independently.
3. Keep weekly scoring based on the tactic's due count and total completions; one completion per occurrence still contributes one point toward the same weekly denominator.
4. Convert existing draft plans deterministically without losing completed counts or user-selected day placements.
5. Leave closed plans, their displayed counts, closed scores and saved reports untouched.
6. Continue to import version 1 backups and support older completion requests that contain only tactic ID and week number.

## Proposed design

### Occurrence representation

Continue using `week_plan_items` as the plan and occurrence table rather than adding a parallel table. New generated tactic occurrences use one row per repetition, `planned_count = 1`, a distinct row ID and the same `tactic_id`. They initially use Monday like current generated items; the owner can move each row independently. User-added plan revision items remain single rows with `tactic_id = null`.

Add a nullable `week_plan_item_id` reference to completion records. New Today/Week completion and undo actions send the selected item ID, so the server can update only that occurrence. The existing `tactic_id + week_number` request remains accepted for compatibility and resolves to the next incomplete occurrence (or the most recent completed occurrence for undo). Weekly score aggregation continues summing completions by tactic and week, ignoring the optional item link.

For an occurrence-specific request, the server validates that the item belongs to the requested tactic and week plan, that the week is open and mutable, and that the occurrence is still available for completion or undo. An occurrence with a linked completion cannot be deleted; incomplete occurrences can be removed only through the existing plan-edit path.

### Migration of draft plans

After the database column migration, run an idempotent data migration over `week_plans.status = 'draft'` only:

- Keep each existing item row as the first occurrence and set `planned_count` to 1.
- Add `planned_count - 1` rows for the same plan and tactic, preserving the existing weekday and relative order.
- Distribute the old `done` count across the first occurrences deterministically: the first `done` rows become completed and all remaining rows are incomplete.
- Keep existing completion records without an occurrence link. Their dates and aggregate scores remain the historical source of truth; future per-occurrence requests write the link.
- Do not transform rows whose `tactic_id` is null, or any item in a closed week plan.

Run the same idempotent draft-plan normalization after importing a backup, so version 1 backups with bundled counts open as separate occurrences in the new app. Missing `week_plan_item_id` values in older backups default to null. New exports include the added column while retaining backup format version 1.

### Reconcile edits to open plans

When tactics are added, renamed, edited or deactivated, reconcile affected rows in each existing draft plan:

- Add newly due occurrences (including a newly added tactic) on Monday after existing items for that tactic.
- Remove surplus incomplete occurrences from the end of their current sort order, preserving completed occurrences and all retained day placements.
- Reject a frequency reduction when the number already completed exceeds the new due count.
- Apply deactivation from its effective week using the same reconciliation rules; reject deactivation for a draft week when already completed occurrences would exceed the new due count of zero.
- When tactic text changes, update an occurrence label only if it still equals the tactic's previous text; preserve labels the owner renamed.
- Closed plans continue using the existing guardrail that blocks any change which would rewrite their due count.

### Score and display behavior

New/open plan item DTOs keep the existing field shape, with each tactic occurrence carrying `plannedCount = 1` and its own `done` value. Week and Today counters therefore become individual completion controls without changing the overall weekly score formula. Existing closed items retain their legacy `done/plannedCount` display so history remains recognizable. Lead and lag measures are unaffected.

### Backup and failure handling

The occurrence link is nullable. Import accepts legacy rows that omit it; database migrations and draft-plan normalization run transactionally and are idempotent. If normalization fails, leave the original draft plan intact and report the migration failure instead of partially splitting a plan. Export/import tests must prove both current-format round-trips and older version 1 imports.

## Alternatives considered

1. **Expand `week_plan_items` into one row per occurrence (recommended):** reuses the current UI and API shape, gives every occurrence a stable ID, and allows a small additive completion link. Requires a one-time normalization of open plans.
2. **Add a separate occurrence table:** keeps weekly plan cards as groups, but duplicates placement/completion state and forces extra joins through Today, Week, backups and scoring.
3. **Keep one row and add child checkboxes:** smaller storage change, but the repeated actions still share a day and cannot be independently scheduled, so it does not satisfy the goal.

## Non-goals

- Do not rewrite closed week plans or change their score snapshots/history.
- Do not change the weekly execution score formula or introduce a combined process/outcome score.
- Do not add recurring calendar integrations, notifications or automatic day suggestions.
- Do not support arbitrary edits to closed plans.

## Acceptance criteria

- A tactic due three times generates three separate open-plan rows, each movable to a different day.
- Completing or undoing one generated occurrence changes only that row and its matching completion record; other occurrences for the same tactic remain unchanged.
- The weekly score and due count equal the pre-change aggregate for the same completed repetitions.
- Existing open draft plans expand without changing their selected day, losing completion totals, or disturbing unrelated/manual items.
- Existing closed week-plan rows and scores remain byte-for-byte unchanged by migration.
- Tactic frequency/text changes reconcile draft plans under the rules above and cannot erase completed work or custom placements.
- A version 1 backup containing bundled counts imports successfully; a new backup round-trips occurrence links and draft-plan rows.
- Older completion API calls without an occurrence ID remain usable.

## Review status

The owner approved the proposed architecture and selected the policy to leave closed weeks untouched. The owner approved this written spec on 2026-10-13.
