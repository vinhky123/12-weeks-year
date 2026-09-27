import { test, expect } from "@playwright/test";

test.describe("Phase 2 E2E (Antigravity UI Verification)", () => {
  test("Vision (F7) displays living vision, supports dirty tracking, saving, and life domains", async ({ page }) => {
    await page.goto("/vision");

    // 1. Header
    await expect(page.getByRole("heading", { name: "Vision" })).toBeVisible();

    // 2. Three numbered sections
    await expect(page.getByText("Long-Term Vision")).toBeVisible();
    await expect(page.getByText("Three-Year Vision")).toBeVisible();
    await expect(page.getByText("This Cycle's Connection")).toBeVisible();

    // Check prompts verbatim
    await expect(page.getByText("Five to fifteen years out. What does an ideal ordinary Tuesday look like?")).toBeVisible();
    await expect(page.getByText("Three years: the bridge between the dream and this quarter.")).toBeVisible();
    await expect(page.getByText("Why does this cycle matter? What must be true at week 12?")).toBeVisible();

    // 3. Life Domains section
    await expect(page.getByRole("heading", { name: "Life Domains" })).toBeVisible();
    await expect(page.getByText("Vision across your whole life — business goals serve personal ends.")).toBeVisible();

    // 4. Pitfall micro-copy
    await expect(
      page.getByText("A vision that isn't personal, isn't linked to daily actions, or is too small won't survive the valley.")
    ).toBeVisible();

    // 5. Save button disabled initially (not dirty)
    const saveBtn = page.getByRole("button", { name: "Save vision" });
    await expect(saveBtn).toBeDisabled();

    // 6. Edit cycle connection
    const cycleConnTextarea = page.locator("textarea").nth(2);
    const originalText = await cycleConnTextarea.inputValue();
    await cycleConnTextarea.fill(`${originalText} [Refined for execution]`);

    // Verify dirty indicator and enabled button
    await expect(page.getByText("(unsaved changes)")).toBeVisible();
    await expect(saveBtn).toBeEnabled();

    // 7. Add suggested life domain chip
    const socialChip = page.getByRole("button", { name: "+ Social" });
    if (await socialChip.isVisible()) {
      await socialChip.click();
    }

    // 8. Save
    await saveBtn.click();
    await expect(page.getByText("Saved")).toBeVisible();

    // 9. Reload and verify persistence
    await page.reload();
    await expect(page.locator("textarea").nth(2)).toHaveValue(`${originalText} [Refined for execution]`);
  });

  test("Measures (F8) renders score trend chart, lag progress, lead indicators, and supports lead logging & CRUD", async ({ page }) => {
    await page.goto("/measures");

    // 1. Header & Verbatim Benchmark
    await expect(page.getByRole("heading", { name: "Measures" })).toBeVisible();
    await expect(
      page.getByText("85% weekly execution is the benchmark — below 65, revise the plan.")
    ).toBeVisible();

    // 2. Score Trend Chart
    await expect(page.getByText("Execution Score Trend")).toBeVisible();
    await expect(page.getByText("85% benchmark", { exact: true })).toBeVisible();
    // 12 week slots
    for (let w = 1; w <= 12; w++) {
      await expect(page.getByText(`W${w}`, { exact: true })).toBeVisible();
    }

    // 3. Goal Lag Section (Weight goal from seed)
    await expect(page.getByText(/Target: Weight \(180 → 170 lbs\)/)).toBeVisible();
    await expect(page.getByText("178.5 lbs").first()).toBeVisible();
    await expect(page.getByText("Log lag at week close →").first()).toBeVisible();

    // 4. Lead Indicators
    await expect(page.getByText("Lead indicators are the activities you control — the lag follows.").first()).toBeVisible();
    await expect(page.getByText("Workouts completed")).toBeVisible();

    // 5. Test Log Lead Value (+log popover)
    const logBtn = page.getByRole("button", { name: "+log" }).first();
    await logBtn.click();
    await expect(page.getByText("Log Lead Activity")).toBeVisible();

    const valueInput = page.locator("input[placeholder='e.g. 3']");
    await valueInput.fill("4");
    await page.getByRole("button", { name: "Log value" }).click();

    // Check modal closed and value updated
    await expect(page.getByText("Log Lead Activity")).not.toBeVisible();
    await expect(page.getByText(/4 \/ 3/)).toBeVisible();

    // 6. Test Add Lead Indicator
    const addLeadBtn = page.getByRole("button", { name: "+ Add lead indicator" }).first();
    await addLeadBtn.click();
    await expect(page.getByText("Add Lead Measure")).toBeVisible();

    await page.locator("input[placeholder*='Activity name']").fill("Daily water intake");
    await page.locator("input[type='number']").last().fill("7");
    await page.getByRole("button", { name: "Add", exact: true }).click();

    // Verify newly added measure appears
    await expect(page.getByText("Daily water intake")).toBeVisible();
    await expect(page.getByText(/Target: 7x \/ week/)).toBeVisible();

    // 7. Delete newly added lead indicator
    page.on("dialog", (dialog) => dialog.accept());
    const waterRow = page.locator("div.rounded-lg", { hasText: "Daily water intake" }).last();
    await waterRow.locator("button[title='Remove lead measure']").click();
    await expect(page.getByText("Daily water intake")).not.toBeVisible();
  });

  test("Model Week (F9) validates book quantities, renders 7-day grid, and handles block CRUD", async ({ page }) => {
    await page.goto("/model-week");

    // 1. Tagline
    await expect(page.getByText("Control your time, or forfeit control of your results.")).toBeVisible();

    // 2. Initial state: seeded with 10 blocks -> model week complete
    await expect(
      page.getByText("Model week complete — the book's quantities are in place.")
    ).toBeVisible();

    // 3. Grid: Mon-Sun columns
    await expect(page.getByText("Mon", { exact: true })).toBeVisible();
    await expect(page.getByText("Sun", { exact: true })).toBeVisible();

    // 4. Check book block types exist on the grid
    await expect(page.getByText("Strategic").first()).toBeVisible();
    await expect(page.getByText("Buffer").first()).toBeVisible();
    await expect(page.getByText("Breakout").first()).toBeVisible();
    await expect(page.getByText("Planning").first()).toBeVisible();
    await expect(page.getByText("WAM").first()).toBeVisible();

    // 5. Test Add Block
    await page.getByRole("button", { name: "+ Add block" }).click();
    await expect(page.getByRole("heading", { name: "Add Time Block" })).toBeVisible();

    // Fill form
    await page.locator("input[placeholder*='Deep work']").fill("Ad-hoc sprint block");
    await page.getByRole("button", { name: "Add block", exact: true }).click();

    // Verify new block is placed
    await expect(page.getByText("Ad-hoc sprint block")).toBeVisible();

    // 6. Test Edit Block
    const blockCard = page.locator("div.group", { hasText: "Ad-hoc sprint block" }).first();
    await blockCard.locator("button[title='Edit block']").click();
    await expect(page.getByRole("heading", { name: "Edit Time Block" })).toBeVisible();

    await page.locator("input[placeholder*='Deep work']").fill("Focused revision sprint");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Focused revision sprint")).toBeVisible();

    // 7. Test Delete Block
    const cardToDelete = page.locator("div.group", { hasText: "Focused revision sprint" }).first();
    await cardToDelete.locator("button[title='Delete block']").click();
    await expect(page.getByText("Focused revision sprint")).not.toBeVisible();

    // 8. Micro-copy footer
    await expect(
      page.getByText("Being busy is a form of laziness — lazy thinking and indiscriminate action.")
    ).toBeVisible();
  });
});
