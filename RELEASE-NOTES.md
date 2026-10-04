# Release — 2026-10-05

This is the verified reliability release of the existing local-first app. Install dependencies with `npm install`, then run `npm run build` and `npm start`. Personal data stays in `data/app.db` and is excluded from Git and the source package.

## Included

- Extra Today tasks persist through completion, undo, reload and failed-save retry without affecting scores.
- Closed-week and archived-cycle mutation guards preserve recorded execution.
- WAM facts remain frozen after saving and are reused by historical display/export.
- Cycle averages include closed weeks; dated week-12 recovery is supported during week 13.
- Cycle reviews distinguish draft and complete, resume saved work, and require server-confirmed finalization.
- Next-cycle creation is atomic and carries the latest measured baseline.
- A read-only selected-cycle context endpoint supports historical cycle reads.

## Verification

- 311 unit/API tests passed across 36 files.
- TypeScript passed without incremental cache.
- Production build passed.
- All 56 Edge browser tests passed against the production build and an isolated temporary database. The demo fixture and request date were both pinned to 2026-10-04 for calendar-stable coverage.

## Deferred work

The separate-occurrence upgrade, its scoring/backup integration, carryover preview UI, Journey revisions, and remaining workspace polish are excluded. Their source is preserved on `codex/project-completion`, snapshot `fa3e257`; no additional feature work was performed for this release. Repeated tactics retain bundled counts.

Existing demo-seed and system-audit scripts retain earlier date/review assumptions. They were not used as a general release gate. Archived cycles without a complete review remain read-only.
