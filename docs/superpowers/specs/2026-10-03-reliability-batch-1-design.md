# Reliability batch 1

The owner uses the app for daily execution and weekly reviews. They requested small coding tasks delegated to GPT-5.6 Sol, with the primary agent coordinating and reviewing. This batch repairs three confirmed defects from the enhancement roadmap without changing scheduling or the visual design.

## Expected behavior

1. Saving a review section preserves all omitted sections. Explicit arrays replace their section, including an empty array that deliberately clears it. First saves still create automatic result suggestions. Existing result notes, grades, ratings, and anchors remain unchanged when another section is saved.
2. The default date used by the application is the host's local calendar date. Calendar arithmetic continues to interpret date-only strings as UTC calendar days. `todayIso(now?: Date, timeZone?: string): string` additionally accepts an explicit IANA zone for deterministic verification; omitted zones use the host's zone. At 2026-10-04T17:30:00Z, Asia/Ho_Chi_Minh returns Monday 2026-10-05.
3. Weekly close validates every supplied measurement before modifying data, requires each goal to belong to that plan's cycle, and commits the close plus all lag measurements in one SQLite transaction. A rejected or failed close leaves the plan, reflection, and existing measurements unchanged. Auto-backup runs after successful commit only.

## Constraints

- No new dependency, database migration, backup-format change, or public response-shape change.
- Use temporary test databases; never open or seed the owner's database.
- Preserve the existing rule permitting closure of the current week; timing-policy changes belong to a later task.
- Do not change occurrence scheduling, score semantics, archived-history policy, or UI styling in this batch.
- GPT-5.6 Sol implements production code and regression tests. The coordinator owns the task queue, review, and integration checks.

## Delivery checks

Persisted review read-back after sequential section saves; explicit clearing; automatic first-save defaults; local midnight, year boundary, and daylight-saving transitions; rejected measurements and transaction rollback; valid close with all measurements; existing suite; TypeScript check; production build using an isolated database.
