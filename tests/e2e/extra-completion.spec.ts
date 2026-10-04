import { test, expect, type Page, type Response, type Route } from "@playwright/test";
import type { TodayDto, WeekPlanDetailDto, WeekPlanItemDto, WeekScoreDto } from "../../src/lib/contracts";
import { mockUiWorkspace } from "./fixtures/uiWorkspace";

const markCompleteName = (label: string) => new RegExp(`^(Mark complete|Đánh dấu hoàn thành): ${label}$`);
const undoCompletionName = (label: string) => new RegExp(`^(Undo completion|Hủy hoàn thành): ${label}$`);

type ProgressScore = Pick<WeekScoreDto, "completed" | "due" | "scorePct">;

// The fixture's /api/today projects 1 of 4 (25%) and its /api/completions answers 2 of 4 (50%). The mocked PATCH
// answers a third value, so 3 of 4 (75%) can only be on screen if the page adopted the PATCH response's own score.
const LOADED_SCORE: ProgressScore = { completed: 1, due: 4, scorePct: 25 };
const PATCH_SCORE: WeekScoreDto = { week: 3, due: 4, completed: 3, scorePct: 75, band: "AT_RISK", closed: false, projected: true };

function mockedDetail(items: WeekPlanItemDto[], extraDone: number): WeekPlanDetailDto {
  return {
    plan: {
      id: 33,
      cycleId: 1,
      weekNumber: 3,
      status: "draft",
      closedAt: null,
      reflection: null,
      createdAt: "2026-09-01T00:00:00.000Z",
    },
    weekStart: "2026-09-28",
    weekEnd: "2026-10-04",
    items: items.map((item) => item.id === 305 ? { ...item, done: extraDone } : item),
    score: PATCH_SCORE,
  };
}

async function fulfillJson(route: Route, json: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(json) });
}

// Weekly progress as the user reads it. Accepts both locales: the isolated DB is seeded as vi, the fixture serves en.
async function expectWeeklyProgress(page: Page, score: ProgressScore) {
  const progress = page.getByRole("region", { name: /^(Weekly progress|Tiến độ tuần)$/ });
  const planned = `${score.completed} of ${score.due} planned actions completed`;
  const plannedVi = `${score.completed}/${score.due} lượt cần làm trong tuần đã hoàn thành`;
  await expect(progress.getByText(new RegExp(`^(${planned}|${plannedVi})$`))).toBeVisible();
  // first(): the 0% / 100% axis labels follow the value in DOM order, so a score of 0 or 100 still resolves to the value.
  await expect(progress.getByText(`${score.scorePct}%`, { exact: true }).first()).toBeVisible();
}

// Toasts are role=alert. Empty live regions (such as the framework's route announcer) are not toasts.
// Read them once with allTextContents(), after the settled state is on screen: a retrying toHaveCount(0) would let a
// stray toast "pass" by auto-hiding after 4s.
const toasts = (page: Page) => page.getByRole("alert").filter({ hasText: /\S/ });

