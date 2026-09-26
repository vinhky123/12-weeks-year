# FE Spec — 12-Week Plan Builder (F2, Phase 1)

> **For Antigravity:** build exactly what this spec says — no more, no less. Rules: [`docs/fe-specs/README.md`](../README.md). If something here is wrong or missing, note it in `## Feedback` below instead of improvising.

## Idea & why (book basis)

The 12-Week Plan: at most 3 goals (the vital few), each with a required *why* and a measurable lag target, produced by verb-first tactics with week dues. The builder enforces the book's goal criteria and tactic rules client-side AND surfaces the server's rejections verbatim — the plan stays strategic, not a wish list. Book basis: [§4 Planning](../../../12-week-year-book-content.md#4-discipline-2--planning-the-12-week-plan--the-structural-core), PROJECT-PLAN §4 F2.

## Screens & routes

Route `/plan`. Two sections:
1. **Cycle bar** (top): current cycle name + status chip + start date; if no cycle exists: inline creation form (name + start date defaulted to next Monday — fetch nothing, let the server default; field optional) → "Create cycle". If a cycle exists in `planning`: "Start the year" button.
2. **Goals**: one card per goal (from `GET /api/cycles/:id`): title, why (muted), lag `180 → 170 lbs`, deadline week, status chip, tactic list. "Add goal" button (disabled with tooltip "Max 3 active goals — the vital few." when 3 active).

## Components & layout

`src/components/plan/` — `CycleBar`, `GoalCard`, `GoalForm` (modal), `TacticForm` (inline in goal card), `DuePatternInput`. Goal cards stack vertically; tactics listed inside each card with due badges (`3×/week` or `W3, W7`).

## States

- **No cycle**: creation form front and center + one-paragraph primer: "A year is 12 weeks. Pick up to 3 goals, add the daily/weekly actions that produce them, then start the year."
- **Goal form validation** (client, before submit): title, why, metric, unit required; start ≠ target. Show field errors inline. The server re-validates — render `error` + `details.errors[]` from 422 responses too.
- **Tactic form**: text (verb-first hint), due pattern toggle: "Every week × N" (N 1–7 stepper) or "Specific weeks" (12 week-toggle chips). Server 422s render verbatim.
- **Deactivated tactics** (`deactivatedAtWeek !== null`): shown dimmed with "through week N" tag; cannot edit.
- **Dropped goals** (`status === "dropped"`): collapsed, dimmed, at the bottom.

## Interactions

- Create cycle: `POST /api/cycles { name, startDate? }` → refetch detail.
- Start cycle: `POST /api/cycles/:id/start`; on 409 ("Archive it first") show the message verbatim in a banner (archiving UI is Phase 3).
- Add/edit goal: `POST /api/cycles/:id/goals` / `PATCH /api/goals/:id`.
- Drop goal (confirm dialog: "Drop this goal? Its tactics freeze from this week. History stays honest."): `DELETE /api/goals/:id`.
- Add tactic: `POST /api/goals/:id/tactics`. Edit text: `PATCH /api/tactics/:id`.
- Deactivate tactic (confirm: "Stops counting from this week."): `DELETE /api/tactics/:id?fromWeek={currentWeek}` (use `weekNumber` from `GET /api/cycles/active`).
- Editing a duePattern after any week is closed → server 409; show verbatim: "deactivate this tactic and add a new one instead".

## Data contract

```
GET    /api/cycles                          → CycleDto[]
GET    /api/cycles/active                   → ActiveCycleInfoDto (404 ApiError if none)
GET    /api/cycles/:id                      → CycleDetailDto (goals with tactics)
POST   /api/cycles                          { name, startDate? }              → CycleDto
POST   /api/cycles/:id/start                                                  → CycleDto
POST   /api/cycles/:id/goals                GoalCreate                       → GoalDto
PATCH  /api/goals/:id                       GoalUpdate                       → GoalDto
DELETE /api/goals/:id                                                         → GoalDto (dropped)
POST   /api/goals/:id/tactics               TacticCreate                     → TacticDto
PATCH  /api/tactics/:id                     TacticUpdate                     → TacticDto
DELETE /api/tactics/:id?fromWeek=N                                           → TacticDto
```
Types from `@/lib/contracts`. Never send `x-twy-today`.

## Copy & tone

- Form hints, verbatim: goal why → "Why does this matter? Goals without an emotional connection don't survive the valley." Lag → "Name the number — vague goals can't be scored." Tactic text → "Verb-first and concrete: 'Perform 30-min strength training 3×/week'."
- Max-goals tooltip: "Max 3 active goals — the vital few."
- Primer headline: "A year is 12 weeks."

## Acceptance

- [ ] Cycle create → add 2 goals with 5 tactics → start, all via the UI, works against the real API
- [ ] 4th goal blocked with the verbatim copy; blank-why rejected with the verbatim copy
- [ ] Due pattern input produces exactly the `DuePattern` JSON from contracts (both variants)
- [ ] All 4xx server errors render the server message verbatim
- [ ] No imports from `src/server/**`

## Feedback

(notes from Antigravity; answered in the next spec revision)
