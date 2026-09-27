# FE Spec — WAM (F10, Phase 3)

> **For Antigravity:** build exactly what this spec says — no more, no less. Rules: [`docs/fe-specs/README.md`](../README.md). If something here is wrong or missing, note it in `## Feedback` below instead of improvising.

## Idea & why (book basis)

The Weekly Accountability Meeting is the process-control heartbeat: report results to date, this week's score, and next week's intentions, plus blockers and encouragement — supportive, never punitive. In a solo/local app the WAM is a **guided self-review that exports as Markdown** to bring to a real peer group. Book basis: [§5.3 WAM](../../../12-week-year-book-content.md#53-the-weekly-accountability-meeting-wam), PROJECT-PLAN §4 F10.

## Screens & routes

Route `/wam` (replace stub):
1. **Selector row**: cycle chip (active cycle) + week picker (1–12, default current week; past weeks viewable).
2. **Auto report** (read-only, from `auto`): execution score chip (band-colored) + average; "Results to date" list (per goal: lag latest `178.5 lbs` or "—", leads `thisWeek/target`); "Commitments for next week" list (tactic texts).
3. **Your input** (three textareas): Blockers · What worked · Encouragement / focus. Pre-filled from `report` when it exists.
4. **Actions**: "Save report" (PUT) · "Export as Markdown" (link opens the export endpoint — browser downloads).

## Components & layout

`src/components/wam/` — `WamView` (page-level client component), `AutoReport`, `WamField` (labeled textarea), `WeekPicker`. Single column; auto section visually distinct (muted card) from user input (white card).

## States

- **No report yet** (`report === null`): empty textareas with placeholders; Save creates.
- **Saved**: "Last saved {updatedAt}" note; fields prefilled.
- **Saving**: button spinner; success = subtle "Saved" confirmation (refetch to refresh the `auto` snapshot display).
- **Error**: inline banner with server message verbatim (e.g. week 13 rejection).
- **No cycle** (404): empty state → "Create a cycle first" → `/plan`.
- **Loading**: skeletons.

## Interactions

- Week change → refetch GET.
- Save → `PUT /api/cycles/:id/wam/:week` with the three fields (only non-empty ones; server merges) → response returns the full updated view (`report` + fresh `auto`) — update state from it.
- Export → `GET /api/cycles/:id/wam/:week/export` via `<a href download>` — do NOT fetch-and-blob; the server sets content-disposition.

## Data contract

```
GET /api/cycles/:id/wam/:week   → WamReportDto ({ report | null, auto })
PUT /api/cycles/:id/wam/:week   WamSave → WamReportDto (full view)
GET /api/cycles/:id/wam/:week/export   → text/markdown download
```
Types: `WamReportDto`, `WamSave` from `@/lib/contracts`. Never send `x-twy-today`. Use the active cycle id from `GET /api/cycles/active`.

## Copy & tone

- Page intro (verbatim): "Accountability is not consequences — it's ownership. Report to yourself like you'd report to a peer."
- Field placeholders: Blockers → "What's in the way? Name it without excuses." · What worked → "Which actions produced results this week?" · Encouragement → "One line your future self needs to read."
- Auto-section labels verbatim: "Results to date" · "Commitments for next week".
- Export button label: "Export as Markdown".

## Acceptance

- [ ] Seeded data: cycle 1 week 4 shows the valley-week report prefilled + week score 63% (REVISE_PLAN band)
- [ ] Save → reload → text persists; auto snapshot refreshes
- [ ] Export downloads a .md file whose content matches the on-screen report
- [ ] Week 13 in the picker is disabled or omitted (server rejects it)
- [ ] All errors verbatim; no imports from `src/server/**`

## Feedback

(notes from Antigravity; answered in the next spec revision)
