# FE Spec — History & Insights (F13, Phase 3)

> **For Antigravity:** build exactly what this spec says — no more, no less. Rules: [`docs/fe-specs/README.md`](../README.md). If something here is wrong or missing, note it in `## Feedback` below instead of improvising.

## Idea & why (book basis)

Four "years" per calendar year — each leaves behind its plan, its score, its review. History makes the compounding visible: execution trends across cycles, goal completion, and how intentional imbalance moved your quality of life. Book basis: [§13 Week 13](../../../12-week-year-book-content.md#13-week-13--the-review--reload-period) and the four-years premise, PROJECT-PLAN §4 F13.

## Screens & routes

Route `/history` (replace stub). Two tabs:

**Tab 1 — Cycles** (`GET /api/history`): card list (all cycles, newest first). Each card: name, status chip, start date (+ archived date), average score chip (band-colored), scored-weeks `n/12`, goals `achieved/total`, "Review saved" dot when `hasReview`. Click → `/history?id={cycleId}` detail view:
- Header (back link, cycle name, status)
- Score history strip (12 weeks, closed markers — visually match the dashboard's strip)
- Goals list with lag `start → target unit`, status chip, tactic count
- Review section (when `review !== null`): results table (grade per goal), QoL ratings with anchors, discipline ratings, breakthroughs + next-cycle notes
- Weekly reflections (`weeks[].reflection`) as a timeline
- Everything read-only.

**Tab 2 — Insights** (`GET /api/insights`):
- Best cycle card (`bestCycle`) — name + average.
- Cross-cycle score chart (bar per cycle, average score; Recharts or divs — same choice as Measures).
- "Goals achieved across all cycles: N".
- QoL movement card when `qualityOfLifeMovement !== null`: `first → latest` with an arrow; null renders "Complete two cycle reviews to see quality-of-life movement."

## Components & layout

`src/components/history/` — `HistoryTabs`, `CycleCard`, `CycleDetail`, `ReviewSection`, `InsightsPanel`. Cards in a responsive 2-col grid (≥1024px). Detail view replaces the list in-place (query param drives it; back returns to the list).

## States

- **No cycles**: empty state — "Your first 12 weeks will live here." + link `/plan`.
- **Cycle without review**: review section shows "No review saved — the year closed without a retrospective." (honest, not shaming).
- **Loading/Error**: skeletons / banner + retry.
- **Deep link**: `/history?id=N` opens the detail directly (back button works).

## Interactions

- Tab switch and card click update the URL query param (no route files added — this is still `/history`).
- No mutations on this screen except navigation.

## Data contract

```
GET /api/history        → HistoryEntryDto[]
GET /api/history/:id    → CycleHistoryDto (cycle, goals with tactics, scores {weeks, averageScore}, review | null, weeks)
GET /api/insights       → InsightsDto
```
Types: `HistoryEntryDto`, `InsightsDto` from `@/lib/contracts`. Never send `x-twy-today`.

## Copy & tone

- Page intro: "Four years a year — each one leaves a record."
- Empty state verbatim: "Your first 12 weeks will live here."
- Missing review: "No review saved — the year closed without a retrospective."
- QoL null: "Complete two cycle reviews to see quality-of-life movement."

## Acceptance

- [ ] Seeded data: list shows archived "Q3 2026 — Completed Example" (12/12 weeks, review saved, goals 1/2 achieved) and active "Q4 2026 — Book Example"
- [ ] Detail view renders the full saved review incl. QoL anchors and breakthroughs verbatim
- [ ] Insights tab: best cycle card, cross-cycle bars, QoL movement null-state and value-state both correct
- [ ] Deep link + back works; read-only everywhere; no imports from `src/server/**`

## Feedback

(notes from Antigravity; answered in the next spec revision)
