# FE Spec — Dashboard (F6, Phase 1)

> **For Antigravity:** build exactly what this spec says — no more, no less. Rules: [`docs/fe-specs/README.md`](../README.md). If something here is wrong or missing, note it in `## Feedback` below instead of improvising.

## Idea & why (book basis)

The dashboard is the command center of the active "year": it answers *where am I in the 12 weeks, am I executing, and what does the system want from me right now?* It surfaces the execution score (the book's signature metric) against the 85% benchmark, and the next ritual so the weekly loop (score → plan → execute) never stalls. Book basis: [§6 Execution scoring](../../../12-week-year-book-content.md#6-discipline-4--measurement-keep-score-confront-the-truth) and PROJECT-PLAN §4 F6.

## Screens & routes

Route `/` (replace the current placeholder). One screen, vertically stacked sections:
1. **Header row**: cycle name + status chip, `Week 4 · Day 2` label (large), `59 days left in the year`, today's date.
2. **Next ritual callout** (the most important element — see Interactions).
3. **Score panel**: current week score (big number %) with band color + `85% benchmark` reference, cycle average below, 12-week history strip.
4. **Goals list**: one card per goal — title, why (small, muted), lag metric `180 → 170 lbs`, tactic count, this week's per-goal score.

## Components & layout

`src/components/dashboard/` — `NextRitualCard`, `ScorePanel`, `ScoreHistoryStrip`, `GoalCard`. Desktop-first single column (max-width from AppShell); grid 2-col for goals on ≥1024px. No new libraries; Tailwind + existing shell.

## States

- **No cycle** (`phase === "no_cycle"`): friendly empty state — "A year is 12 weeks." + "Create your first cycle" button → `/plan` (plan builder handles cycle creation).
- **Planning cycle** (`phase === "pre"`, `cycle.status === "planning"`): "Start Cycle" ritual card; scores empty.
- **Execution**: full display as above. Score null (nothing due yet): show "—" instead of 0.
- **Review week** (`phase === "review"`): banner "Week 13 — the year is complete. Celebrate, review, reload." + note that the review wizard arrives in Phase 3; scores remain visible.
- **Loading**: skeleton cards (local API is fast; skeletons only on first load).
- **Error**: red inline banner with `error` message from `ApiError`; retry button.

## Interactions

- Next ritual card renders by `nextRitual` value, each with its action:
  - `create_cycle` → button "Create your first 12 weeks" → navigates `/plan`
  - `start_cycle` → button "Start the year" → `POST /api/cycles/:id/start`, then refetch
  - `plan_week` → button "Plan week N" → navigates `/week`
  - `close_last_week` → button "Close week N-1" → navigates `/week?close=1` (the close ritual)
  - `execute_today` → button "Execute today (5 minutes)" → navigates `/today`
  - `review_mode` → informational banner (Phase 3 wizard)
  - `await_week_end` → informational "Week closed. Execute, or wait for the week to end."
- Score history strip: 12 slots; green ≥85, amber 65–84, red <65, gray = null (not reached / nothing due); closed weeks get a lock glyph; current week shows "projected" tag. Clicking a slot navigates `/week?week=N`.
- No optimistic updates on this screen; refetch dashboard after any action.

## Data contract

```
GET /api/dashboard                        → DashboardDto   (src/lib/contracts.ts)
POST /api/cycles/:id/start                → CycleDto
```
Types: import { DashboardDto, CycleDto } from "@/lib/contracts". Do NOT send the `x-twy-today` header (backend test hook only).

## Copy & tone

- Benchmark line, verbatim: **"85% weekly execution is the benchmark — below 65, revise the plan."**
- Band labels: ≥85 "Executing at a high level" · 65–84 "Goals at risk" · <65 "Revise the plan — this is diagnosis, not judgment."
- Days-left line: "{n} days left in the year." Empty state headline: "A year is 12 weeks."
- Tone: honest-but-supportive. Never console the user about a low score; state it plainly next to the benchmark.

## Acceptance

- [ ] All six `phase`/ritual states render correctly (verify with seeded data + a fresh DB)
- [ ] Score panel shows band color + the verbatim benchmark line
- [ ] History strip renders 12 slots with correct colors/lock/projected states and links to `/week?week=N`
- [ ] Goal cards show why + lag `start → target unit` + per-goal weekly score
- [ ] No imports from `src/server/**`; only `@/lib/contracts` types + fetch calls

## Feedback

(notes from Antigravity; answered in the next spec revision)
