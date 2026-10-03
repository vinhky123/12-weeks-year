# Calm UI Workspace — Completion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish, verify and deliver the staged Calm UI Workspace batch (Today, This Week, shared dialogs) so it can be committed and merged.

**Architecture:** The six tasks of `2026-10-03-ui-workspace.md` are already implemented and staged (uncommitted) on `codex/ui-workspace`. This plan re-syncs three stale legacy browser tests, commits the batch as a baseline, fixes the behaviour gaps found during the status check (TDD, one commit per task), then runs the real-data walkthrough, one independent review, final verification and delivery. Server routes, DTOs, schema and scoring stay untouched.

**Tech Stack:** Next.js 15, React 19, Tailwind 4, TypeScript, Playwright 1.63 (system Edge via `PLAYWRIGHT_CHANNEL=msedge`), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-03-ui-workspace-design.md` (task plan being completed: `docs/superpowers/plans/2026-10-03-ui-workspace.md`)

## Status at hand-off (checked 2026-10-03)

| Area | State | Evidence |
|---|---|---|
| Tasks 1–6 of the UI workspace plan | Implemented, **staged, not committed** (20 files, +1733/−893) | `git diff --cached --stat`; per-task audits found every checklist item present |
| TypeScript | Pass | `npx tsc --noEmit` |
| Unit/API suite | Pass — 160 tests in 21 files | `npx vitest run` with an isolated `TWY_DB_PATH` |
| Production build | Pass | `npx next build` with an isolated `TWY_DB_PATH` |
| New mocked browser tests (`ui-workspace.spec.ts`) | Pass — 12/12 | Playwright + Edge, port 3317, seeded temp DB |
| Legacy browser tests | **3 fail — stale assertions, not regressions** | root causes below |
| Coordinator checks (real-data walkthrough, combined review, commits, docs, delivery) | Not started | — |

Root causes of the three failures (the UI files were edited after the tests were last synced):

1. `coreLoop.spec.ts` Today test — `text=/“.*”/` `.first()` now hits a goal's "why" quote inside a collapsed disclosure, because the daily principle correctly moved below the work. The same test still expects the removed "Projected week score" / "chuẩn 85%" copy.
2. `coreLoop.spec.ts` Week test — the closed-week banner, add-task confirmation and close-wizard step copy were simplified ("Tuần 1 đã chốt — điểm số là cuối cùng." → "Tuần 1 đã chốt. Điểm số là chính thức."; "Step 1: Confront the Truth" → "Review execution" + "Step 1 of 3"). Both safety messages survive in new wording.
3. `phase4.spec.ts` — `getByRole("heading", { name: "Hôm nay" })` also matches the new "Việc hôm nay" section heading (strict-mode violation).

Behaviour gaps found during the check, fixed by Tasks 2–3:

- Completing the last count of an *earlier* unfinished item re-partitions Today at once: the item vanishes into the collapsed "Rest of week". Under the Monday-bundle model this is the most common daily action.
- Completion buttons use native `disabled` while saving. Edge 154 drops focus from a focused button that becomes disabled (verified with a probe), so every completion resets keyboard focus to `<body>`.
- The add-task confirmation step labels its "return to the form" button **Cancel**; the close wizard uses **Back** for the same action.
- A closed (frozen) week still shows "Tasks start on Monday. Move them to the day you plan to do them."

Task order: Task 1 first (baseline commit) → Tasks 2 and 3 (disjoint files, may run in parallel; serialize commits) → Task 4 → Task 5 → Task 6.

## Global Constraints

- Neutral zinc surfaces; teal-600/700 with dark teal-400/300 accents; EN/VI and light/dark retained. Main content 16px phone padding, up to 1200px desktop width.
- No dependencies, schema, server, DTO or scoring changes. Preserve counts and public component callback contracts.
- Action targets at least 40px; native buttons and associated field labels. No horizontal board scrolling or nested column scrolling.
- Never seed/audit the owner database. Every seed, dev-server and Playwright command sets `TWY_DB_PATH` inline to a file under `SCR="$(cygpath -m "$TEMP")/twy-ui-workspace"`. Never run `npm run test:e2e` (it seeds the default `data/app.db`).
- Browser tests run with `PLAYWRIGHT_PORT=3317 PLAYWRIGHT_CHANNEL=msedge` (Playwright's bundled browsers are not installed). `reuseExistingServer` is on, so nothing else may listen on 3317. The walkthrough server uses port 3318.
- Do not add tests that merely assert CSS classes or source text.
- Only the files listed in a task may be edited. Commits stay on `codex/ui-workspace`; never push, merge or touch another worktree without the owner's explicit OK. Never use bare `git stash` (the stash stack is shared across worktrees). End each commit message with the attribution trailer your harness requires.
- Implementers start from fresh context and launch no child agents; the coordinator serializes git writes.

## Review Focus

1. Completing the last count of an unfinished earlier item: the item stays where the user acted, shows its completed state and Undo, and moves to "Rest of week" only on the next load (Task 3).
2. A control that turns `disabled` while saving loses keyboard focus in Chromium/Edge: completion controls must stay focusable (`aria-disabled`) during a save (Task 3).
3. A closed week opened on Today: "Final weekly score", closed banner, completion locked, no "progress" framing (Task 3).
4. A frozen week on This Week shows no "move tasks" guidance; "Back" in a multi-step dialog returns to the previous step with the draft intact, and only Cancel/Close dismisses (Task 2).
5. Real data on any weekday and locale (Monday bundles, a current day with no items, EN after a locale switch): real-DB tests must not depend on the DOM order of quotes or on heading names that are substrings of other headings (Task 1).

---

### Task 1: Re-sync legacy browser tests and commit the batch baseline

**Files:**
- Modify: `tests/e2e/coreLoop.spec.ts` (helper after line 1; Today test lines 38–64; Week test lines 97–152)
- Modify: `tests/e2e/phase4.spec.ts:95`
- Commit: the 20 staged batch files, the two test files above, and this plan

**Interfaces:**
- Consumes: the staged UI as-is (no production edits in this task).
- Produces: commit `feat: calm daily and weekly workspace` — the baseline that Tasks 2–5 diff against. Review range for later tasks: `398d69a..HEAD`.

- [ ] **Step 1: Confirm the starting state**

```bash
git status --short
git diff --cached --stat | tail -1
```

Expected: 20 staged entries (`M `/`A ` in the first column), this plan as `??`, and `20 files changed, 1733 insertions(+), 893 deletions(-)`.

- [ ] **Step 2: Reproduce the three failures**

```bash
netstat -ano | grep -E ":3317 .*LISTENING" && echo "STOP: port 3317 is busy" || echo "port 3317 free"
SCR="$(cygpath -m "$TEMP")/twy-ui-workspace"; mkdir -p "$SCR"
TWY_DB_PATH="$SCR/e2e.db" npx tsx scripts/seed.ts
TWY_DB_PATH="$SCR/e2e.db" PLAYWRIGHT_PORT=3317 PLAYWRIGHT_CHANNEL=msedge npx playwright test --reporter=line
```

Expected: `3 failed`, `24 passed`; failures at `coreLoop.spec.ts:38`, `coreLoop.spec.ts:97`, `phase4.spec.ts:81`.

- [ ] **Step 3: Make the phase-4 heading assertion exact**

In `tests/e2e/phase4.spec.ts` replace:

```ts
    await expect(page.getByRole("heading", { name: "Hôm nay" })).toBeVisible();
