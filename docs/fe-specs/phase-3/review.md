# FE Spec — Week 13 Review Wizard (F11, Phase 3)

> **For Antigravity:** build exactly what this spec says — no more, no less. Rules: [`docs/fe-specs/README.md`](../README.md). If something here is wrong or missing, note it in `## Feedback` below instead of improvising.

## Idea & why (book basis)

Week 13 closes the "year": **celebrate first** (most people skip straight to the next grind), then the 4-part review — Results, Quality of Life (intentional imbalance check), Success Disciplines, Breakthroughs (work *on* the system, not just *in* it) — and finally reload: archive this year, carry the vital few goals into the next one. Book basis: [§13 Week 13](../../../12-week-year-book-content.md#13-week-13--the-review--reload-period), PROJECT-PLAN §4 F11.

## Screens & routes

Route `/review` (replace stub). **A 6-step wizard** with a step indicator; the dashboard's `review_mode` ritual links here. Steps:

1. **Celebrate** (`GET /api/cycles/:id/review/celebration`): big wins panel — best week (`Week N — {pct}%`), average score, `goalsCompleted of goalsTotal achieved`. Confetti-level delight is allowed here (and only here).
2. **Results** (`GET /api/cycles/:id/review`; if null, derive suggestions client-side from celebration + goals): one row per goal — title, auto `percentComplete`/`grade` (prefilled from saved `results[]`), grade slider 1–10, optional note.
3. **Quality of Life**: exactly the 6 areas from `qol[]` (Spiritual, Spouse/Key Relationship, Family, Business, Personal, Physical) — each a 1–10 slider with optional anchor inputs "What 1 means" / "What 10 means" (prefill `anchor1`/`anchor10`).
4. **Success Disciplines**: exactly the 5 discipline names from `disciplines[]` — 1–10 sliders each.
5. **Breakthroughs**: two textareas — breakthroughs + next-cycle notes (prefilled).
6. **Reload**: summary + "Archive this cycle & create the next" → `POST /api/cycles/:id/next { name?, startDate?, carryoverGoalIds? }`; carryover picker = goal rows with checkboxes (default: unachieved goals checked). After success: navigate to `/` (new cycle in planning).

Save-as-you-go: steps 2–5 each persist via `PUT /api/cycles/:id/review` (partial bodies are valid and merge server-side) when pressing "Next".

## Components & layout

`src/components/review/` — `ReviewWizard` (state machine), `CelebrateStep`, `ResultsStep`, `QolStep`, `DisciplinesStep`, `BreakthroughsStep`, `ReloadStep`, `StepIndicator`. One step visible at a time; Back/Next in a sticky footer.

## States

- **Not week 13 / cycle active**: still renderable — show a gentle banner: "Week 13 is the natural time for this. You're in week N."
- **Already archived**: wizard read-only + celebration visible; Reload step shows "This cycle is archived" and offers `POST /next` only if no successor planning cycle exists (if one exists, link "Go to dashboard").
- **No cycle** (404): empty state → `/plan`.
- **Validation**: ratings clamped client-side 1–10; server 4xx render verbatim.
- **Review exists** (`review !== null`): all steps prefilled from it.

## Interactions

- Next on steps 2–5 → PUT partial → advance. Back → no save.
- Reload → `POST /api/cycles/:id/next`; on 409 ("Archive this cycle first") show verbatim + button "Archive now" → `POST /api/cycles/:id/archive` → retry the POST automatically once.
- After reload success, show a full-screen "New year" card for the new cycle (name, start date) with button "Open dashboard".

## Data contract

```
GET  /api/cycles/:id/review/celebration   → CelebrationDto
GET  /api/cycles/:id/review               → { review: CycleReviewDto | null }
PUT  /api/cycles/:id/review               ReviewSave → { review: CycleReviewDto }
POST /api/cycles/:id/next                 NextCycleCreate → CycleDto
POST /api/cycles/:id/archive                                        → CycleDto
```
Types: `CelebrationDto`, `CycleReviewDto`, `ReviewSave`, `NextCycleCreate` from `@/lib/contracts`. Never send `x-twy-today`. Active cycle from `GET /api/cycles/active`; archived cycles from `GET /api/history`.

## Copy & tone

- Celebrate headline (verbatim): **"Celebrate before you analyze."**
- QoL intro: "Life balance is an illusion — strive for intentional imbalance. Where did you over-invest, and where deliberately not?"
- Disciplines intro: "Rate how you executed the system itself — not the results, the disciplines."
- Breakthroughs prompt (verbatim): "How must your thinking change to double your results? What new actions are required?"
- Reload warning: "Archiving freezes this cycle forever — its scores, its review, its vision snapshot."
- Grade-free zone: sliders are 1–10 mirrors, no red/green shaming.

## Acceptance

- [ ] Seeded archived cycle (id 1) renders celebration (best week 12, 96%), prefilled QoL anchors, disciplines, breakthroughs
- [ ] Full wizard walk on the active cycle saves partial reviews; reload persists prefills
- [ ] Reload step enforces archive-first (409 path) and creates a planning cycle with carried goals (no tactics)
- [ ] Rating boundaries clamp to 1–10; 4xx verbatim; no imports from `src/server/**`

## Feedback

(notes from Antigravity; answered in the next spec revision)
