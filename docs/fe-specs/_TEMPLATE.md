# FE Spec — <Feature> (F#, Phase N)

> **For Antigravity:** build exactly what this spec says — no more, no less. Rules: [`docs/fe-specs/README.md`](./README.md). If something here is wrong or missing, note it in `## Feedback` below instead of improvising.

## Idea & why (book basis)

2–4 sentences: what book concept this serves and why the screen exists. Link the section of [`12-week-year-book-content.md`](../../12-week-year-book-content.md) it comes from.

## Screens & routes

Exact routes (from PROJECT-PLAN §9) and what the user sees on each — layout described in plain words before components.

## Components & layout

Key components, their hierarchy, and responsive behavior (the app is desktop-first; don't break mobile but don't over-invest).

## States

- **Empty** — what shows with no data yet
- **Loading** — skeleton/spinner expectations (local API is fast; prefer optimistic updates where the spec says so)
- **Error** — how API errors (`ApiError` shape from `src/lib/contracts.ts`) render
- **Edge cases** — the specific ones this feature has (e.g., frozen week, no active cycle, week 13, valley weeks)

## Interactions

Click-by-click user flows, keyboard support, and what happens on each action (including which endpoint fires and what the UI does while awaiting the response).

## Data contract

Exact endpoints this screen consumes — copied verbatim from `src/lib/contracts.ts` for this phase:

```
METHOD /api/<path>
  Request:  { …typed body }
  Response: { …typed body }
```

## Copy & tone

All user-facing strings, verbatim. Tone: honest-but-supportive — the score is a mirror, not a judge; celebrate before analyzing in week 13; required book lines (e.g., the 85% benchmark) must appear where marked.

## Acceptance

- [ ] checklist item tied to the module's acceptance criteria in PROJECT-PLAN §4
- [ ] …

## Feedback

(Antigravity: notes about spec gaps/bugs go here; this repo's agents will respond in the next spec revision.)