```

with:

```ts
    await expect(page.getByRole("heading", { level: 1, name: "Hôm nay", exact: true })).toBeVisible();
```

- [ ] **Step 4: Add the regex helper to `coreLoop.spec.ts`**

Directly below `import { test, expect } from "@playwright/test";` add:

```ts

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
```

- [ ] **Step 5: Replace the Today test**

Replace the whole test that starts with `test("Today view (F4) daily execution: check, uncheck, and projected score bar"` (through its closing `});`) with:

```ts
  test("Today view (F4) daily execution: check, uncheck, and weekly progress", async ({ page }) => {
    await page.goto("/today");

    // Header, current work and unfinished earlier work lead the page.
    await expect(page.getByRole("heading", { level: 1, name: /^(Today|Hôm nay)$/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^(Today’s work|Việc hôm nay)$/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^(Earlier this week|Chưa xong từ đầu tuần)$/ })).toBeVisible();

    // The remaining days are disclosed without duplicating current or carryover work.
    const restOfWeek = page.locator("summary").filter({ hasText: /(Rest of week|Phần còn lại của tuần)/ });
    await expect(restOfWeek).toBeVisible();
    await restOfWeek.click();

    // An open week reports progress against the 85% mark, never a projected score.
    const progress = page.getByRole("region", { name: /^(Weekly progress|Tiến độ tuần)$/ });
    await expect(progress.getByRole("progressbar")).toBeVisible();
    await expect(progress.getByText(/^(85% benchmark|mốc 85%)$/)).toBeVisible();
    await expect(page.getByText(/(Projected week score|Điểm dự kiến tuần này)/)).toHaveCount(0);

    // The daily principle is secondary: it sits below the work and the progress bar.
    const principle = page.getByText(/^“.+”$/).filter({ visible: true });
    await expect(principle).toBeVisible();
    const progressBox = await progress.boundingBox();
    const principleBox = await principle.boundingBox();
    expect(principleBox!.y).toBeGreaterThan(progressBox!.y);

    // Toggle one actionable item and restore it, following it by label wherever it is listed.
    const firstAction = page
      .getByRole("button", { name: /^(Mark complete|Đánh dấu hoàn thành): / })
      .and(page.locator("button:enabled"))
      .first();
    const label = ((await firstAction.getAttribute("aria-label")) ?? "").replace(/^(Mark complete|Đánh dấu hoàn thành): /, "");
    expect(label).not.toBe("");
    const markComplete = page.getByRole("button", { name: new RegExp(`^(Mark complete|Đánh dấu hoàn thành): ${escapeRegExp(label)}$`) });
    const undoCompletion = page.getByRole("button", { name: new RegExp(`^(Undo completion|Hủy hoàn thành): ${escapeRegExp(label)}$`) });
    await expect(markComplete).toHaveAttribute("aria-pressed", "false");
    await markComplete.click();
    await expect(undoCompletion).toHaveAttribute("aria-pressed", "true");
    await undoCompletion.click();
    await expect(markComplete).toHaveAttribute("aria-pressed", "false");
  });
