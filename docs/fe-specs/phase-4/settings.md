# FE Spec — Settings, Theme, Language & Print (F14, Phase 4)

> **For Antigravity:** build exactly what this spec says — no more, no less. Rules: [`docs/fe-specs/README.md`](../README.md). If something here is wrong or missing, note it in `## Feedback` below instead of improvising.

## Idea & why (book basis)

Local-first means the user owns their data: one-click export, guarded import, and automatic checkpoints on every closed week. Theme and language make the tool personal — the book's system only works if you actually live in it. (No PIN by decision D6.) PROJECT-PLAN §4 F14.

## Screens & routes

Route `/settings` (replace stub). Three sections:

**1. Data — your data is yours**
- "Download backup" button → `<a href="/api/export" download>` (server sets the filename). Never fetch-and-blob.
- "Import backup" flow: file picker (accept `.json`) → read the file client-side → **double-confirm modal** (verbatim copy below) → `POST /api/import { payload: <parsed json>, confirm: true }` → success shows per-table counts summary → then reload app state (the imported data replaces everything).
- "Automatic backups" list (`GET /api/backups`): file name, size (KB), created-at; note verbatim: "A checkpoint is saved automatically every time you close a week. The newest 5 are kept."
- Import errors render verbatim (409 guard, 422 format/version).

**2. Appearance**
- Theme switch: three options (System / Light / Dark) → `PATCH /api/settings { theme }` → apply immediately: add/remove the `dark` class on `document.documentElement` (system: match `prefers-color-scheme`). Persist visually across reloads by fetching settings on app load (in the settings GET already cached by the app shell) — no localStorage duplication.

**3. Language**
- EN / VI switch → `PATCH /api/settings { locale }` → immediately re-render nav + dashboard + Today labels via `t(locale, key)` from `@/lib/i18n`. Adoption is progressive per the amendment below.

## Amendments to existing screens

- **Theme**: add `dark:` variants to the AppShell sidebar, main background, cards, and text as needed so both themes are readable (keep it simple; slate palette both ways).
- **i18n**: replace hard-coded strings with `t(locale, key)` in: AppShell nav (11 keys), the dashboard ritual card (`ritual.*`), band verdicts (`score.*`), and the days-left line. Keys and dictionaries exist in `src/lib/i18n.ts` — import `{ t }`, get locale from settings. Screens not listed stay English this phase.
- **Print**: add `@media print` CSS — hide the sidebar and action buttons on `/plan` (goals + tactics list prints cleanly) and `/wam` (the report prints as a one-page sheet); `@page { margin: 2cm }`.

## Components & layout

`src/components/settings/` — `DataSection`, `ImportModal`, `BackupsList`, `ThemeSwitch`, `LanguageSwitch`. Single column, cards per section.

## States

- **Import**: idle → file chosen (show file name + size) → confirming (modal) → importing (spinner) → success (counts) / error (verbatim).
- **Import file validation**: must parse as JSON; show "Not a valid backup file." client-side if JSON.parse fails (server re-validates).
- **Backups empty**: "No checkpoints yet — close a week first."
- **Theme/locale**: current value pre-selected from `GET /api/settings`; optimistic switch with rollback on error.
- **Loading/Error**: skeletons / banner + retry.

## Interactions

- All three sections read settings from `GET /api/settings` on mount.
- Theme/locale PATCH returns `{ settings }` — update local state from the response.
- Import POST returns `{ ok, counts }` on success — render "Imported: {n} cycles, {n} goals…" (top 3 counts + "…").

## Data contract

```
GET   /api/settings                          → { settings: SettingsDto }
PATCH /api/settings    SettingsUpdate        → { settings: SettingsDto }
GET   /api/export                            → JSON download (envelope)
POST  /api/import      { payload, confirm }  → { ok: true, counts }  |  409/422 ApiError
GET   /api/backups                           → { backups: BackupMetaDto[] }
```
Types: `SettingsDto`, `SettingsUpdate`, `BackupMetaDto`, `AppLocale`, `Theme` from `@/lib/contracts`; `t` from `@/lib/i18n`. Never send `x-twy-today`.

## Copy & tone

- Data section intro (verbatim): "Your data is yours — one file, one folder, no cloud."
- Import modal, verbatim: "Importing replaces EVERYTHING — cycles, goals, scores, reviews. An automatic backup of the current data is saved first. Import now?"
- Import guard toast on 409: verbatim server message.
- Backups note (verbatim): "A checkpoint is saved automatically every time you close a week. The newest 5 are kept."
- Theme labels: System / Light / Dark. Language labels: English / Tiếng Việt.

## Acceptance

- [ ] Export downloads a valid JSON backup; import of that file restores identical state (verify: export → import → export, compare)
- [ ] Import without confirmation is impossible (modal forces confirm); 409/422 render verbatim
- [ ] Backups list shows the seeded auto-backups from week-1 close
- [ ] Theme switch applies instantly and survives reload (settings-backed); dark mode readable on all screens
- [ ] Language switch flips nav + dashboard + Today to Vietnamese and back
- [ ] /plan and /wam print cleanly (no sidebar/buttons); no imports from `src/server/**`

## Feedback

(notes from Antigravity; answered in the next spec revision)
