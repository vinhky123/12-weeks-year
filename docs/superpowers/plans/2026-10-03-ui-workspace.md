# Calm UI Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox syntax for tracking.

**Goal:** Make daily execution and weekly planning comfortable on desktop and phones.

**Architecture:** Improve existing React flows with a shared native modal, grouped responsive navigation and day grids. Keep all server and data contracts unchanged; browser regressions describe the user interactions.

**Tech Stack:** Next.js 15, React 19, Tailwind 4, Playwright, Vitest, TypeScript.

**Spec:** `docs/superpowers/specs/2026-10-03-ui-workspace-design.md`

## Global Constraints

- Coding workers use GPT-5.6 Sol / medium, fresh context, no child agents.
- Neutral zinc surfaces; teal-600/700 with dark teal-400/300 accents; EN/VI and light/dark retained. Main content 16px phone padding, up to 1200px desktop width.
- No dependencies, schema, server, DTO or scoring changes. Preserve counts and public component callback contracts.
- Action targets at least 40px; native buttons and associated field labels. No horizontal board scrolling or nested column scrolling.
- Only assigned files may be edited. Independent owners can code concurrently; coordinator serializes all Git writes and makes commits after verification.
- Never seed/audit the owner database. Run Playwright directly, with a server pointed at a separate temporary database.
- Parent reviews each diff, then one combined independent review and final verification. Do not add tests that merely assert CSS classes or source text.

## Review Focus

1. API failure must restore completion state and keep dialog answers for retry (tasks 1, 3, 6).
2. Long labels and EN/VI text must wrap without page overflow at 390px (tasks 1–5).
3. Loading a different week must not retain actionable stale plan data (tasks 1, 5).
4. Close success updates parent data without resetting the success step (tasks 1, 6).
5. Reopening dialogs resets drafts, Escape restores focus, and pending saves prevent dismissal (tasks 1, 2, 5, 6).

---

### Task 1: Browser interaction regressions

**Files:** Create `tests/e2e/ui-workspace.spec.ts`, optional focused fixture `tests/e2e/fixtures/uiWorkspace.ts`; update only the Today/Week tests in `tests/e2e/coreLoop.spec.ts` whose expectations this redesign replaces.

**Interfaces:** Consumes existing API contracts and the accessible labels specified in the task brief. Produces mocked browser tests without seed commands. Fixtures use Wednesday in week 3, long labels, completed and unfinished earlier work, and an extra task without a tactic.

- [ ] Write tests for mobile navigation/overflow; Today ordering, earlier visibility, completion state and failure; weekly move/rename; confirmed add payload; close cancellation/reset/failure/pending/success; exact previous-week link.
- [ ] Run against the unchanged UI and record relevant failures. Tests should establish browser-observable behavior, with all API routes safely intercepted.
- [ ] Update legacy Today/Week expectations to match user outcomes; keep unrelated tests intact.
- [ ] Report the failures and selectors for UI workers. Coordinator commits with the verified UI batch.

### Task 2: Responsive shell and modal foundation

**Files:** Modify `src/components/AppShell.tsx`, `src/app/globals.css`; create `src/components/common/ModalDialog.tsx`.

**Interfaces:** Produce `ModalDialog({ open, onClose, title, busy = false, children, className? })`, with a title heading and localized close button. Children own their forms and footers. Existing `AppShell` export unchanged.

- [ ] Implement grouped navigation, desktop sidebar at >=1024px and compact mobile header/primary links/menu.
- [ ] Add native modal focus/Escape/scroll/pending mechanics and restrained focus styles.
- [ ] Verify task-1 navigation cases and TypeScript; report owned-file diff for coordinator review.

### Task 3: Focused Today and accessible completion controls

**Files:** Modify `src/app/today/page.tsx`, `src/components/today/DaySection.tsx`, `src/components/today/TodayItem.tsx`, `src/components/today/ProjectedScoreBar.tsx`, optionally `PrincipleLine.tsx`.