```

- [ ] **Step 6: Replace the Week test**

Replace the whole test that starts with `test("Weekly Plan (F3) & Close Week ritual (F5)"` (through its closing `});`) with:

```ts
  test("Weekly Plan (F3) & Close Week ritual (F5)", async ({ page }) => {
    // 1. Visit closed week 1
    await page.goto("/week?week=1");
    await expect(page.getByRole("heading", { level: 1, name: /^(Week 1|Tuần 1)$/ })).toBeVisible();
    await expect(page.getByText(/^(Week 1 is closed\. The score is final\.|Tuần 1 đã chốt\. Điểm số là chính thức\.)$/)).toBeVisible();

    // 2. Visit active week 2
    await page.goto("/week?week=2");
    await expect(page.getByRole("heading", { level: 1, name: /^(Week 2|Tuần 2)$/ })).toBeVisible();

    // Responsive seven-day schedule
    const schedule = page.getByRole("region", { name: /(Weekly schedule|Lịch tuần)/ });
    await expect(schedule).toBeVisible();
    await expect(schedule.getByRole("heading", { name: /^(Monday|Thứ Hai)/ })).toBeVisible();
    await expect(schedule.getByRole("heading", { name: /^(Sunday|Chủ Nhật)/ })).toBeVisible();
    await expect(
      page.getByText(/(Tasks start on Monday\. Move them to the day you plan to do them\.|Các công việc bắt đầu vào Thứ Hai)/),
    ).toBeVisible();

    // 3. Test Add Task & plan revision discipline
    await page.getByRole("button", { name: /^(Add task|Thêm công việc)$/i }).click();
    const addDialog = page.getByRole("dialog", { name: /(Add task|Thêm công việc)/ });
    await expect(addDialog).toBeVisible();
    await addDialog.getByRole("textbox", { name: /(Task name|Tên công việc)/ }).fill("Prepare client presentation");
    await addDialog.getByRole("button", { name: /^(Continue|Tiếp tục)$/ }).click();

    // The plan-revision confirmation explains that the extra task is not scored.
    await expect(addDialog.getByRole("heading", { name: /^(Confirm plan revision|Xác nhận điều chỉnh kế hoạch)$/ })).toBeVisible();
    await expect(addDialog.getByText(/(not included in the tactic obligations|không nằm trong các nghĩa vụ chiến thuật)/)).toBeVisible();
    await addDialog.getByRole("button", { name: /(Close dialog|Đóng hộp thoại)/ }).click();
    await expect(addDialog).toBeHidden();

    // 4. Test Close Week Modal via ?close=1
    await page.goto("/week?week=2&close=1");
    const closeDialog = page.getByRole("dialog", { name: /(Close week 2|Chốt tuần 2)/i });
    await expect(closeDialog.getByText(/^(Review execution|Xem lại thực thi)$/)).toBeVisible();
    await expect(closeDialog.getByText(/^(Step 1 of 3|Bước 1\/3)$/)).toBeVisible();
    await expect(
      closeDialog.getByText(/(85% weekly execution is the benchmark|85% thực thi hàng tuần|85% thực hiện hàng tuần)/),
    ).toBeVisible();
    await expect(
      closeDialog.getByText(/(The score measures achievements|Điểm số đo lường thành tựu)/),
    ).toBeVisible();

    // Step navigation (measurements are optional)
    await closeDialog.getByRole("button", { name: /^(Continue|Tiếp tục)$/ }).click();
    await expect(closeDialog.getByText(/^(Update results|Cập nhật kết quả)$/)).toBeVisible();

    await closeDialog.getByRole("button", { name: /^(Continue|Tiếp tục)$/ }).click();
    await expect(closeDialog.getByText(/^(Reflect and close|Suy ngẫm và chốt tuần)$/)).toBeVisible();
    await expect(
      closeDialog.getByText(/(After closing, week 2 completions cannot be changed\.|Sau khi chốt, thành tựu của tuần 2 sẽ không thể thay đổi\.)/),
    ).toBeVisible();
  });
```

- [ ] **Step 7: Run the full browser suite on a fresh seed**

```bash
SCR="$(cygpath -m "$TEMP")/twy-ui-workspace"
TWY_DB_PATH="$SCR/e2e.db" npx tsx scripts/seed.ts
TWY_DB_PATH="$SCR/e2e.db" PLAYWRIGHT_PORT=3317 PLAYWRIGHT_CHANNEL=msedge npx playwright test --reporter=line
```

Expected: `27 passed`. If one still fails, use superpowers:systematic-debugging; do not loosen an assertion until you have shown that the UI behaviour matches the spec.

- [ ] **Step 8: Type-check and unit suite**

```bash
SCR="$(cygpath -m "$TEMP")/twy-ui-workspace"
npx tsc --noEmit && TWY_DB_PATH="$SCR/vitest.db" npx vitest run
```

Expected: no TypeScript output; `Tests  160 passed (160)`.

- [ ] **Step 9: Commit this plan, then the batch**

```bash
git add docs/superpowers/plans/2026-10-03-ui-workspace-completion.md
git commit -m "docs: plan ui workspace completion" -- docs/superpowers/plans/2026-10-03-ui-workspace-completion.md
git add tests/e2e/coreLoop.spec.ts tests/e2e/phase4.spec.ts
git commit -F - <<'EOF'
feat: calm daily and weekly workspace

- Responsive shell: Today / This Week / Cycle primary navigation,
  grouped secondary routes, compact phone header with accessible menu.
- Shared native ModalDialog: focus containment and restoration,
  Escape, scrollable content, no dismissal while saving.
- Today: current day, unfinished earlier work, collapsed rest of week;
  accessible completion controls with rollback; weekly progress versus
  final score; daily principle below the work.
- Week: 1/2/3-column day grid, native move select, labelled rename and
  remove, UTC date labels, stale-week guards, confirmed extra tasks.
- Close week: resettable, cancellable wizard that keeps answers on
  failure; exact previous-week link from the dashboard.
- Browser regressions for the above; legacy tests re-synced to the
  simplified copy.
