# FE Spec — Weekly Plan (F3, Phase 1)

> **For Antigravity:** build exactly what this spec says — no more, no less. Rules: [`docs/fe-specs/README.md`](../README.md). If something here is wrong or missing, note it in `## Feedback` below instead of improvising.

## Idea & why (book basis)

The weekly plan is generated fresh from the 12-Week Plan each week — never copy-pasted — and holds only strategic tactic work (~15–20 min weekly ritual). Items get placed on days; ad-hoc tasks require an explicit "plan revision" confirmation (process-control discipline). Closing a week freezes it forever and finalizes the score. Book basis: [§5 Process control](../../../12-week-year-book-content.md#5-discipline-3--process-control-weekly-rhythm--peer-support), PROJECT-PLAN §4 F3.

## Screens & routes

Route `/week`. Query params: `?week=N` (default: current week), `?close=1` (jump straight to close ritual).
1. **Week header**: "Week N" + date range + status chip (draft/closed) + week score chip (band-colored).
2. **Generate state** (no plan for week N): explainer — "This week's plan is generated from your 12-Week Plan — every tactic due this week becomes an item. It takes ~15 minutes." + button "Generate week N".
3. **7-day board**: columns Mon–Sun (dates on headers); item cards show label, `done/plannedCount` badge, goal chip; drag or use item menu "Move to day…" for placement (drag not required — menu is enough for Phase 1).
4. **Add-item row** (draft only): input + day picker + "Add" — on submit without confirmation show modal: "This isn't from your 12-Week Plan. Adding it as a plan revision keeps the weekly plan strategic. Add anyway?" → `confirmPlanRevision: true`.
5. **Close-week panel** (draft only, see close-week spec section): button "Close week N" opens the close ritual modal (spec: `close-week.md`).

## Components & layout

`src/components/week/` — `WeekBoard`, `DayColumn`, `PlanItemCard`, `AddItemModal`, `CloseWeekModal` (shared with the close-week spec). Board: 7 columns on ≥1280px, horizontal scroll below; each column max-height with internal scroll.

## States

- **No active cycle**: empty state → "Create a cycle first" → `/plan`.
- **Week not generated**: generate state (above). Generating (button spinner) → filled board.
- **Closed week**: entire board read-only, lock banner: "Week N is closed — the score is final." Items show final `done/plannedCount`.
- **Future week** (N > current+1): server 409 on generate — show verbatim message.
- **Empty day column**: "—" placeholder.
- **Loading/Error**: skeleton board / inline banner + retry.

## Interactions

- Generate: `POST /api/cycles/:id/weeks/:week/generate` → renders returned `WeekPlanDetailDto`.
- Move item: `PATCH /api/week-plans/:planId/items/:itemId { dayOfWeek }` (board refetch or local move).
- Rename item: same PATCH with `{ label }`.
- Remove item (tactic items only in draft): `DELETE .../items/:itemId`.
- Add plan-revision item: `POST /api/week-plans/:planId/items { label, dayOfWeek, confirmPlanRevision: true }` after modal confirm. Cancel = no request.
- Week switcher: prev/next arrows (1–12) update `?week=N`; closed weeks viewable, current-1..current+1 editable.
- All mutations disabled on closed weeks (server also enforces; render 409s verbatim if raced).

## Data contract

```
GET    /api/cycles/active                                → ActiveCycleInfoDto
GET    /api/cycles/:id/weeks/:week                       → WeekPlanDetailDto (404 if not generated)
POST   /api/cycles/:id/weeks/:week/generate              → WeekPlanDetailDto
PATCH  /api/week-plans/:planId/items/:itemId   ItemPatch → WeekPlanDetailDto
DELETE /api/week-plans/:planId/items/:itemId             → WeekPlanDetailDto
POST   /api/week-plans/:planId/items           AddItem   → WeekPlanDetailDto
POST   /api/week-plans/:planId/close            CloseWeek→ WeekPlanDetailDto  (see close-week.md)
```
Types from `@/lib/contracts`. Never send `x-twy-today`.

## Copy & tone

- Generate explainer, verbatim: "Generated fresh from your 12-Week Plan — never copy-pasted."
- Plan-revision modal, verbatim: "This isn't from your 12-Week Plan. Adding it as a plan revision keeps the weekly plan strategic. Add anyway?"
- Closed banner: "Week N is closed — the score is final."
- Default placement note on first render of a fresh plan: "Items start on Monday — move them to the days you'll do them."

## Acceptance

- [ ] Generate → board shows one card per due tactic with correct plannedCount badges (seed data: week 3 includes the landing-page milestone)
- [ ] Move/rename/remove work in draft; all disabled + banner in closed
- [ ] Plan-revision modal flow sends `confirmPlanRevision: true` only after confirm; cancel sends nothing
- [ ] ?close=1 opens the close modal directly
- [ ] All 4xx errors render server messages verbatim; no imports from `src/server/**`

## Feedback

(notes from Antigravity; answered in the next spec revision)
