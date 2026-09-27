# FE Spec — Guardrails Amendments (F12, Phase 3)

> **For Antigravity:** build exactly what this spec says — no more, no less. Rules: [`docs/fe-specs/README.md`](../README.md). This spec AMENDS two existing screens (Dashboard `/`, Plan `/plan`); it does not add routes.

## Idea & why (book basis)

The emotional cycle of change guarantees a "valley of despair" around weeks 3–6 — that's where most people quit. And commitment is a promise kept regardless of feelings, whose costs are counted up front. The system guides at the valley and extracts the commitment at the start. Book basis: [§12 Emotional cycle](../../../12-week-year-book-content.md#12-the-emotional-cycle-of-change-expect-the-dip), [§9 Commitment](../../../12-week-year-book-content.md#9-principle-2--commitment-vs-interest), PROJECT-PLAN §4 F12.

## Screens & routes

**1. Dashboard amendment** (`src/app/page.tsx` + `src/components/dashboard/`):
- When `dashboard.valleyGuidance !== null`, render an amber **Valley banner** between the header and the Next-Ritual card: bold `headline`, then `body`, both verbatim from the API. Dismissible for the session (state only — it returns on reload; the server decides when it clears: avg ≥ 70 or week outside 3–6).
- When null: render nothing (no reserved space).

**2. Plan page amendment** (commitment builder, `src/components/plan/`):
- In the CycleBar, when a cycle exists in `planning` or `active` **and no commitment is saved**, show a "Make it a commitment" card: costs textarea + statement textarea + "Commit" button. After save, the card collapses to a one-line reminder (statement, verbatim) with an edit affordance that reopens the form.
- Placement: under the cycle bar, above goals. Not a modal — an inline card.

## Components & layout

`src/components/dashboard/ValleyBanner.tsx`; `src/components/plan/CommitmentCard.tsx`. Both small, self-contained; no new dependencies.

## States

- **ValleyBanner**: `valleyGuidance` null → absent; present → amber; loading → absent (appears with data).
- **CommitmentCard**: `GET` returns `commitment: null` → form open; saved → collapsed reminder + "Edit"; saving spinner; 422 (blank fields) → inline errors verbatim.

## Interactions

- Commitment: `GET /api/cycles/:id/commitment` on mount (cycle id from the active-cycle fetch the page already does); `PUT /api/cycles/:id/commitment { costs, statement }` → update from response (`{ commitment }`).
- Valley banner dismissal is client-state only; no endpoint exists for dismissal (do not invent one).

## Data contract

```
GET /api/dashboard                                → DashboardDto (now includes valleyGuidance)
GET /api/cycles/:id/commitment                    → { commitment: CommitmentDto | null }
PUT /api/cycles/:id/commitment  { costs, statement } → { commitment: CommitmentDto }
```
Types from `@/lib/contracts` (`DashboardDto.valleyGuidance`, `CommitmentDto`, `Commitment`). Never send `x-twy-today`.

## Copy & tone

- Valley headline/body: verbatim from the API (`valleyGuidance.headline` / `.body`) — e.g. "You're in the valley of despair — this is normal."
- Commitment card title: "Make it a commitment." · Costs label: "Count the costs — comfort, pleasure, some opportunities." · Statement label: '"I choose to…"' · Button: "Commit".
- Collapsed reminder prefix: "Your commitment: "

## Acceptance

- [ ] Valley banner appears on the dashboard for a seeded week 3–6 cycle with avg < 70 and disappears at avg ≥ 70 (verify via the API on the active cycle at week 2 → absent)
- [ ] Commitment flow: empty → fill → commit → collapsed reminder survives reload; blank-field 422 renders verbatim
- [ ] Both amendments respect existing layouts; no invented endpoints; no imports from `src/server/**`

## Feedback

(notes from Antigravity; answered in the next spec revision)
