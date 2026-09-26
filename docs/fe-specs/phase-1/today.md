# FE Spec — Today (F4, Phase 1)

> **For Antigravity:** build exactly what this spec says — no more, no less. Rules: [`docs/fe-specs/README.md`](../README.md). If something here is wrong or missing, note it in `## Feedback` below instead of improvising.

## Idea & why (book basis)

Daily execution in five minutes: open the app, see today's tactic actions with their goal context (the *why*), check them off. The book: "daily actions determine future results" and ~5 minutes each morning. Greatness in the moment: a daily principle line reminds the user that results are made in today's choices. Book basis: [§5 Process control / daily actions](../../../12-week-year-book-content.md#5-discipline-3--process-control-weekly-rhythm--peer-support), PROJECT-PLAN §4 F4.

## Screens & routes

Route `/today`. Single screen:
1. **Header**: "Today" + `Week 2 · Day 5` label + date.
2. **Daily principle**: one line, italic, from `dailyPrinciple` (server-chosen; render verbatim).
3. **Week strip**: 7 day chips Mon–Sun (dates from `days[].date`); current day highlighted (`dayIndexToday`); clicking a chip scrolls to that day's section.
4. **Day sections** (all 7, today first on load): each item row = checkbox + label + `done/plannedCount` badge (e.g. `2/3`) + goal context chip (goal title; hover/expand shows `goal.why` in muted text).
5. **Footer**: projected week score mini-bar (progress toward 85% line).

## Components & layout

`src/components/today/` — `DaySection`, `TodayItem`, `PrincipleLine`, `ProjectedScoreBar`. Single column; day sections separated by subtle dividers; past days collapsed (click to expand), today expanded by default.

## States

- **No active execution week** (404 from API): empty state — "Today lives inside an execution week." + buttons: "Plan this week" → `/week`, "Go to dashboard" → `/`.
- **Week closed** (`planStatus === "closed"`): read-only — checkboxes disabled, banner "Week N is closed — the score is final. This is diagnosis, not judgment."
- **Item states**: `done < plannedCount` → active checkbox; `done === plannedCount` → filled green check, row dimmed; multi-count items show progress badge `done/plannedCount` with +/- buttons (see Interactions).
- **Loading**: skeleton rows. **Error**: inline banner + retry.

## Interactions

- Checking an item (or pressing `+`): `POST /api/completions { tacticId, weekNumber }` → response returns updated `done/due` and `projectedScore`; update row + footer bar from the response (optimistic UI allowed; roll back on error).
- Un-checking (pressing `−` on a multi-count item, or unchecking): `DELETE /api/completions { tacticId, weekNumber }` (same body; removes the latest completion).
- Plan-revision items (`tacticId === null`): render with a small "plan revision" tag; their checkbox is LOCAL ONLY in Phase 1 (no endpoint — do not invent one; note in Feedback if you need one).
- Keyboard: space/enter toggles the focused item; items are tabbable.

## Data contract

```
GET    /api/today                                  → TodayDto
POST   /api/completions  { tacticId, weekNumber }   → CompletionResultDto
DELETE /api/completions  { tacticId, weekNumber }   → CompletionResultDto
```
Types: `TodayDto`, `CompletionResultDto` from `@/lib/contracts`. Never send `x-twy-today`.

## Copy & tone

- Completed item tooltip, verbatim: "The score measures achievements, not effort or intentions."
- Footer label: "Projected week score — {pct}% · benchmark 85%."
- Empty day: "Nothing placed on this day — move items in the Weekly Plan."

## Acceptance

- [ ] All seven days render with correct dates; today highlighted and expanded
- [ ] Checking/unchecking updates counts, badges, and projected score without full reload
- [ ] 409 errors (cap reached, closed week) surface as a brief red toast with the server message
- [ ] Closed week renders read-only with the verbatim banner
- [ ] Daily principle renders verbatim from the API
- [ ] No imports from `src/server/**`

## Feedback

(notes from Antigravity; answered in the next spec revision)
