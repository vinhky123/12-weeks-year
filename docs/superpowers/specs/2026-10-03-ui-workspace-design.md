# Calm daily and weekly workspace

## Intent and authorization

The owner uses the app for daily execution and weekly reviews. They asked us to implement UI improvements, with the primary agent designing and coordinating small GPT-5.6 Sol coding tasks, and selected a calm, clean workspace. This pass improves existing flows and their presentation. The prior assessment remains the source of the scheduling and data-model backlog.

## Experience

- Neutral zinc surfaces, comfortable spacing, readable text, and a restrained teal accent for navigation, current-day emphasis and progress. Retain light/dark themes and EN/VI. No dependencies, external fonts or decorative assets.
- Three primary destinations: Today (`/today`), This Week (`/week`), Cycle (`/`). Group the other existing routes under planning, reflection, and help. At widths below 1024px use a compact header, primary links and an accessible menu; the fixed sidebar must not consume the phone viewport. Main padding is 16px on phones, increasing on larger screens. Desktop content may reach 1200px.
- Today displays the current day first, then unfinished actions from earlier days, then a collapsed rest-of-week section containing future work and completed earlier work. Each plan item appears exactly once. Earlier multi-count items are described as unfinished earlier work, not separate missed occurrences. All current obligations and goal context remain available. Use native buttons, visible completion state, minimum 40px action targets, sensible empty states and clear mutation errors. Do not simulate saved completion for items without a tactic; show these as extra unscored tasks with a clear tracking limitation.
- Today's footer says weekly progress while the plan is open and final weekly score when closed. Keep the existing numbers and 85% reference; do not invent a projection or final judgment for an open week. The daily principle is secondary to the work.
- Week uses a responsive day grid: one column on narrow screens, two on medium screens, three on desktop. No horizontal board scrolling or independently scrolling columns. Cards have readable labels, wrapping goal context, 40px controls and a native day select for moving. Keep existing item counts and callback contracts; a repeated tactic remains one count bundle in this pass.
- Week header and actions are localized and wrap at phone widths. Open-week progress is neutral; closed-week scores remain final. Week changes must not expose or mutate an old plan while the requested plan is loading. Adding a task retains explicit confirmation and sends `confirmPlanRevision: true` only after confirmation.
- Add-task and close-week dialogs use a shared native modal dialog: title, accessible close button, native focus containment and restoration, Escape, scrollable content within the viewport, and dismissal disabled during a save. Each fresh opening resets its local draft state. A failed save keeps the entered answers for retry. The close wizard has score, measurements, reflection, and success steps, localized controls and finite-number validation. The dashboard close action includes the exact previous week. Dismissal consumes the `close=1` query so it cannot unexpectedly reopen after a refresh.

## Boundaries

Preserve server routes, public DTOs, schema, database and scoring calculations. This does not introduce separate recurring occurrences, persistent extra-task completion, draft reconciliation, Journey UI, model-week integration or a site-wide redesign. The existing Monday-first scheduling model remains. No seed or audit command may target the owner's database.

## Acceptance

Check 390px and desktop layouts, EN/VI, light/dark, no page-wide overflow on the changed pages, keyboard menu/dialog operation, Today section ordering, completion state/retry, week switching, task-confirmation payload, and close cancel/reopen/failure/success. Browser fixtures intercept APIs; a separate seeded temporary database is used for a real walkthrough. Run the existing unit suite, TypeScript and a production build with an isolated database.
