import { test, expect } from "@playwright/test";
import { mockUiWorkspace } from "./fixtures/uiWorkspace";

test.describe("UI workspace browser contracts", () => {
  test("phone navigation fits the viewport, keeps primary destinations visible, and opens an accessible menu", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockUiWorkspace(page);
    await page.goto("/today");

    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await expect(page.getByRole("link", { name: "Today", exact: true })).toHaveAttribute("href", "/today");
    await expect(page.getByRole("link", { name: "This Week", exact: true })).toHaveAttribute("href", "/week");
    await expect(page.getByRole("link", { name: "Cycle", exact: true })).toHaveAttribute("href", "/");

    const menu = page.getByRole("button", { name: "Menu", exact: true });
    await menu.click();
    const menuDialog = page.getByRole("dialog", { name: "Menu", exact: true });
    await expect(menuDialog).toBeVisible();
    await expect(menuDialog.getByRole("link", { name: "Settings", exact: true })).toHaveAttribute("href", "/settings");
    await page.keyboard.press("Escape");
    await expect(menuDialog).toBeHidden();
    await expect(page.getByRole("link", { name: "This Week", exact: true })).toBeVisible();
    await expect(menu).toBeFocused();
  });

  test("Today leads with current work, keeps unfinished earlier work visible, and collapses the rest of the week", async ({ page }) => {
    await mockUiWorkspace(page);
    await page.goto("/today");

    const todayHeading = page.getByRole("heading", { name: "Today", exact: true });
    const earlierHeading = page.getByRole("heading", { name: "Earlier this week", exact: true });
    await expect(todayHeading).toBeVisible();
    await expect(earlierHeading).toBeVisible();
    const [todayBox, earlierBox] = await Promise.all([todayHeading.boundingBox(), earlierHeading.boundingBox()]);
    expect(todayBox?.y).toBeLessThan(earlierBox?.y ?? 0);

    await expect(page.getByText("Wednesday priority", { exact: true })).toBeVisible();
    await expect(page.getByText("Admin follow-up", { exact: true })).toBeVisible();
    await expect(page.getByText("Monday carryover", { exact: true })).toBeVisible();
    await expect(page.getByText("Tuesday completed", { exact: true })).toBeHidden();
    await expect(page.getByText("Friday future", { exact: true })).toBeHidden();

    await page.getByRole("button", { name: "Rest of week", exact: true }).click();
    await expect(page.getByText("Tuesday completed", { exact: true })).toBeVisible();
    await expect(page.getByText("Friday future", { exact: true })).toBeVisible();
    for (const label of ["Monday carryover", "Tuesday completed", "Wednesday priority", "Friday future", "Admin follow-up"]) {
      await expect(page.getByText(label, { exact: true })).toHaveCount(1);
    }
  });

  test("week items use a native day select and an accessible rename flow", async ({ page }) => {
    const fixture = await mockUiWorkspace(page);
    await page.goto("/week?week=3");

    const move = page.getByRole("combobox", { name: "Move Wednesday priority" });
    await move.selectOption("4");
    await expect.poll(() => fixture.requests.find((request) => request.pathname === "/api/week-plans/33/items/303" && request.body?.dayOfWeek === 4)).toBeTruthy();

    await page.getByRole("button", { name: "Rename Wednesday priority" }).click();
    const name = page.getByRole("textbox", { name: "Task name" });
    await name.fill("Wednesday customer proof");
    await page.getByRole("button", { name: "Save task name" }).click();
    await expect(page.getByText("Wednesday customer proof", { exact: true })).toBeVisible();
    await expect.poll(() => fixture.requests.find((request) => request.pathname === "/api/week-plans/33/items/303" && request.body?.label === "Wednesday customer proof")).toBeTruthy();
  });

  test("late week responses cannot restore a stale actionable board", async ({ page }) => {
    const fixture = await mockUiWorkspace(page, { manualWeek4: true });
    await page.goto("/week?week=3");

    const weekThreeMove = page.getByRole("combobox", { name: "Move Wednesday priority" });
    await expect(weekThreeMove).toBeVisible();
    await page.getByRole("button", { name: /Next week/i }).click();
    await expect(page.getByRole("heading", { name: "Week 4", exact: true })).toBeVisible();
    await expect(weekThreeMove).toBeHidden();

    await page.getByRole("button", { name: /Previous week/i }).click();
    await expect(page.getByRole("heading", { name: "Week 3", exact: true })).toBeVisible();
    await expect(weekThreeMove).toBeVisible();

    fixture.resolveWeek4();
    await fixture.waitForWeek4Response();
    await expect(page.getByRole("heading", { name: "Week 3", exact: true })).toBeVisible();
    await expect(weekThreeMove).toBeVisible();
    await expect(page.getByText("Week four delayed", { exact: true })).toBeHidden();
  });

  test("Today completion exposes state, blocks duplicate input, rolls back failure, and discloses goal context", async ({ page }) => {
    const fixture = await mockUiWorkspace(page, { manualCompletion: true });
    await page.goto("/today");

    const completion = page.getByRole("button", { name: "Mark complete: Wednesday priority" });
    await expect(completion).toHaveAttribute("aria-pressed", "false");
    await completion.click();
    const undo = page.getByRole("button", { name: "Undo completion: Wednesday priority" });
    await expect(undo).toBeDisabled();
    await expect(undo).toHaveAttribute("aria-pressed", "true");
    expect(fixture.requests.filter((request) => request.pathname === "/api/completions")).toHaveLength(1);

    fixture.resolveCompletion(500);
    await expect(completion).toBeEnabled();
    await expect(completion).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByRole("alert").filter({ hasText: "Could not save completion." })).toBeVisible();

    const currentItem = page.locator("article").filter({ has: completion });
    const goalDisclosure = currentItem.locator("summary[aria-controls]").filter({ hasText: "Goal: Ship the reliability release" });
    await expect(goalDisclosure).toHaveAttribute("aria-expanded", "false");
    await goalDisclosure.click();
    await expect(goalDisclosure).toHaveAttribute("aria-expanded", "true");
    await expect(currentItem.getByText(/Customers can trust every planning ritual\./)).toBeVisible();
  });

  test("Vietnamese dark Today and Week controls contain long unbroken task and goal text at phone width", async ({ page }) => {
    const longTask = `TacVu${"X".repeat(96)}`;
    const longGoal = `MucTieu${"Y".repeat(96)}`;
    await page.setViewportSize({ width: 390, height: 844 });
    await mockUiWorkspace(page, { locale: "vi", theme: "dark", longItemLabel: longTask, longGoalTitle: longGoal });

    await page.goto("/today");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByRole("heading", { name: "Hôm nay", exact: true })).toBeVisible();
    const longTaskControl = page.getByRole("button", { name: `Đánh dấu hoàn thành: ${longTask}` });
    await expect(longTaskControl).toBeVisible();
    const longTaskCard = page.locator("article").filter({ has: longTaskControl });
    await expect(longTaskCard.locator("summary[aria-controls]").filter({ hasText: `Mục tiêu: ${longGoal}` })).toBeVisible();
    const todayFitsViewport = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

    await page.goto("/week?week=3");
    await expect(page.getByRole("region", { name: "Lịch tuần" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: `Chuyển ${longTask}` })).toBeVisible();
    await expect(page.getByRole("button", { name: `Đổi tên ${longTask}` })).toBeVisible();
    const weekFitsViewport = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    expect({ todayFitsViewport, weekFitsViewport }).toEqual({ todayFitsViewport: true, weekFitsViewport: true });
  });

  test("Today empty state fits a Vietnamese phone viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockUiWorkspace(page, { locale: "vi", theme: "dark", noActiveToday: true });
    await page.goto("/today");

    await expect(page.getByRole("heading", { name: "Mỗi ngày nằm trong một tuần thực thi.", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Lập kế hoạch tuần này", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Về bảng điều khiển", exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("adding an ad-hoc task sends a confirmed plan revision only after confirmation", async ({ page }) => {
    const fixture = await mockUiWorkspace(page);
    await page.goto("/week?week=3");

    await page.getByRole("button", { name: "Add task", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Add task" });
    await dialog.getByRole("textbox", { name: "Task name" }).fill("Customer escalation");
    await dialog.getByRole("combobox", { name: "Day" }).selectOption("4");
    await dialog.getByRole("button", { name: "Continue", exact: true }).click();
    expect(fixture.requests.filter((request) => request.method === "POST" && request.pathname === "/api/week-plans/33/items")).toHaveLength(0);

    await dialog.getByRole("button", { name: "Confirm & add", exact: true }).click();
    await expect.poll(() => fixture.requests.find((request) => request.method === "POST" && request.pathname === "/api/week-plans/33/items")).toMatchObject({
      body: { label: "Customer escalation", dayOfWeek: 4, confirmPlanRevision: true },
    });
  });

  test("shared dialogs have names, close controls, Escape focus restoration, and reset state", async ({ page }) => {
    await mockUiWorkspace(page);
    await page.goto("/week?week=3");

    const addOpener = page.getByRole("button", { name: "Add task", exact: true });
    await addOpener.click();
    const addDialog = page.getByRole("dialog", { name: "Add task" });
    await expect(addDialog.getByRole("button", { name: "Close dialog", exact: true })).toBeVisible();
    await addDialog.getByRole("textbox", { name: "Task name" }).fill("Discard me");
    await page.keyboard.press("Escape");
    await expect(addDialog).toBeHidden();
    await expect(addOpener).toBeFocused();
    await addOpener.click();
    await expect(addDialog.getByRole("textbox", { name: "Task name" })).toHaveValue("");
    await page.keyboard.press("Escape");

    const closeOpener = page.getByRole("button", { name: "Close week 3", exact: true });
    await closeOpener.click();
    const closeDialog = page.getByRole("dialog", { name: "Close week 3" });
    await expect(closeDialog.getByRole("button", { name: "Close dialog", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(closeDialog).toBeHidden();
    await expect(closeOpener).toBeFocused();
  });

  test("close-week failure preserves reflection and pending save cannot be dismissed", async ({ page }) => {
    const fixture = await mockUiWorkspace(page, { manualClose: true });
    await page.goto("/week?week=3&close=1");

    const dialog = page.getByRole("dialog", { name: "Close week 3" });
    await dialog.getByRole("button", { name: "Continue", exact: true }).click();
    await dialog.getByRole("button", { name: "Continue", exact: true }).click();
    const reflection = dialog.getByRole("textbox", { name: "Weekly reflection" });
    await reflection.fill("Keep the proof close to the user.");
    const save = dialog.getByRole("button", { name: "Close week 3", exact: true });
    await save.click();
    await expect(save).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Close dialog", exact: true })).toBeDisabled();

    fixture.resolveClose(500);
    await expect(dialog.getByRole("alert")).toContainText("Could not close week.");
    await expect(reflection).toHaveValue("Keep the proof close to the user.");
  });

  test("close-week success remains visible after the parent adopts the closed plan", async ({ page }) => {
    const fixture = await mockUiWorkspace(page, { manualClose: true });
    await page.goto("/week?week=3&close=1");

    const dialog = page.getByRole("dialog", { name: "Close week 3" });
    await dialog.getByRole("button", { name: "Continue", exact: true }).click();
    await dialog.getByRole("button", { name: "Continue", exact: true }).click();
    await dialog.getByRole("button", { name: "Close week 3", exact: true }).click();
    fixture.resolveClose();

    await expect(dialog.getByRole("heading", { name: "Week 3 is closed", exact: true })).toBeVisible();
    await expect(page.getByText("closed", { exact: true })).toBeVisible();
  });

  test("dashboard close-last-week action targets the previous week", async ({ page }) => {
    await mockUiWorkspace(page);
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Close Week 2", exact: true })).toHaveAttribute("href", "/week?week=2&close=1");
  });

  test("completing unfinished earlier work keeps it in place until the next visit", async ({ page }) => {
    await mockUiWorkspace(page);
    await page.goto("/today");

    const earlier = page.getByRole("region", { name: "Earlier this week" });
    await earlier.getByRole("button", { name: "Mark complete: Monday carryover" }).click();
    const undo = earlier.getByRole("button", { name: "Undo completion: Monday carryover" });
    await expect(undo).toHaveAttribute("aria-pressed", "true");
    await expect(undo).toBeFocused();

    await page.reload();
    await expect(earlier.getByText("Monday carryover")).toHaveCount(0);
    await page.locator("summary").filter({ hasText: "Rest of week" }).click();
    await expect(page.getByRole("button", { name: "Undo completion: Monday carryover" })).toBeVisible();
  });

  test("a closed week on Today shows the final score and locks completion", async ({ page }) => {
    await mockUiWorkspace(page, { closedToday: true });
    await page.goto("/today");

    await expect(page.getByText("Week 3 is closed — the score is final.")).toBeVisible();
    await expect(page.getByRole("region", { name: "Final weekly score" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Weekly progress" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Mark complete: Wednesday priority" })).toBeDisabled();
  });
});
