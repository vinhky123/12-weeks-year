# FE Spec — Measures (F8, Phase 2)

> **For Antigravity:** build exactly what this spec says — no more, no less. Rules: [`docs/fe-specs/README.md`](../README.md). If something here is wrong or missing, note it in `## Feedback` below instead of improvising.

## Idea & why (book basis)

Keeping score: lag indicators are the results (you can't manage them directly), lead indicators are the activities that produce them (you control those). The book's diagnosis: high execution + flat lag = **strategy problem** (change tactics); low execution = **execution problem** (process control). Weekly measurement creates the productive tension that fuels correction. Book basis: [§6 Measurement](../../../12-week-year-book-content.md#6-discipline-4--measurement-keep-score-confront-the-truth), PROJECT-PLAN §4 F8.

## Screens & routes

Route `/measures` (replace stub). One screen, per-goal sections over a shared header:
1. **Header**: cycle name + "Week N of 12" + cycle average score chip (band-colored) + the verbatim benchmark line.
2. **Score trend chart** (cycle-wide): 12 weeks, bar or line, values from `weeks[]` (nulls = gaps), 85% reference line, closed weeks solid / current week hatched or tagged "projected".
3. **Per-goal sections** (`goals[]`), each containing:
   - Goal header: title + lag "180 → 170 lbs" + progress bar (`lagProgress` 0–100%) + latest value (`latestLag`).
   - **Lag chart**: weekly values (`lagSeries[]`) as a small line/bar toward the target.
   - **Lead measures**: rows with name, `thisWeek/target` badge, weekly mini-bars from `series[]`, inline "+log" button → small popover with a number input for the current week → `POST /api/lead-logs`.
   - **Diagnosis banner** when `diagnosis !== null` (copy below).
4. **Add lead measure** (per goal): inline form (name + weekly target) → `POST /api/goals/:id/lead-measures`.

## Components & layout

`src/components/measures/` — `ScoreTrendChart`, `GoalMeasuresSection`, `LagChart`, `LeadMeasureRow`, `LeadLogPopover`, `DiagnosisBanner`, `AddLeadMeasureForm`. Charts: Recharts (already available) or hand-rolled divs — either is fine, keep it simple and readable; 85% line must be visually distinct.

## States

- **No cycle** (404): empty state → "Nothing to measure yet — create a cycle first." + link `/plan`.
- **No data**: charts render empty axes with "No data yet — close a week first."; lag progress bar at 0 with "—".
- **Lag null series**: latestLag null → progress hidden, "Log your first lag value at week close." hint.
- **Diagnosis banners** (exclusive states from the API):
  - `STRATEGY_PROBLEM` (amber): verbatim below.
  - `EXECUTION_PROBLEM` (red): verbatim below.
- **Loading/Error**: skeletons / inline banner + retry.
- **Logging lead values**: optimistic row update; on 4xx revert + toast with server message.

## Interactions

- Log lead value: `POST /api/lead-logs { leadMeasureId, weekNumber }` — weekNumber is the current week (`currentWeek` from the overview payload); value numeric ≥ 0. Upsert semantics: logging again for the same week replaces the value.
- Edit lead measure (name/target): `PATCH /api/lead-measures/:id`; remove: `DELETE /api/lead-measures/:id` with confirm ("Removes its logged history too.").
- Add lead measure: validate name non-empty, target integer ≥ 1 client-side; server 422s render verbatim.
- Lag values themselves are logged at week close (Phase 1 close-week modal) — NOT editable here; add a hint link "Log lag at week close →" to `/week?close=1`.

## Data contract

```
GET  /api/measures                                → MeasuresOverviewDto
POST /api/lead-logs       { leadMeasureId, weekNumber, value } → LeadLogDto
POST /api/goals/:id/lead-measures { name, weeklyTarget }      → LeadMeasureDto
PATCH /api/lead-measures/:id { name?, weeklyTarget? }          → LeadMeasureDto
DELETE /api/lead-measures/:id                                 → { ok: true }
```
Types: `MeasuresOverviewDto`, `LeadLogCreate`, `LeadMeasureDto`, `LeadMeasureCreate` from `@/lib/contracts`. Never send `x-twy-today`.

## Copy & tone

- Benchmark (verbatim, header): **"85% weekly execution is the benchmark — below 65, revise the plan."**
- `STRATEGY_PROBLEM` (verbatim): **"You're executing, but the lag isn't moving. The strategy is wrong — change the tactics, not the effort."**
- `EXECUTION_PROBLEM` (verbatim): **"Execution is the bottleneck. Shrink the plan to what you will actually do — process control beats motivation."**
- Lead-measure hint: "Lead indicators are the activities you control — the lag follows."
- Empty-lag hint: "Log your first lag value at week close."

## Acceptance

- [ ] Seeded data renders: score trend with week-1 at 92% closed, per-goal lag/lead rows, workouts lead 3→1 across weeks 1–2
- [ ] Lead logging updates the row optimistically and survives reload (upsert)
- [ ] Add/edit/remove lead measure works against the real API; 422s verbatim
- [ ] Diagnosis banners render verbatim when the API returns them; absent otherwise
- [ ] 85% reference line visible on both charts; no imports from `src/server/**`

## Feedback

(notes from Antigravity; answered in the next spec revision)
