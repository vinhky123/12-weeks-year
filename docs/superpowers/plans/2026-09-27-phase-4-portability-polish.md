# Phase 4 — Portability & Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (or subagent-driven-development). Steps use checkbox syntax. Phase 3 checkpoint passed (107 unit/contract tests + 11/11 e2e + 70/70 system audit) before this plan.

**Goal:** Make the local app durable and personal: full-fidelity JSON export/import with auto-backups on week close, a real Settings screen backend (theme + locale), EN/VI i18n infrastructure, installable PWA, and print-friendly output specs. Final feature phase.

**Architecture:** `backupService` owns export/import/auto-backup (backup dir derived from the DB path: `<dbDir>/backups/`, so temp-DB tests stay isolated). Export is a versioned envelope of every table's rows; import validates format+version, requires explicit confirm, snapshots the current data to a backup first, then wipes+reinserts all rows in FK-safe order inside a transaction, preserving ids. `settingsService` reads/updates the existing settings row (theme, locale, weekStartsOn). No DB migration needed.

**Tech Stack:** unchanged.

## Global Constraints

- All prior constraints apply.
- Import without `confirm: true` → 409 (destructive guard). Import always writes an auto-backup of the pre-import state first.
- Auto-backup failure must never fail a week close (best-effort, logged).
- Backup retention: newest 5 `auto-backup-*.json` in the backups dir.
- Export envelope: `{ format: "12-week-year-local-backup", version: 1, exportedAt, data: { <table>: rows[] } }` — unknown version rejected with 422.

---

## Task 1: `backupService` (TDD)

**Files:** `src/server/services/backupService.ts` + test.

- `exportAll(h)` → envelope object with all 15 tables' rows.
- `importAll(h, payload, { confirm })` → validates envelope (format/version), requires confirm (RuleError 409), writes pre-import auto-backup, then in ONE transaction wipes all tables (children first) and inserts rows (parents first), preserving ids; returns per-table counts.
- `writeAutoBackup(h, label)` → writes `<dbDir>/backups/auto-backup-<UTC timestamp>-<label?>.json`; best-effort (swallow+log errors); rolls retention to newest 5.
- `listBackups(h)` → `[{ file, sizeBytes, createdAt }]` newest first.
- `backupDirFor(dbPath)` → `path.join(path.dirname(dbPath), "backups")`.
- Hook: `weekPlanService.closeWeek` calls `writeAutoBackup(h, `week-${plan.weekNumber}-closed`)` after a successful close (try/catch).

**Tests:** round-trip (export → import into a second temp DB → exports identical, ids preserved); import rejects unknown format (422) and missing confirm (409); import writes a pre-import backup; closeWeek triggers an auto-backup file in the temp dir; retention keeps 5; closeWeek still succeeds when the backup dir is unwritable (simulate via a directory-in-place-of-file path on non-Windows-safe name — skip if not feasible; assert best-effort by monkey-patched throw instead: pass an invalid label char on Windows? Simplest: spy not available on plain module — instead call writeAutoBackup with a path forced to a file-as-dir and assert no throw).

## Task 2: `settingsService` + settings routes (TDD)

**Files:** `src/server/services/settingsService.ts` + test; `src/app/api/settings/route.ts`.

- `getSettings(h)` → the singleton row (theme, locale, weekStartsOn, currentCycleId).
- `updateSettings(h, patch)` → validates theme `system|light|dark`, locale `en|vi`, weekStartsOn 0–6; upserts; returns updated.
- Routes: `GET /api/settings` → `{ settings }`; `PATCH /api/settings` (SETTINGS_UPDATE_SCHEMA) → `{ settings }`.

## Task 3: Portability routes + contract test

**Files:** `src/app/api/export/route.ts` (GET → JSON download, `content-disposition: attachment; filename="12-week-year-backup-<date>.json"`), `src/app/api/import/route.ts` (POST IMPORT_SCHEMA `{ payload, confirm }` → `{ ok, counts }`), `src/app/api/backups/route.ts` (GET → `{ backups }`); contracts: `SETTINGS_DTO`, `SETTINGS_UPDATE_SCHEMA`, `THEMES`, `LOCALES`, `IMPORT_SCHEMA`, `BACKUP_META_DTO`; test `tests/api/phase4.test.ts`: settings round-trip + invalid theme 400; export download headers + envelope shape; import round-trip via API (export → import with confirm → export identical); import without confirm 409; import bad version 422; backups list shows the auto-backups created.

## Task 4: i18n dictionary

**Files:** `src/lib/i18n.ts` — `LOCALES`, `t(locale, key)` with `en` + `vi` dictionaries for: the 11 nav labels, 7 next-ritual labels, 3 score-band verdicts, benchmark line, valley/commitment strings (the ones the UI renders from constants), common actions (save/cancel/close/export/import). Types: `Locale`, `TranslationKey`. This is infrastructure — screens adopt it per the FE spec (progressive; AppShell nav + dashboard + Today first).

## Task 5: PWA

**Files:** `public/manifest.webmanifest`, `public/icon.svg` (+ maskable variant), `public/sw.js` (network-first pass-through with cache fallback for GET; versioned cache name), `src/components/PwaRegister.tsx` (client, registers SW in production only), layout metadata (`manifest`, `themeColor`, apple touch icon). App stays fully functional without SW (defensive try/catch registration).

## Task 6: FE specs (Antigravity handoff)

`docs/fe-specs/phase-4/settings.md` — the real `/settings` screen: Data (export download button, import file-upload with double-confirm + note that a pre-import backup is written automatically, backups list), Appearance (theme switch → PATCH + apply `document.documentElement.classList`), Language (EN/VI switch → PATCH + `t()` adoption), and the print amendment (print CSS for `/plan` and `/wam` via `@media print`), i18n adoption amendment (AppShell nav + dashboard + Today via `t()`; progressive).

## Task 7: Verification & close-out

`npm test`; `npx tsc --noEmit`; `npm run build`; live smoke: export→import→export identical against dev server; README final roadmap tick + backup docs section; merge → main; **delivery report: "Phase 4 delivered → call Antigravity for `docs/fe-specs/phase-4/`"**.

## Self-Review

- Spec coverage: F14 → Tasks 1–3 (export/import/backup/settings), 4 (i18n infra), 5 (PWA), 6 (print + adoption specs). D6 (no PIN) respected. Seed = the demo seeder (already exists, documented in README).
- Placeholders: none — all shapes/formulas specified; routes tabulated.
- Type consistency: envelope type `BackupFile`; DTO names match contracts; `RuleError` conventions consistent.