test.describe("Today extra-task completion", () => {
  test("extra completion and undo persist without changing the weekly score", async ({ page, request }) => {
    const todayResponse = await request.get("/api/today");
    expect(todayResponse.ok()).toBe(true);
    const today = await todayResponse.json() as TodayDto;
    const planId = today.days.flatMap((day) => day.items)[0]?.weekPlanId;
    expect(planId).toBeDefined();

    const label = `C04 persisted extra ${Date.now()}`;
    const createResponse = await request.post(`/api/week-plans/${planId}/items`, {
      data: { label, dayOfWeek: today.dayIndexToday, confirmPlanRevision: true },
    });
    expect(createResponse.ok()).toBe(true);
    const created = await createResponse.json() as WeekPlanDetailDto;
    const extra = created.items.find((item) => item.label === label);
    expect(extra).toBeDefined();
    const scoreBefore = created.score && { due: created.score.due, completed: created.score.completed, scorePct: created.score.scorePct };

    const itemPatchPath = `/api/week-plans/${planId}/items/${extra!.id}`;
    const isItemPatch = (response: Response) => response.request().method() === "PATCH" && new URL(response.url()).pathname === itemPatchPath;
    const completionRequests: string[] = [];
    page.on("request", (pageRequest) => {
      if (new URL(pageRequest.url()).pathname === "/api/completions") completionRequests.push(`${pageRequest.method()} ${pageRequest.url()}`);
    });

    try {
      await page.goto("/today");
      const card = page.locator("article").filter({ hasText: label });
      await expect(card.getByText(/^(Extra task · unscored|Việc thêm · không tính điểm)$/)).toBeVisible();

      const mark = page.getByRole("button", { name: markCompleteName(label) });
      const undo = page.getByRole("button", { name: undoCompletionName(label) });
      await expect(mark).toBeEnabled();
      const completedResponsePromise = page.waitForResponse(isItemPatch);
      await mark.click();
      const completedResponse = await completedResponsePromise;
      expect(completedResponse.request().postDataJSON()).toEqual({ done: 1 });
      expect(completedResponse.ok()).toBe(true);
      const completed = await completedResponse.json() as WeekPlanDetailDto;
      expect(completed.items.find((item) => item.id === extra!.id)?.done).toBe(1);
      expect(completed.score && { due: completed.score.due, completed: completed.score.completed, scorePct: completed.score.scorePct }).toEqual(scoreBefore);

      // Settled before any reload: saved and interactive again (a rollback would swap the control back to "mark"),
      // showing the canonical, unchanged score, with no toast.
      await expect(undo).toHaveAttribute("aria-pressed", "true");
      await expect(undo).toBeEnabled();
      await expectWeeklyProgress(page, completed.score!);
      expect(await toasts(page).allTextContents()).toEqual([]);

      await page.reload();
      await expect(undo).toHaveAttribute("aria-pressed", "true");
      const undoneResponsePromise = page.waitForResponse(isItemPatch);
      await undo.click();
      const undoneResponse = await undoneResponsePromise;
      expect(undoneResponse.request().postDataJSON()).toEqual({ done: 0 });
      expect(undoneResponse.ok()).toBe(true);
      const undone = await undoneResponse.json() as WeekPlanDetailDto;
      expect(undone.items.find((item) => item.id === extra!.id)?.done).toBe(0);
      expect(undone.score && { due: undone.score.due, completed: undone.score.completed, scorePct: undone.score.scorePct }).toEqual(scoreBefore);

      await expect(mark).toHaveAttribute("aria-pressed", "false");
      await expect(mark).toBeEnabled();
      await expectWeeklyProgress(page, undone.score!);
      expect(await toasts(page).allTextContents()).toEqual([]);

      await page.reload();
      await expect(mark).toHaveAttribute("aria-pressed", "false");

      // Extra tasks persist through the item PATCH only; the tactic completion endpoint is never involved.
      expect(completionRequests).toEqual([]);
    } finally {
      if (extra) await request.delete(`/api/week-plans/${planId}/items/${extra.id}`);
    }
  });

  test("a gated extra write blocks competing input, rolls back on failure, and retries with focus intact", async ({ page }) => {
    const fixture = await mockUiWorkspace(page);
    const patchBodies: unknown[] = [];
    let releaseFailure: () => void = () => {};
    const failureGate = new Promise<void>((resolve) => { releaseFailure = resolve; });
    const isExtraPatch = (response: Response) => response.request().method() === "PATCH" && new URL(response.url()).pathname === "/api/week-plans/33/items/305";

    await page.route("**/api/week-plans/33/items/305", async (route) => {
      if (route.request().method() !== "PATCH") return route.fallback();
      patchBodies.push(route.request().postDataJSON());
      if (patchBodies.length === 1) {
        await failureGate;
        return fulfillJson(route, { error: "Could not save extra completion." }, 500);
      }
      return fulfillJson(route, mockedDetail(fixture.items, 1));
    });

    await page.goto("/today");
    await expectWeeklyProgress(page, LOADED_SCORE);
    const extra = page.getByRole("button", { name: "Mark complete: Admin follow-up" });
    await extra.focus();
    await page.keyboard.press("Enter");

    const optimisticUndo = page.getByRole("button", { name: "Undo completion: Admin follow-up" });
    await expect(optimisticUndo).toHaveAttribute("aria-disabled", "true");
    await expect(optimisticUndo).toBeFocused();
    const competing = page.getByRole("button", { name: "Mark complete: Wednesday priority" });
    await expect(competing).toHaveAttribute("aria-disabled", "true");
    await competing.evaluate((button: HTMLButtonElement) => button.click());
    expect(fixture.requests.filter((request) => request.pathname === "/api/completions")).toHaveLength(0);
    // Exactly one write is in flight, and it asks for the next count.
    await expect.poll(() => patchBodies).toEqual([{ done: 1 }]);

    const failedResponsePromise = page.waitForResponse(isExtraPatch);
    releaseFailure();
    expect((await failedResponsePromise).status()).toBe(500);
    await expect(extra).toHaveAttribute("aria-pressed", "false");
    await expect(extra).toBeFocused();
    await expect(page.getByRole("alert").filter({ hasText: "Could not save extra completion." })).toBeVisible();
    await expectWeeklyProgress(page, LOADED_SCORE);

    const retryResponsePromise = page.waitForResponse(isExtraPatch);
    await page.keyboard.press("Enter");
    expect((await retryResponsePromise).status()).toBe(200);

    // Settled: the success branch ran to the end. The 3-of-4 sentinel only exists in the PATCH response, so it proves
    // the canonical score was adopted; it also rules out a rollback, which would restore 1 of 4 and a "mark" control.
    await expectWeeklyProgress(page, PATCH_SCORE);
    const savedUndo = page.getByRole("button", { name: "Undo completion: Admin follow-up" });
    await expect(savedUndo).toHaveAttribute("aria-pressed", "true");
    await expect(savedUndo).toBeEnabled();
    await expect(savedUndo).toBeFocused();
    // The first attempt's failure toast may still be showing. The successful retry must not add another one.
    expect(await toasts(page).filter({ hasNotText: "Could not save extra completion." }).allTextContents()).toEqual([]);

    expect(patchBodies).toEqual([{ done: 1 }, { done: 1 }]);
    expect(fixture.requests.filter((request) => request.pathname === "/api/completions")).toEqual([]);
  });

  test("a closed week keeps an extra task read-only", async ({ page }) => {
    await mockUiWorkspace(page, { closedToday: true });
    await page.goto("/today");

    await expect(page.getByText("Extra task · unscored", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mark complete: Admin follow-up" })).toBeDisabled();
  });
});
