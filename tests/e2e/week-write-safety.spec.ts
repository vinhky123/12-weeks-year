import { expect, test, type Route } from "@playwright/test";
import type { WeekPlanDetailDto, WeekPlanItemDto } from "../../src/lib/contracts";
import { mockUiWorkspace } from "./fixtures/uiWorkspace";

function weekDetail(items: WeekPlanItemDto[], status: "draft" | "closed" = "draft"): WeekPlanDetailDto {
  return {
    plan: {
      id: 33,
      cycleId: 1,
      weekNumber: 3,
      status,
      closedAt: status === "closed" ? "2026-10-01T08:00:00.000Z" : null,
      reflection: null,
      createdAt: "2026-09-01T00:00:00.000Z",
    },
    weekStart: "2026-09-28",
    weekEnd: "2026-10-04",
    items,
    score: {
      week: 3,
      due: 4,
      completed: 1,
      scorePct: 25,
      band: "REVISE_PLAN",
      closed: status === "closed",
      projected: status !== "closed",
    },
  };
}

function patchItem(items: WeekPlanItemDto[], route: Route): WeekPlanItemDto[] {
  const id = Number(new URL(route.request().url()).pathname.split("/").at(-1));
  const body = JSON.parse(route.request().postData() ?? "{}") as Partial<WeekPlanItemDto>;
  return items.map((item) => item.id === id ? { ...item, ...body } : item);
}

test.describe("Week write safety", () => {
  test("serializes sibling card writes and releases the page lock after failure", async ({ page }) => {
    const fixture = await mockUiWorkspace(page);
    let items = fixture.items.map((item) => ({ ...item }));
    let firstRoute: Route | null = null;
    let patchCount = 0;

    await page.route("**/api/week-plans/33/items/*", async (route) => {
      if (route.request().method() !== "PATCH") return route.fallback();
      patchCount += 1;
      if (patchCount === 1) {
        firstRoute = route;
        return;
      }
      items = patchItem(items, route);
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(weekDetail(items)) });
    });

    await page.goto("/week?week=3");
    const siblingMove = page.getByRole("combobox", { name: "Move Wednesday priority" });
    await expect(siblingMove).toBeVisible();

    await page.evaluate(() => {
      const first = document.querySelector<HTMLSelectElement>("#move-plan-item-301")!;
      const sibling = document.querySelector<HTMLSelectElement>("#move-plan-item-303")!;
      first.value = "1";
      first.dispatchEvent(new Event("change", { bubbles: true }));
      sibling.value = "3";
      sibling.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await expect.poll(() => patchCount).toBe(1);
    await expect(siblingMove).toHaveAttribute("aria-disabled", "true");
    await expect(page.getByRole("button", { name: "Add task", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Close week 3", exact: true })).toBeDisabled();

    await page.getByRole("button", { name: "Next week", exact: true }).click();
    const weekFourMove = page.getByRole("combobox", { name: "Move Week four delayed" });
    await expect(weekFourMove).toHaveAttribute("aria-disabled", "true");
    await expect(page.getByRole("button", { name: "Add task", exact: true })).toBeDisabled();

    await firstRoute!.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Could not move the task." }),
    });
    await expect(weekFourMove).not.toHaveAttribute("aria-disabled", "true");
    await expect(page.getByRole("button", { name: "Add task", exact: true })).toBeEnabled();
    await expect(page.getByText("Monday carryover", { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Previous week", exact: true }).click();
    await expect(siblingMove).toBeVisible();
    await siblingMove.selectOption("3");
    await expect.poll(() => patchCount).toBe(2);
  });

  test("a pending close blocks card writes and the closed response cannot leave an editable board", async ({ page }) => {
    const fixture = await mockUiWorkspace(page, { manualClose: true });
    await page.goto("/week?week=3");

    await page.getByRole("button", { name: "Close week 3", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Close week 3" });
    await dialog.getByRole("button", { name: "Continue", exact: true }).click();
    await dialog.getByRole("button", { name: "Continue", exact: true }).click();
    await dialog.getByRole("button", { name: "Close week 3", exact: true }).click();

    await expect.poll(() => fixture.requests.filter((request) => request.pathname === "/api/week-plans/33/close").length).toBe(1);
    const move = page.getByRole("combobox", { name: "Move Wednesday priority" });
    await expect(move).toHaveAttribute("aria-disabled", "true");
    await move.evaluate((select) => {
      const element = select as HTMLSelectElement;
      element.value = "3";
      element.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(fixture.requests.filter((request) => request.pathname === "/api/week-plans/33/items/303")).toHaveLength(0);

    fixture.resolveClose();
    await expect(dialog.getByRole("heading", { name: "Week 3 is closed", exact: true })).toBeVisible();
    await expect(page.getByText("closed", { exact: true })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Move Wednesday priority" })).toHaveCount(0);
  });

  test("close week measures and submits active goals only", async ({ page }) => {
    const fixture = await mockUiWorkspace(page);
    let servedMixedGoals = false;
    const activeGoal = {
      id: 11,
      cycleId: 1,
      title: "Ship the reliability release",
      why: "Customers can trust every planning ritual.",
      lagMetricName: "Reliable flows",
      lagUnit: "flows",
      lagStart: 0,
      lagTarget: 5,
      deadlineWeek: 12,
      status: "active" as const,
      sortOrder: 0,
      createdAt: "2026-09-01T00:00:00.000Z",
      tactics: [],
    };
    const droppedGoal = {
      ...activeGoal,
      id: 12,
      title: "Dropped expansion goal",
      lagMetricName: "Dropped leads",
      status: "dropped" as const,
      sortOrder: 1,
    };
    await page.route("**/api/**", (route) => {
      if (new URL(route.request().url()).pathname !== "/api/cycles/1") return route.fallback();
      servedMixedGoals = true;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          cycle: {
            id: 1,
            name: "Fall focus",
            startDate: "2026-09-14",
            status: "active",
            createdAt: "2026-09-01T00:00:00.000Z",
            archivedAt: null,
          },
          goals: [activeGoal, droppedGoal],
        }),
      });
    });

    await page.goto("/week?week=3");
    await expect.poll(() => servedMixedGoals).toBe(true);
    await page.getByRole("button", { name: "Close week 3", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Close week 3" });
    await dialog.getByRole("button", { name: "Continue", exact: true }).click();

    await expect(dialog.getByText("Ship the reliability release", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Dropped expansion goal", { exact: true })).toHaveCount(0);
    await expect(dialog.getByLabel(/Reliable flows/)).toBeVisible();
    await expect(dialog.getByLabel(/Dropped leads/)).toHaveCount(0);

    await dialog.getByLabel(/Reliable flows/).fill("4");
    await dialog.getByRole("button", { name: "Continue", exact: true }).click();
    await dialog.getByRole("button", { name: "Close week 3", exact: true }).click();
    await expect.poll(() => fixture.requests.find((request) => request.pathname === "/api/week-plans/33/close")?.body).toMatchObject({
      lagValues: [{ goalId: 11, value: 4 }],
    });
  });
});
