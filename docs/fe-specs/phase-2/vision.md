# FE Spec — Vision (F7, Phase 2)

> **For Antigravity:** build exactly what this spec says — no more, no less. Rules: [`docs/fe-specs/README.md`](../README.md). If something here is wrong or missing, note it in `## Feedback` below instead of improvising.

## Idea & why (book basis)

Vision is the emotional engine of the whole system: the long-term picture → the 3-year bridge → why *this* 12-week cycle matters. The book: start with "what if", not "how"; a vision that isn't personal, isn't linked to daily actions, or is too small fails. The living vision is **editable mid-cycle** (D7) — refining it is encouraged; archived cycles keep a frozen snapshot automatically (already handled by the backend). Book basis: [§3 Vision](../../../12-week-year-book-content.md#3-discipline-1--vision-the-emotional-engine), PROJECT-PLAN §4 F7.

## Screens & routes

Route `/vision` (replace stub). Single editor screen, three stacked sections with a connecting visual thread (numbered 1→2→3):
1. **Long-term vision** (5–15+ years) — textarea, unconstrained thinking.
2. **Three-year vision** (~36 months) — textarea, concrete milestones.
3. **This cycle's connection** — textarea, "what must be true at the end of these 12 weeks?"
4. **Life domains** (optional list): rows of `{area, note}` with add/remove; prompts the book's domains (Health, Family, Career/Business, Finances, Social, Personal, Spiritual, Community) as suggestion chips.
5. **Save bar**: sticky bottom; "Save vision" enabled when dirty; last-saved timestamp from `updatedAt`.

## Components & layout

`src/components/vision/` — `VisionEditor` (page-level client component), `VisionSection` (numbered textarea block), `LifeDomainList`. Single column, generous whitespace — this is a reflection screen.

## States

- **No vision yet** (`vision === null`): all fields empty + onboarding prompt (copy below) + the three sections.
- **Saving**: button spinner; on success show subtle "Saved" confirmation, refetch.
- **Error**: inline banner with server message; text preserved.
- **Archived cycle view** (used later by history — the endpoint exists now): `GET /api/cycles/:id/vision` returns the snapshot; do NOT build a separate screen — just make the editor component accept a read-only mode prop for reuse in Phase 3.

## Interactions

- All fields local state; Save → `PUT /api/vision` with only the dirty fields (partial body is valid) → update from response.
- Life domains: add row (area text + note text), remove row; included in the PUT as `lifeDomains` array (full replacement — send the whole array).
- Auto-save is NOT in scope; explicit save only.
- `/today` and the dashboard already surface vision-adjacent copy — no cross-linking changes in this phase.

## Data contract

```
GET /api/vision   → { vision: VisionDto | null }
PUT /api/vision   { longTerm?, threeYear?, cycleConnection?, lifeDomains? } → { vision: VisionDto }
GET /api/cycles/:id/vision → { vision: VisionDto | null }   (snapshot ?? living; for Phase 3 reuse)
```
Types: `VisionDto`, `VisionUpdate`, `LifeDomainDto` from `@/lib/contracts`. Never send `x-twy-today`.

## Copy & tone

- Empty-state prompt, verbatim: **"Start with what if — not how."**
- Section prompts: 1 → "Five to fifteen years out. What does an ideal ordinary Tuesday look like?" · 2 → "Three years: the bridge between the dream and this quarter." · 3 → "Why does this cycle matter? What must be true at week 12?"
- Life-domain hint: "Vision across your whole life — business goals serve personal ends."
- Pitfall micro-copy under save (small, muted): "A vision that isn't personal, isn't linked to daily actions, or is too small won't survive the valley."

## Acceptance

- [ ] Empty → fill → save → reload shows persisted vision
- [ ] Partial PUT preserves untouched fields (edit only cycleConnection, long-term unchanged)
- [ ] Life domains add/remove/save round-trip as full array
- [ ] Read-only mode prop renders without any mutation UI
- [ ] All server errors render verbatim; no imports from `src/server/**`

## Feedback

(notes from Antigravity; answered in the next spec revision)
