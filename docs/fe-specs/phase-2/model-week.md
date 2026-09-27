# FE Spec — Model Week / Time Blocking (F9, Phase 2)

> **For Antigravity:** build exactly what this spec says — no more, no less. Rules: [`docs/fe-specs/README.md`](../README.md). If something here is wrong or missing, note it in `## Feedback` below instead of improvising.

## Idea & why (book basis)

Time is inelastic and perishable: high performers allocate it in blocks instead of letting the day happen. The model work week pre-places: a 3-hour **Strategic Block** (most important work, once a week), daily **Buffer Blocks** (30–60 min for email/admin noise), a 3h+ **Breakout Block** (fully away from work), plus the weekly planning slot and WAM. The backend validates the book's quantities as **warnings (nudges), never errors**. Book basis: [§7 Time Use](../../../12-week-year-book-content.md#7-discipline-5--time-use-intentionality--time-blocking), PROJECT-PLAN §4 F9.

## Screens & routes

Route `/model-week` (replace stub). Two views:
1. **Template editor** (main): a Mon–Sun grid (7 columns, hours 06:00–22:00 rows) with colored block cards placed by `dayOfWeek` + `startMinute` + `durationMinutes`. Simpler acceptable layout: day columns with time-ordered block lists (grid positioning optional — pick ONE and keep it clean).
2. **Warnings panel** (top): the API's `warnings[]` as amber nudges, each dismissible-looking but persistent until resolved (they clear server-side once satisfied).
3. **Add-block form**: type select (with per-type color + hint), day select, start time (time input → minutes), duration (select 15/30/45/60/90/120/180/240 min, or number), optional label → "Add block".

## Components & layout

`src/components/modelweek/` — `ModelWeekGrid`, `BlockCard`, `WarningsPanel`, `BlockForm`. Type colors (consistent with Tailwind palette): STRATEGIC emerald, BUFFER slate, BREAKOUT sky, PLANNING violet, WAM amber. Each BlockCard shows label or type name + time range ("09:00–12:00" — derive from startMinute/duration) + edit/remove affordances.

## States

- **Empty template**: all five warnings visible + "Start with the book's defaults" button (adds the reference template below in one click, via 5 POSTs) — strongly recommended affordance.
- **Complete template**: no warnings; subtle "Model week complete — the book's quantities are in place." confirmation line.
- **Block form validation**: client-side (day 0–6, minutes 0–1439, duration 15–480); server 422s render verbatim.
- **Loading/Error**: skeleton grid / banner + retry.

## Interactions

- Add block → `POST /api/model-week` → re-render from returned `ModelWeekDto`.
- Edit block (label/time/day/duration) → `PATCH /api/model-week/:id`; remove → `DELETE /api/model-week/:id` (both return the full updated model state — refetch not needed).
- "Start with the book's defaults" adds exactly: PLANNING Mon 08:30 20min "Score last week · plan this week"; STRATEGIC Wed 09:00 180min "Deep work — 12-Week Plan tactics"; BUFFER Mon–Fri 11:00 45min "Email · admin · noise"; WAM Mon 17:30 30min "Weekly Accountability Meeting"; BREAKOUT Sat 08:00 240min "Off — fully away from work". Sequential POSTs; disable button while running.
- Time helpers (minutes ↔ "HH:MM") live in the UI layer — do not import from server.

## Data contract

```
GET    /api/model-week                        → ModelWeekDto (blocks + warnings)
POST   /api/model-week      BlockCreate       → ModelWeekDto
PATCH  /api/model-week/:id  BlockUpdate       → ModelWeekDto
DELETE /api/model-week/:id                    → ModelWeekDto
```
Types: `ModelWeekDto`, `BlockCreate`, `BlockUpdate`, `BlockType` from `@/lib/contracts`. Never send `x-twy-today`.

## Copy & tone

- Screen tagline: "Control your time, or forfeit control of your results."
- Warning lines come verbatim from the API (`warnings[].message`) — render as-is.
- Type hints (form): STRATEGIC → "3 hours, uninterrupted — your most important work." · BUFFER → "30–60 min daily for email and admin." · BREAKOUT → "3+ hours fully away from work." · PLANNING → "15–20 min weekly: score, then plan." · WAM → "Your accountability meeting — the week itself is a deadline."
- Busy≠productive micro-copy (footer, muted): "Being busy is a form of laziness — lazy thinking and indiscriminate action."

## Acceptance

- [ ] Empty → "book's defaults" click → 10 blocks → zero warnings
- [ ] Warnings panel renders API messages verbatim and clears when satisfied
- [ ] Add/edit/remove blocks round-trip; time-range labels correct (e.g. 09:00–12:00)
- [ ] 422s render verbatim; no imports from `src/server/**`
- [ ] Works with seeded data (10 blocks already present → no warnings on load)

## Feedback

(notes from Antigravity; answered in the next spec revision)