**Interfaces:** Preserve TodayDto and completion APIs. DaySection may add `defaultCollapsed?: boolean` and a unique `sectionId?: string`. Score bar adds `isClosed?: boolean`.

- [ ] Show current day, unfinished earlier work, then collapsed remaining work, with each item appearing once.
- [ ] Replace click-only accordion/task labels with native accessible controls; allow one mutation at a time, retain optimistic rollback and visible errors, and remove fake completion of unscored extras.
- [ ] Localize calm open-week progress and closed-score labels; move daily principle below the work.
- [ ] Verify task-1 Today cases and TypeScript; report owned-file diff.

### Task 4: Readable weekly day grid

**Files:** Modify `src/components/week/WeekBoard.tsx`, `DayColumn.tsx`, `PlanItemCard.tsx`.

**Interfaces:** Preserve all board/card callbacks. Move uses a native labelled select with full day names. Callback rejections show an error and retain edit state; no duplicate mutation while pending.

- [ ] Replace narrow horizontal columns with 1/2/3 responsive grid, free document scrolling and clear empty-day states.
- [ ] Increase card typography/control targets, wrap long labels, use full day select, label rename/remove controls, keep counts truthful.
- [ ] Format date-only values with UTC date arithmetic so host timezone cannot shift displayed board dates.
- [ ] Verify task-1 board interactions, phone overflow and TypeScript; report owned-file diff.

### Task 5: Week page state and confirmed extra-task flow

**Files:** Modify `src/app/week/page.tsx`, `src/components/week/AddItemModal.tsx`.

**Interfaces:** Consume task-2 ModalDialog. Keep `onAdd(label, dayOfWeek)` and send `confirmPlanRevision: true` from the parent only after the dialog confirmation. Close modal still receives the existing props.

- [ ] Localize and simplify responsive header/action/empty/closed copy. Label open progress honestly.
- [ ] Clear or suppress stale plans and guard against out-of-order plan fetches; actions operate only on the loaded selected week; propagate edit failures to board callbacks.
- [ ] Consume `close=1` when dismissed or changing weeks, retaining the selected week; avoid an automatically reopened modal.
- [ ] Use shared modal for add-task, reset on each open, preserve failed submission, label fields and disable dismissal while pending.
- [ ] Verify task-1 add/week loading cases and TypeScript; report owned-file diff.

### Task 6: Safe, clear close-week ritual

**Files:** Modify `src/components/week/CloseWeekModal.tsx`, `ScoreVerdict.tsx`, `src/components/dashboard/NextRitualCard.tsx`.

**Interfaces:** Consume task-2 ModalDialog. Keep existing close payload and callbacks; `onCloseSubmit` result updates success without reset. Dashboard previous-week link `/week?week=<max(1,currentWeek-1)>&close=1`.

- [ ] Reset draft state on fresh open or different plan id; do not reset merely on draft->closed status update.
- [ ] Shared modal permits cancellation/Escape before submission; protect pending save; retain answers/error on failure and show success/next-week handoff on success.
- [ ] Localize headings, buttons and warnings, associate inputs/labels, reject non-finite measurements.
- [ ] Fix previous-week link and remove English duplication in Vietnamese score copy.
- [ ] Verify task-1 close cases and TypeScript; report owned-file diff.

## Coordinator delivery checks

- [ ] Review each owned diff and resolve concerns through its worker.
- [ ] Run combined mocked browser regressions on phone/desktop and EN/VI.
- [ ] Walk through Today/Week and dialogs with a separate seeded temporary database; inspect screenshots in light/dark.
- [ ] Run full unit suite, TypeScript, production build with isolated DB, and combined independent code review.
- [ ] Commit verified tasks, update coding queue, deliver feature branch in active checkout and report remaining limitations.

The owner already selected delegated coding and authorized implementation. The optional visual preference was answered before dispatch. As required by developer autonomy, these reviewable, reversible UI changes proceed within that authorization rather than adding another confirmation gate.