EOF
git status --short
```

Expected: two new commits; `git status --short` prints nothing.

---

### Task 2: Make week cues match their behaviour

**Files:**
- Modify: `src/components/week/WeekBoard.tsx:40-44`
- Modify: `src/components/week/AddItemModal.tsx:198-209` (confirmation-step secondary button)
- Test: `tests/e2e/coreLoop.spec.ts` (Week test)

**Interfaces:**
- Consumes: `WeekBoard` prop `isClosed: boolean` (already destructured); `AddItemModal` state setter `setShowConfirmRevision`.
- Produces: no new props or exports; `onAdd(label, dayOfWeek)` unchanged.

- [ ] **Step 1: Write the failing frozen-board assertion**

In the Week test, directly after the line asserting `Week 1 is closed\. The score is final\.`, add:

```ts
    // A frozen week does not invite moving tasks.
    await expect(page.getByText(/(Tasks start on Monday|Các công việc bắt đầu vào Thứ Hai)/)).toHaveCount(0);
```

- [ ] **Step 2: Run it and watch it fail**

```bash
SCR="$(cygpath -m "$TEMP")/twy-ui-workspace"
TWY_DB_PATH="$SCR/e2e.db" npx tsx scripts/seed.ts
TWY_DB_PATH="$SCR/e2e.db" PLAYWRIGHT_PORT=3317 PLAYWRIGHT_CHANNEL=msedge npx playwright test tests/e2e/coreLoop.spec.ts -g "Weekly Plan" --reporter=line
```

Expected: FAIL — `toHaveCount` expected `0`, received `1`.

- [ ] **Step 3: Show the hint only on editable weeks**

In `src/components/week/WeekBoard.tsx` replace:

```tsx
      <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        {locale === "vi"
          ? "Các công việc bắt đầu vào Thứ Hai. Chuyển chúng sang ngày bạn dự định thực hiện."
          : "Tasks start on Monday. Move them to the day you plan to do them."}
      </p>
```

with:

```tsx
      {!isClosed && (
        <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          {locale === "vi"
            ? "Các công việc bắt đầu vào Thứ Hai. Chuyển chúng sang ngày bạn dự định thực hiện."
            : "Tasks start on Monday. Move them to the day you plan to do them."}
        </p>
      )}
```

- [ ] **Step 4: Run it and watch it pass**

Run the Step 2 commands. Expected: PASS.

- [ ] **Step 5: Write the failing Back assertion**

In the Week test replace:

```ts
    await addDialog.getByRole("button", { name: /(Close dialog|Đóng hộp thoại)/ }).click();
    await expect(addDialog).toBeHidden();
```

with:

```ts
    // Back returns to the form with the draft intact; nothing is saved yet.
    await addDialog.getByRole("button", { name: /^(Back|Quay lại)$/ }).click();
    await expect(addDialog.getByRole("textbox", { name: /(Task name|Tên công việc)/ })).toHaveValue("Prepare client presentation");
    await addDialog.getByRole("button", { name: /(Close dialog|Đóng hộp thoại)/ }).click();
    await expect(addDialog).toBeHidden();
```

- [ ] **Step 6: Run it and watch it fail**

Run the Step 2 commands. Expected: FAIL — no button named `Back`/`Quay lại` (it is labelled `Cancel`/`Hủy`).

- [ ] **Step 7: Label the confirmation step's return button "Back"**

In `src/components/week/AddItemModal.tsx` replace:

```tsx
                  setShowConfirmRevision(false);
                }}
                disabled={submitting}
                className="min-h-10 rounded-lg px-4 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {locale === "vi" ? "Hủy" : "Cancel"}
```

with:

```tsx
                  setShowConfirmRevision(false);
                }}
                disabled={submitting}
                className="min-h-10 rounded-lg px-4 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {locale === "vi" ? "Quay lại" : "Back"}
```

The form step's own `Cancel` button (which closes the dialog) stays as it is.

- [ ] **Step 8: Run the Week test and the mocked suite**

```bash
SCR="$(cygpath -m "$TEMP")/twy-ui-workspace"
TWY_DB_PATH="$SCR/e2e.db" npx tsx scripts/seed.ts
TWY_DB_PATH="$SCR/e2e.db" PLAYWRIGHT_PORT=3317 PLAYWRIGHT_CHANNEL=msedge npx playwright test tests/e2e/coreLoop.spec.ts tests/e2e/ui-workspace.spec.ts --reporter=line
npx tsc --noEmit
```

Expected: all pass (4 coreLoop + 12 ui-workspace); no TypeScript output.

- [ ] **Step 9: Commit**

```bash
git add src/components/week/WeekBoard.tsx src/components/week/AddItemModal.tsx tests/e2e/coreLoop.spec.ts
git commit -m "fix: match week dialog and frozen-board cues to their behavior"
```

---

### Task 3: Keep Today items in place and focusable while saving

**Files:**
- Modify: `src/app/today/page.tsx` (helper above the component; state near line 15; `fetchToday` near line 37; partition lines 225–237; `isPast` props at lines 292, 315, 340)
- Modify: `src/components/today/TodayItem.tsx` (lines 21–22, main button near line 42, decrease/increase buttons near lines 84–85)
- Modify: `src/components/today/DaySection.tsx:16`
- Test: `tests/e2e/ui-workspace.spec.ts` (two tests appended inside the `describe` block), `tests/e2e/fixtures/uiWorkspace.ts` (`closedToday` option)

**Interfaces:**
- Consumes: `TodayDto` (`days[].dayOfWeek`, `days[].items[]`, `dayIndexToday`), `WeekPlanItemDto` (`id`, `done`, `plannedCount`, `tacticId`).
- Produces: module-private `unfinishedEarlierIds(today: TodayDto): ReadonlySet<number>`; fixture option `closedToday?: boolean`; `DaySectionProps` loses the unused `isPast`. `TodayItem` props are unchanged.

- [ ] **Step 1: Write the failing keep-in-place test**

Append inside `test.describe("UI workspace browser contracts", ...)` in `tests/e2e/ui-workspace.spec.ts`, after the last test:

```ts
  test("completing unfinished earlier work keeps it in place until the next visit", async ({ page }) => {
    await mockUiWorkspace(page);
    await page.goto("/today");

    const earlier = page.getByRole("region", { name: "Earlier this week" });
    await earlier.getByRole("button", { name: "Mark complete: Monday carryover" }).click();
    const undo = earlier.getByRole("button", { name: "Undo completion: Monday carryover" });
    await expect(undo).toHaveAttribute("aria-pressed", "true");

    await page.reload();
    await expect(earlier.getByText("Monday carryover")).toHaveCount(0);
    await page.locator("summary").filter({ hasText: "Rest of week" }).click();
    await expect(page.getByRole("button", { name: "Undo completion: Monday carryover" })).toBeVisible();
  });
