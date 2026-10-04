import { test, expect, type Page, type Route } from "@playwright/test";
import type { TodayDto, WeekPlanDetailDto, WeekPlanItemDto } from "../../src/lib/contracts";
import { mockUiWorkspace } from "./fixtures/uiWorkspace";

const markCompleteName = (label: string) => new RegExp(`^(Mark complete|Đánh dấu hoàn thành): ${label}$`);
const undoCompletionName = (label: string) => new RegExp(`^(Undo completion|Hủy hoàn thành): ${label}$`);

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
    score: { week: 3, due: 4, completed: 1, scorePct: 25, band: "REVISE_PLAN", closed: false, projected: true },
  };
}

async function fulfillJson(route: Route, json: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(json) });
}

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

    try {
      await page.goto("/today");
      const card = page.locator("article").filter({ hasText: label });
      await expect(card.getByText(/^(Extra task · unscored|Việc thêm · không tính điểm)$/)).toBeVisible();

      const mark = page.getByRole("button", { name: markCompleteName(label) });
      await expect(mark).toBeEnabled();
      const completedResponsePromise = page.waitForResponse((response) =>
        response.request().method() === "PATCH" && new URL(response.url()).pathname === `/api/week-plans/${planId}/items/${extra!.id}`,
      );
      await mark.click();
      const completedResponse = await completedResponsePromise;
      expect(completedResponse.ok()).toBe(true);
      const completed = await completedResponse.json() as WeekPlanDetailDto;
      expect(completed.items.find((item) => item.id === extra!.id)?.done).toBe(1);
      expect(completed.score && { due: completed.score.due, completed: completed.score.completed, scorePct: completed.score.scorePct }).toEqual(scoreBefore);

      await page.reload();
      const undo = page.getByRole("button", { name: undoCompletionName(label) });
      await expect(undo).toHaveAttribute("aria-pressed", "true");
      const undoneResponsePromise = page.waitForResponse((response) =>
        response.request().method() === "PATCH" && new URL(response.url()).pathname === `/api/week-plans/${planId}/items/${extra!.id}`,
      );
      await undo.click();
      const undoneResponse = await undoneResponsePromise;
      expect(undoneResponse.ok()).toBe(true);
      const undone = await undoneResponse.json() as WeekPlanDetailDto;
      expect(undone.items.find((item) => item.id === extra!.id)?.done).toBe(0);
      expect(undone.score && { due: undone.score.due, completed: undone.score.completed, scorePct: undone.score.scorePct }).toEqual(scoreBefore);

      await page.reload();
      await expect(page.getByRole("button", { name: markCompleteName(label) })).toHaveAttribute("aria-pressed", "false");
    } finally {
      if (extra) await request.delete(`/api/week-plans/${planId}/items/${extra.id}`);
    }
  });

  test("a gated extra write blocks competing input, rolls back on failure, and retries with focus intact", async ({ page }) => {
    const fixture = await mockUiWorkspace(page);
    let attempt = 0;
    let releaseFailure: () => void = () => {};
    const failureGate = new Promise<void>((resolve) => { releaseFailure = resolve; });

    await page.route("**/api/week-plans/33/items/305", async (route) => {
      if (route.request().method() !== "PATCH") return route.fallback();
      attempt += 1;
      if (attempt === 1) {
        await failureGate;
        return fulfillJson(route, { error: "Could not save extra completion." }, 500);
      }
      return fulfillJson(route, mockedDetail(fixture.items, 1));
    });

    await page.goto("/today");
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

    releaseFailure();
    await expect(extra).toHaveAttribute("aria-pressed", "false");
    await expect(extra).toBeFocused();
    await expect(page.getByRole("alert").filter({ hasText: "Could not save extra completion." })).toBeVisible();

    await page.keyboard.press("Enter");
    const savedUndo = page.getByRole("button", { name: "Undo completion: Admin follow-up" });
    await expect(savedUndo).toHaveAttribute("aria-pressed", "true");
    await expect(savedUndo).toBeFocused();
    expect(attempt).toBe(2);
  });

  test("a closed week keeps an extra task read-only", async ({ page }) => {
    await mockUiWorkspace(page, { closedToday: true });
    await page.goto("/today");

    await expect(page.getByText("Extra task · unscored", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mark complete: Admin follow-up" })).toBeDisabled();
  });
});
