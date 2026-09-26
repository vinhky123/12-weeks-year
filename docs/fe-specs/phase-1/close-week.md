# FE Spec — Close Week Ritual (F5, Phase 1)

> **For Antigravity:** build exactly what this spec says — no more, no less. Rules: [`docs/fe-specs/README.md`](../README.md). If something here is wrong or missing, note it in `## Feedback` below instead of improvising.

## Idea & why (book basis)

The weekly score-close: confront the truth (score = completions ÷ due, achievements only), log lag values for each goal, write a one-line reflection, freeze the week. The discomfort of an honest score is *productive tension* — it fuels next week's correction. Closing is final: closed weeks are immutable. Book basis: [§6 Measurement / confronting the truth](../../../12-week-year-book-content.md#6-discipline-4--measurement-keep-score-confront-the-truth), PROJECT-PLAN §4 F5.

## Screens & routes

Not a standalone route — a modal opened from `/week` ("Close week N" button, or `?close=1`). Three steps in one modal:

**Step 1 — The score.** Big score number with band color, `due`/`completed` counts, the verbatim benchmark line, and band verdict copy (below). If band is `REVISE_PLAN`, add the guidance line (below) — no softening.

**Step 2 — Lag values.** One input per active goal: "Weight (lbs): 180 → 170 · this week:" number input. Empty inputs are skipped (no lag log).

**Step 3 — Reflection + freeze.** One-line textarea (optional, placeholder below) + warning "Closing freezes week N forever — completions can no longer change." + buttons: "Back" / "Close week N".

## Components & layout

`src/components/week/CloseWeekModal.tsx` (+ small `ScoreVerdict` subcomponent reusable on the dashboard). Modal over a dimmed `/week`; steps as a 3-dot progress; content per step swaps in place.

## States

- **Score null** (nothing was due): Step 1 shows "Nothing was due this week — no score. The week still closes." (score `null` in `WeekPlanDetailDto.score`).
- **Input validation**: lag values must be numeric or empty; non-numeric → inline field error, no submit.
- **Submitting**: buttons disabled, spinner on "Close week N".
- **Error (409 already closed / future week)**: red banner with server message verbatim; modal stays open.
- **Success**: modal switches to a 4th state: checkmark, "Week N closed at {pct}%." + button "Plan week N+1" → `/week?week=N+1` (or "Done" if N+1 > current+1).

## Interactions

1. Open: modal fetches nothing new — it uses the already-loaded `WeekPlanDetailDto`.
2. Step navigation: Continue/Back; all steps skippable except the final close.
3. Close: `POST /api/week-plans/:planId/close { reflection?, lagValues? }` → on success update the week view from the response (board becomes read-only) and show the success state.
4. Logging lag mid-week is also possible outside the modal via `POST /api/lag-logs` — NOT part of this spec; don't build it.

## Data contract

```
POST /api/week-plans/:planId/close   { reflection?: string, lagValues?: { goalId, value }[] } → WeekPlanDetailDto
```
Input for the modal: the `WeekPlanDetailDto` already on `/week` + active goals (title/lag fields from `GET /api/cycles/:id`). Types from `@/lib/contracts`. Never send `x-twy-today`.

## Copy & tone

- Benchmark line, verbatim: **"85% weekly execution is the benchmark — below 65, revise the plan."**
- Verdicts (verbatim): ≥85 **"Executing at a high level."** · 65–84 **"Goals at risk."** · <65 **"Revise the plan — this is diagnosis, not judgment."** Plus always: "The score measures achievements, not effort or intentions."
- REVISE_PLAN guidance (verbatim): "Two weeks below 65? Cut tactics down to the vital few you will actually execute."
- Reflection placeholder: "One line: what worked, what slipped, what changes next week?"
- Freeze warning: "Closing freezes week N forever — completions can no longer change."

## Acceptance

- [ ] Three-step flow completes against the real API; board becomes read-only after
- [ ] Band verdict + both verbatim lines render with correct colors
- [ ] Lag values reach the server only when filled; skipped when empty
- [ ] Success state offers "Plan week N+1" with correct guard (N+1 ≤ current+1)
- [ ] All 4xx errors render server messages verbatim; no imports from `src/server/**`

## Feedback

(notes from Antigravity; answered in the next spec revision)