```

- [ ] **Step 2: Run it and watch it fail**

```bash
SCR="$(cygpath -m "$TEMP")/twy-ui-workspace"
TWY_DB_PATH="$SCR/e2e.db" PLAYWRIGHT_PORT=3317 PLAYWRIGHT_CHANNEL=msedge npx playwright test tests/e2e/ui-workspace.spec.ts -g "keeps it in place" --reporter=line
```

Expected: FAIL — the `Undo completion: Monday carryover` button is never found inside "Earlier this week" (the item has moved into the collapsed "Rest of week").

- [ ] **Step 3: Pin section membership when Today loads**

In `src/app/today/page.tsx`, above `export default function TodayPage() {`, add:

```tsx
/** Earlier-day items still unfinished when Today loads; they keep their section until the next load. */
function unfinishedEarlierIds(today: TodayDto): ReadonlySet<number> {
  return new Set(
    today.days
      .filter((day) => day.dayOfWeek < today.dayIndexToday)
      .flatMap((day) => day.items)
      .filter((item) => item.done < item.plannedCount)
      .map((item) => item.id),
  );
}
```

Below `const [data, setData] = useState<TodayDto | null>(null);` add:

```tsx
  const [earlierItemIds, setEarlierItemIds] = useState<ReadonlySet<number>>(() => new Set());
```

In `fetchToday` replace:

```tsx
      const res = await apiFetch<TodayDto>("/api/today");
      setData(res);
```

with:

```tsx
      const res = await apiFetch<TodayDto>("/api/today");
      setEarlierItemIds(unfinishedEarlierIds(res));
      setData(res);
```

Replace the partition:

```tsx
  const earlierDays = days
    .filter((day) => day.dayOfWeek < dayIndexToday)
    .map((day) => ({ ...day, items: day.items.filter((item) => item.done < item.plannedCount) }))
    .filter((day) => day.items.length > 0);
  const restDays = days
    .filter((day) => day.dayOfWeek !== dayIndexToday)
    .map((day) => ({
      ...day,
      items: day.dayOfWeek < dayIndexToday
        ? day.items.filter((item) => item.done >= item.plannedCount)
        : day.items,
    }))
    .filter((day) => day.dayOfWeek > dayIndexToday || day.items.length > 0);
```

with:

```tsx
  const earlierDays = days
    .filter((day) => day.dayOfWeek < dayIndexToday)
    .map((day) => ({ ...day, items: day.items.filter((item) => earlierItemIds.has(item.id)) }))
    .filter((day) => day.items.length > 0);
  const restDays = days
    .filter((day) => day.dayOfWeek !== dayIndexToday)
    .map((day) => ({
      ...day,
      items: day.dayOfWeek < dayIndexToday
        ? day.items.filter((item) => !earlierItemIds.has(item.id))
        : day.items,
    }))
    .filter((day) => day.dayOfWeek > dayIndexToday || day.items.length > 0);
```

Each item still appears exactly once: earlier-day items are split by one set, so membership is complementary.

- [ ] **Step 4: Run it and watch it pass**

Run the Step 2 command. Expected: PASS.

- [ ] **Step 5: Write the failing focus assertion**

In the new test, directly after `await expect(undo).toHaveAttribute("aria-pressed", "true");` add:

```ts
    await expect(undo).toBeFocused();
```

- [ ] **Step 6: Run it and watch it fail**

Run the Step 2 command. Expected: FAIL — `toBeFocused` fails because focus is on `<body>` (Edge drops focus when the pressed button becomes `disabled` during the save).

- [ ] **Step 7: Keep completion controls focusable during a save**

In `src/components/today/TodayItem.tsx` replace:

```tsx
  const isExtraTask = item.tacticId === null;
  const controlsDisabled = isClosed || isMutating || isExtraTask;
```

with:

```tsx
  const isExtraTask = item.tacticId === null;
  const isLocked = isClosed || isExtraTask;
  const controlsDisabled = isLocked || isMutating;
```

On the main completion button replace:

```tsx
          aria-pressed={isComplete}
          disabled={controlsDisabled}
          onClick={handleToggle}
```

with:

```tsx
          aria-pressed={isComplete}
          disabled={isLocked}
          aria-disabled={isMutating || undefined}
          onClick={handleToggle}
```

and in the same button's `className` replace `disabled:opacity-50` with `disabled:opacity-50 aria-disabled:cursor-wait aria-disabled:opacity-50` (that class occurs only on this button).

On the decrease button replace `disabled={controlsDisabled || item.done <= 0} onClick={() => onDecrement(item)}` with:

```tsx
disabled={isLocked || item.done <= 0} aria-disabled={isMutating || undefined} onClick={() => { if (!controlsDisabled) onDecrement(item); }}
```

On the increase button replace `disabled={controlsDisabled || item.done >= item.plannedCount} onClick={() => onIncrement(item)}` with:

```tsx
disabled={isLocked || item.done >= item.plannedCount} aria-disabled={isMutating || undefined} onClick={() => { if (!controlsDisabled) onIncrement(item); }}
```

In both of those buttons' `className`, replace `disabled:opacity-30` with `disabled:opacity-30 aria-disabled:cursor-wait aria-disabled:opacity-30`.

`handleToggle` already returns early when `controlsDisabled`, and the page handlers guard with `mutationPendingRef`, so duplicate input stays blocked.

- [ ] **Step 8: Run the focus test and the existing completion test**

```bash
SCR="$(cygpath -m "$TEMP")/twy-ui-workspace"
TWY_DB_PATH="$SCR/e2e.db" PLAYWRIGHT_PORT=3317 PLAYWRIGHT_CHANNEL=msedge npx playwright test tests/e2e/ui-workspace.spec.ts -g "keeps it in place|Today completion exposes state" --reporter=line
```

Expected: 2 passed. (`toBeDisabled()` in the existing test accepts `aria-disabled="true"`.)

- [ ] **Step 9: Add the closed-Today fixture option**

In `tests/e2e/fixtures/uiWorkspace.ts`, add to `FixtureOptions` (after `noActiveToday?: boolean;`):

```ts
  closedToday?: boolean;
```

In the `/api/today` handler replace:

```ts
        planStatus: "draft",
        projectedScore: { week: 3, due: 4, completed: 1, scorePct: 25, band: "REVISE_PLAN", closed: false, projected: true },
```

with:

```ts
        planStatus: options.closedToday ? "closed" : "draft",
        projectedScore: { week: 3, due: 4, completed: 1, scorePct: 25, band: "REVISE_PLAN", closed: Boolean(options.closedToday), projected: !options.closedToday },
```

- [ ] **Step 10: Pin the closed-week Today behaviour**

Append inside the same `describe` block:

```ts
  test("a closed week on Today shows the final score and locks completion", async ({ page }) => {
    await mockUiWorkspace(page, { closedToday: true });
    await page.goto("/today");

    await expect(page.getByText("Week 3 is closed — the score is final.")).toBeVisible();
    await expect(page.getByRole("region", { name: "Final weekly score" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Weekly progress" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Mark complete: Wednesday priority" })).toBeDisabled();
  });
```

- [ ] **Step 11: Run it**

```bash
SCR="$(cygpath -m "$TEMP")/twy-ui-workspace"
TWY_DB_PATH="$SCR/e2e.db" PLAYWRIGHT_PORT=3317 PLAYWRIGHT_CHANNEL=msedge npx playwright test tests/e2e/ui-workspace.spec.ts -g "closed week on Today" --reporter=line
```

Expected: PASS — this pins existing behaviour. If it fails, stop and use superpowers:systematic-debugging; a failure here is a real closed-week defect.

- [ ] **Step 12: Remove the unused `isPast` prop**

In `src/components/today/DaySection.tsx` delete the line `  isPast: boolean;` from `DaySectionProps`. In `src/app/today/page.tsx` delete the three prop lines `isPast={false}`, `isPast`, and `isPast={day.dayOfWeek < dayIndexToday}`.

- [ ] **Step 13: Verify Today end to end**

```bash
SCR="$(cygpath -m "$TEMP")/twy-ui-workspace"
npx tsc --noEmit
TWY_DB_PATH="$SCR/e2e.db" npx tsx scripts/seed.ts
TWY_DB_PATH="$SCR/e2e.db" PLAYWRIGHT_PORT=3317 PLAYWRIGHT_CHANNEL=msedge npx playwright test tests/e2e/ui-workspace.spec.ts tests/e2e/coreLoop.spec.ts --reporter=line
```

Expected: no TypeScript output; 18 passed (14 ui-workspace + 4 coreLoop).

- [ ] **Step 14: Commit**

```bash
git add src/app/today/page.tsx src/components/today/TodayItem.tsx src/components/today/DaySection.tsx tests/e2e/ui-workspace.spec.ts tests/e2e/fixtures/uiWorkspace.ts
git commit -m "fix: keep Today items in place and focusable while saving"
```

---

### Task 4: Real-data visual walkthrough

**Files:**
- Create (gitignored, never committed): `ui-shots/walkthrough.mjs`; output in `ui-shots/walkthrough/`
- Modify: this plan — add a `## Walkthrough findings` section at the end

**Interfaces:**
- Consumes: `PATCH /api/settings` with `{ locale?: "en" | "vi", theme?: "system" | "light" | "dark" }`.
- Produces: screenshots, a per-page overflow table, and the findings list consumed by Task 5.

- [ ] **Step 1: Seed a walkthrough database and start an isolated dev server**

```bash
netstat -ano | grep -E ":3318 .*LISTENING" && echo "STOP: port 3318 is busy" || echo "port 3318 free"
SCR="$(cygpath -m "$TEMP")/twy-ui-workspace"; mkdir -p "$SCR"
TWY_DB_PATH="$SCR/walkthrough.db" npx tsx scripts/seed.ts
```

Then start the server as a background process (keep it running for Steps 2–4):

```bash
SCR="$(cygpath -m "$TEMP")/twy-ui-workspace"
TWY_DB_PATH="$SCR/walkthrough.db" npx next dev -p 3318
```

- [ ] **Step 2: Write the screenshot script**

Create `ui-shots/walkthrough.mjs`:

```js
// Calm workspace walkthrough: screenshots plus a horizontal-overflow check.
// Run only against a dev server that uses a throwaway TWY_DB_PATH (never data/app.db).
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3318";
const OUT = "ui-shots/walkthrough";
mkdirSync(OUT, { recursive: true });

const viewports = { phone: { width: 390, height: 844 }, desktop: { width: 1440, height: 900 } };
const report = [];

async function setLocale(locale) {
  const res = await fetch(`${BASE}/api/settings`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ locale, theme: "system" }),
  });
  if (!res.ok) throw new Error(`PATCH /api/settings failed: ${res.status}`);
}

async function shoot(page, name) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  report.push({ name, overflow });
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
}

const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge" });
for (const locale of ["vi", "en"]) {
  await setLocale(locale);
  for (const colorScheme of ["light", "dark"]) {
    for (const [size, viewport] of Object.entries(viewports)) {
      const context = await browser.newContext({ viewport, colorScheme });
      const page = await context.newPage();
      page.setDefaultTimeout(60_000);
      const tag = `${locale}-${colorScheme}-${size}`;
      const schedule = page.getByRole("region", { name: /Weekly schedule|Lịch tuần/ });

      await page.goto(`${BASE}/today`);
      await page.getByRole("heading", { level: 1 }).first().waitFor();
      await shoot(page, `today-${tag}`);

      await page.goto(`${BASE}/week?week=1`);
      await schedule.waitFor();
      await shoot(page, `week1-closed-${tag}`);

      await page.goto(`${BASE}/week?week=2`);
      await schedule.waitFor();
      await shoot(page, `week2-${tag}`);

      await page.getByRole("button", { name: /^(Add task|Thêm công việc)$/ }).click();
      await page.getByRole("dialog").waitFor();
      await shoot(page, `add-dialog-${tag}`);

      await page.goto(`${BASE}/week?week=2&close=1`);
      await page.getByRole("dialog").waitFor();
      await shoot(page, `close-dialog-${tag}`);

      if (size === "phone") {
        await page.goto(`${BASE}/today`);
        await page.getByRole("button", { name: /^(Menu|Trình đơn)$/ }).click();
        await page.getByRole("dialog").waitFor();
        await shoot(page, `menu-${tag}`);
      }
      await context.close();
    }
  }
}
await browser.close();

console.table(report);
const overflowing = report.filter((entry) => entry.overflow > 0);
if (overflowing.length > 0) {
  console.error("Pages wider than the viewport:", overflowing.map((entry) => entry.name).join(", "));
  process.exitCode = 1;
}
```

- [ ] **Step 3: Run it**

```bash
node ui-shots/walkthrough.mjs
```

Expected: a table of 44 rows, every `overflow` ≤ 0, exit code 0. Any row above 0 is a finding.

- [ ] **Step 4: Inspect the screenshots**

Open at least: all six `*-vi-light-phone.png`, `today-vi-dark-phone.png`, `week2-vi-dark-phone.png`, `close-dialog-vi-dark-phone.png`, `today-en-light-desktop.png`, `week2-en-light-desktop.png`. Check:

- Today order: Today's work → Earlier this week → Rest of week (collapsed) → Weekly progress → principle.
- Week grid: 1 column at 390px, 3 columns at 1440px; long labels wrap; nothing clipped; no inner scrollbars.
- Closed week 1: final-score banner, no move hint, no edit controls.
- Dialogs fit the viewport with internal scrolling; the close button is visible.
- One language per screen (user-entered labels excepted); dark-mode text readable; teal used only for navigation, current day and progress.

- [ ] **Step 5: Record findings and stop the server**

Append `## Walkthrough findings` to this plan: one bullet per issue (screenshot name, what is wrong, expected), or `- None.` Then stop the dev server:

```bash
pid=$(netstat -ano | grep -E ":3318 .*LISTENING" | awk '{print $NF}' | head -1); [ -n "$pid" ] && taskkill //PID "$pid" //T //F
```

---

### Task 5: Independent review and fixes

**Files:**
- Modify: only files already changed in `398d69a..HEAD`, as each accepted finding requires
- Modify: this plan — add a `## Review triage` section at the end

**Interfaces:**
- Consumes: the commits from Tasks 1–3 and the walkthrough findings.
- Produces: one `fix:` commit per accepted finding (or per file group), each with a regression test where the behaviour is testable.

- [ ] **Step 1: Load superpowers:requesting-code-review and dispatch one reviewer**

Use the most capable model, read-only, with this brief:

> Review the Calm UI Workspace batch on branch `codex/ui-workspace` in `D:/Data/Codes/12-weeks-planning-reliability-repairs`. Diff: `git diff 398d69a..HEAD -- src tests playwright.config.ts`. Spec: `docs/superpowers/specs/2026-10-03-ui-workspace-design.md`. Plans: `docs/superpowers/plans/2026-10-03-ui-workspace.md` and `docs/superpowers/plans/2026-10-03-ui-workspace-completion.md` (Review Focus, Walkthrough findings). Read-only: do not edit files, run git writes, seed, or start servers. Look for bugs a user would hit: races (week switching, pending saves, dialog reset), focus and keyboard behaviour, data loss on failure, EN/VI gaps in the changed files, overflow at 390px, drift from `src/lib/contracts.ts`. Evaluate these known candidates: (a) the "Rest of week" `<summary role="button">` exposes no expanded state; (b) `PlanItemCard` and dialog submit buttons use native `disabled` while saving, and Edge drops focus from a focused control that becomes disabled; (c) the Week closed banner uses inline copy while Today uses the `today.week_closed_title` dictionary key. Out of scope, do not report: occurrence scheduling, persisting extra-task completion, moving inline copy into `src/lib/i18n.ts`, screens other than Today, Week, AppShell, the two dialogs and NextRitualCard. Report at most 10 findings, most severe first, each with file:line, the user-visible failure, a suggested fix and your confidence.

- [ ] **Step 2: Triage with superpowers:receiving-code-review**

Verify each finding against the code before accepting it. Record every decision in `## Review triage` (accepted or rejected, with the reason).

- [ ] **Step 3: Fix each accepted finding test-first**

For each one: write a failing test in `tests/e2e/ui-workspace.spec.ts` (mocked) or the relevant legacy spec (real data), run it and see it fail, make the minimal fix, run it and see it pass, then commit with `git commit -m "fix: <finding in a few words>"`. Pure copy or styling fixes with nothing behavioural to assert may skip the test; say so in the triage entry.

- [ ] **Step 4: Re-run the mocked suite after any shared-component fix**

If `ModalDialog.tsx`, `AppShell.tsx` or `globals.css` changed:

```bash
SCR="$(cygpath -m "$TEMP")/twy-ui-workspace"
TWY_DB_PATH="$SCR/e2e.db" PLAYWRIGHT_PORT=3317 PLAYWRIGHT_CHANNEL=msedge npx playwright test tests/e2e/ui-workspace.spec.ts --reporter=line
```

Expected: all pass.

---

### Task 6: Final verification, docs and delivery

**Files:**
- Modify: `docs/superpowers/plans/2026-10-03-ui-workspace.md` (tick checkboxes, add delivery notes)
- Modify: `docs/product/2026-10-03-coding-task-queue.md` (rows R4, R5, R6, U1, U2, U3; new section)

**Interfaces:**
- Consumes: everything above.
- Produces: verified branch `codex/ui-workspace` and a delivery decision from the owner.

- [ ] **Step 1: Run the full verification on fresh state**

```bash
SCR="$(cygpath -m "$TEMP")/twy-ui-workspace"
npx tsc --noEmit
TWY_DB_PATH="$SCR/vitest.db" npx vitest run
TWY_DB_PATH="$SCR/e2e.db" npx tsx scripts/seed.ts
TWY_DB_PATH="$SCR/e2e.db" PLAYWRIGHT_PORT=3317 PLAYWRIGHT_CHANNEL=msedge npx playwright test --reporter=line
TWY_DB_PATH="$SCR/build.db" npx next build
```

Expected: no TypeScript output; `160 passed`; Playwright all passed (29 plus any tests added in Task 5); build succeeds. Use superpowers:verification-before-completion — report the actual numbers.

- [ ] **Step 2: Tick the original plan and add delivery notes**

```bash
sed -i 's/^- \[ \]/- [x]/' docs/superpowers/plans/2026-10-03-ui-workspace.md
git log --oneline 398d69a..HEAD
```

Append to `docs/superpowers/plans/2026-10-03-ui-workspace.md`:

```markdown
## Delivery notes

Completed through `docs/superpowers/plans/2026-10-03-ui-workspace-completion.md`. Verification on <date of Step 1>: TypeScript clean; <n> unit tests passed; <n> browser tests passed (Edge, isolated seeded DB); production build passed with an isolated DB. Commits: <paste the `git log --oneline 398d69a..HEAD` output>.
```

Fill each `<…>` with the values from Step 1 and the log output above.

- [ ] **Step 3: Update the coding queue**

In `docs/product/2026-10-03-coding-task-queue.md` set the last column of these rows to:

| Row | New status |
|---|---|
| R4 | Implemented and verified — UI workspace batch |
| R5 | Implemented and verified — UI workspace batch |
| R6 | Implemented and verified — UI workspace batch (UI sends `confirmPlanRevision: true`; persistence of extra-task completion remains R7) |
| U1 | Implemented and verified — UI workspace batch |
| U2 | Partial — Today focus and earlier work delivered on count bundles; per-occurrence scheduling still needs D4 |
| U3 | Partial — readable 1/2/3-column grid delivered; per-occurrence placement still needs D4 |

Then append a `## UI workspace batch delivered` section: the commit list from Step 2, the verification numbers from Step 1, and the remaining limitations listed under "After this batch" below.

- [ ] **Step 4: Commit the docs**

```bash
git add docs/superpowers/plans/2026-10-03-ui-workspace.md docs/product/2026-10-03-coding-task-queue.md docs/superpowers/plans/2026-10-03-ui-workspace-completion.md
git commit -m "docs: record verified ui workspace delivery"
```

- [ ] **Step 5: Deliver with superpowers:finishing-a-development-branch**

Present the options and wait for the owner's choice. Facts for that conversation: local `main` (f53e36d) does not yet contain the reliability batch, so merging `codex/ui-workspace` brings both batches; the owner's active checkout `D:/Data/Codes/12-weeks-planning` is on `codex/reliability-repairs` (ece2e42); `origin/main` is at 2aa1854; this batch has no migrations, so the owner's `data/app.db` is unaffected by delivery. Do not push or merge without explicit approval.

---

## After this batch (not part of this plan)

1. Review wizard step labels are hardcoded Vietnamese, so English mode shows Vietnamese (`src/components/review/StepIndicator.tsx`, `STEPS`).
2. Extend the calm workspace to the remaining screens, worst first: Measures (Vietnamese-only strings, custom popover, small icon buttons), Plan (slate palette, custom `GoalModal`), Review (32px step buttons), WAM (Vietnamese-only), Model Week (hover-only actions on touch). Move their dialogs onto `ModalDialog`.
3. Move inline `locale === "vi" ? … : …` copy into `src/lib/i18n.ts`, and remove the now-unused `score.projected_score` key.
4. Roadmap items this UI pass depends on: R7 (persist extra-task completion), D1–D4 (separately schedulable occurrences, needed to finish U2/U3), and the DTO/rules half of W1 (progress versus final score).
