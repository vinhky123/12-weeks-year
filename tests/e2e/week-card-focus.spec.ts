import { expect, test, type Page, type Route } from "@playwright/test";
import { mockUiWorkspace } from "./fixtures/uiWorkspace";

type PendingPatch = {
  route: Route;
  body: Record<string, unknown>;
};

async function gateCardPatches(page: Page) {
  const pending: PendingPatch[] = [];

  await page.route("**/api/week-plans/33/items/303", async (route) => {
    if (route.request().method() !== "PATCH") {
      await route.fallback();
      return;
    }

    pending.push({
      route,
      body: JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>,
    });
  });

  const next = async () => {
    await expect.poll(() => pending.length).toBeGreaterThan(0);
    return pending.shift()!;
  };

  return {
    pending,
    next,
    async succeed(request: PendingPatch) {
      await request.route.fallback();
    },
    async fail(request: PendingPatch) {
      await request.route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Could not rename the task." }),
      });
    },
  };
}

test.describe("week card keyboard focus", () => {
  test("Cancel returns focus to the card Rename trigger", async ({ page }) => {
    await mockUiWorkspace(page);
    await page.goto("/week?week=3");

    await page.getByRole("button", { name: "Rename Wednesday priority" }).click();
    await page.getByRole("textbox", { name: "Task name" }).fill("Discarded draft");
    await page.getByRole("button", { name: "Cancel rename" }).click();

    await expect(page.getByRole("button", { name: "Rename Wednesday priority" })).toBeFocused();
  });

  test("Save keeps its focus while pending, blocks duplicate activation, and returns focus to Rename on success", async ({ page }) => {
    await mockUiWorkspace(page);
    const patches = await gateCardPatches(page);
    await page.goto("/week?week=3");

    await page.getByRole("button", { name: "Rename Wednesday priority" }).click();
    await page.getByRole("textbox", { name: "Task name" }).fill("Wednesday customer proof");
    const save = page.getByRole("button", { name: "Save task name" });
    await save.focus();
    await page.keyboard.press("Enter");

    const request = await patches.next();
    expect(request.body).toEqual({ label: "Wednesday customer proof" });
    await expect(save).toBeFocused();
    await expect(save).toHaveAttribute("aria-disabled", "true");

    await page.keyboard.press("Enter");
    expect(patches.pending).toHaveLength(0);

    await patches.succeed(request);
    await expect(page.getByRole("button", { name: "Rename Wednesday customer proof" })).toBeFocused();
  });

  test("a failed Save preserves the draft and retry focus", async ({ page }) => {
    await mockUiWorkspace(page);
    const patches = await gateCardPatches(page);
    await page.goto("/week?week=3");

    await page.getByRole("button", { name: "Rename Wednesday priority" }).click();
    const input = page.getByRole("textbox", { name: "Task name" });
    await input.fill("Retry this draft");
    const save = page.getByRole("button", { name: "Save task name" });
    await save.focus();
    await page.keyboard.press("Enter");

    const failedRequest = await patches.next();
    await expect(save).toBeFocused();
    await patches.fail(failedRequest);

    await expect(page.getByText("Could not update this task. Please try again.", { exact: true })).toBeVisible();
    await expect(input).toHaveValue("Retry this draft");
    await expect(save).toBeFocused();

    await page.keyboard.press("Enter");
    const retryRequest = await patches.next();
    expect(retryRequest.body).toEqual({ label: "Retry this draft" });
    await patches.succeed(retryRequest);
    await expect(page.getByRole("button", { name: "Rename Retry this draft" })).toBeFocused();
  });

  test("a moved card keeps keyboard focus on its native day select", async ({ page }) => {
    await mockUiWorkspace(page);
    const patches = await gateCardPatches(page);
    await page.goto("/week?week=3");

    const move = page.getByRole("combobox", { name: "Move Wednesday priority" });
    await move.focus();
    await page.keyboard.press("ArrowDown");

    const request = await patches.next();
    expect(request.body).toEqual({ dayOfWeek: 3 });
    await expect(move).toBeFocused();
    await expect(move).toHaveAttribute("aria-disabled", "true");
    await patches.succeed(request);

    await expect(page.getByRole("combobox", { name: "Move Wednesday priority" })).toBeFocused();
  });
});
