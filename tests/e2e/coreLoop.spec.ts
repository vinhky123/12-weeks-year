import { test, expect } from "@playwright/test";

test.describe("Phase 1 Core Loop E2E (Antigravity UI Verification)", () => {
  test("Dashboard (F6) renders active cycle, next ritual, scores, and goal cards", async ({ page }) => {
    await page.goto("/");

    // 1. Header Row
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByText("days left in the year")).toBeVisible();

    // 2. Daily Principle
    const quote = page.locator("text=/“.*”/").first();
    await expect(quote).toBeVisible();

    // 3. Next Ritual Card
    await expect(page.getByText("Next Ritual")).toBeVisible();

    // 4. Score Panel
    await expect(page.getByText("Execution Score")).toBeVisible();
    await expect(
      page.getByText("85% weekly execution is the benchmark — below 65, revise the plan."),
    ).toBeVisible();

    // 5. 12-Week History Strip
    await expect(page.getByText("12-Week Execution History")).toBeVisible();
    for (let w = 1; w <= 12; w++) {
      await expect(page.getByRole("link", { name: new RegExp(`W${w}\\b`) })).toBeVisible();
    }

    // Week 1 was closed in seed data at 92%
    const w1Link = page.getByRole("link", { name: /W1\b/ });
    await expect(w1Link).toContainText("92%");

    // 6. Goals List
    await expect(page.getByRole("heading", { name: /Goals \(\d\/3\)/ })).toBeVisible();
  });

  test("Today view (F4) daily execution: check, uncheck, and projected score bar", async ({ page }) => {
    await page.goto("/today");

    // Header & Daily Principle
    await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
    await expect(page.locator("text=/“.*”/").first()).toBeVisible();

    // 7-day strip
    await expect(page.getByText("Mon", { exact: true })).toBeVisible();
    await expect(page.getByText("Sun", { exact: true })).toBeVisible();

    // Day sections exist — click Monday to expand its items
    const monSection = page.locator("#day-section-0");
    await expect(monSection).toBeVisible();
    await monSection.getByText(/Monday/).click();

    // Find the first actionable item in Monday section
    const checkbox = monSection.locator("button[title*='completion'], button[title*='achievements']").first();
    await expect(checkbox).toBeVisible();

    // Projected score bar is visible with 85% benchmark
    await expect(page.getByText(/Projected week score/)).toBeVisible();
    await expect(page.getByText(/85% benchmark/).first()).toBeVisible();

    // Click checkbox to toggle
    await checkbox.click();
    await page.waitForTimeout(500);

    // Click again to toggle back
    await checkbox.click();
    await page.waitForTimeout(500);
  });

  test("12-Week Plan Builder (F2) displays goals, tactics, and validation", async ({ page }) => {
    await page.goto("/plan");

    // Cycle bar
    await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();

    // Goals header
    await expect(page.getByRole("heading", { name: /12-Week Goals/ })).toBeVisible();

    // Check goal cards exist
    const goalCards = page.locator("h3.text-lg");
    await expect(goalCards.first()).toBeVisible();

    // Verify tactics are listed with due badges (e.g. 3×/week, W3)
    await expect(page.getByText(/Tactics \(\d+\)/).first()).toBeVisible();

    // Test Goal Form Modal validation
    const addGoalBtn = page.getByRole("button", { name: "+ Add Goal" });
    if (await addGoalBtn.isEnabled()) {
      await addGoalBtn.click();
      await expect(page.getByRole("heading", { name: "Add 12-Week Goal" })).toBeVisible();

      // Submit empty form to trigger validation (exact: true)
      await page.getByRole("button", { name: "Add Goal", exact: true }).click();
      await expect(page.getByText("Goal title is required.")).toBeVisible();

      // Close modal
      await page.getByRole("button", { name: "Cancel" }).click();
    }
  });

  test("Weekly Plan (F3) & Close Week ritual (F5)", async ({ page }) => {
    // 1. Visit closed week 1
    await page.goto("/week?week=1");
    await expect(page.getByRole("heading", { name: "Week 1" })).toBeVisible();
    await expect(page.getByText("Week 1 is closed — the score is final.")).toBeVisible();

    // 2. Visit active week 2
    await page.goto("/week?week=2");
    await expect(page.getByRole("heading", { name: "Week 2" })).toBeVisible();

    // 7-day columns on board
    await expect(page.getByText("Monday", { exact: true })).toBeVisible();
    await expect(page.getByText("Sunday", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Items start on Monday — move them to the days you’ll do them."),
    ).toBeVisible();

    // 3. Test Add Task & plan revision discipline
    await page.getByRole("button", { name: "+ Add Task" }).click();
    await expect(page.getByText("Add Ad-hoc Task to Week Plan")).toBeVisible();

    await page.locator("input[placeholder*='Urgent']").fill("Prepare client presentation");
    await page.getByRole("button", { name: "Continue" }).click();

    // Process-control confirmation modal
    await expect(
      page.getByText(
        "This isn’t from your 12-Week Plan. Adding it as a plan revision keeps the weekly plan strategic. Add anyway?",
      ),
    ).toBeVisible();
    await page.getByRole("button", { name: "Go Back" }).click();
    await page.getByRole("button", { name: "Cancel" }).click();

    // 4. Test Close Week Modal via ?close=1
    await page.goto("/week?week=2&close=1");
    await expect(page.getByText("Step 1: Confront the Truth")).toBeVisible();
    await expect(
      page.getByText("85% weekly execution is the benchmark — below 65, revise the plan."),
    ).toBeVisible();
    await expect(
      page.getByText("The score measures achievements, not effort or intentions."),
    ).toBeVisible();

    // Step navigation
    await page.getByRole("button", { name: "Continue to Lag Values →" }).click();
    await expect(page.getByText("Step 2: Log Lag Numbers")).toBeVisible();

    await page.getByRole("button", { name: "Continue to Reflection →" }).click();
    await expect(page.getByText("Step 3: Reflection & Freeze")).toBeVisible();
    await expect(
      page.getByText("Closing freezes week 2 forever — completions can no longer change."),
    ).toBeVisible();
  });
});
