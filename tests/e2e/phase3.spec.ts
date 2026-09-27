import { test, expect } from "@playwright/test";

test.describe("Phase 3 E2E (Antigravity UI Verification)", () => {
  test("Guardrails (F12) commitment card on /plan with collapsed reminder & edit flow", async ({ page }) => {
    await page.goto("/plan");

    // 1. Commitment card in collapsed mode (seeded)
    await expect(page.getByText("Your commitment:", { exact: true })).toBeVisible();
    await expect(page.getByText(/I choose to/)).toBeVisible();

    // 2. Click Edit inside commitment card to open form
    const editBtn = page.getByTestId("commitment-card").getByRole("button", { name: "Edit" });
    await editBtn.click();

    await expect(page.getByText("Make it a commitment.")).toBeVisible();
    await expect(
      page.getByText("Count the costs — comfort, pleasure, some opportunities.")
    ).toBeVisible();
    await expect(page.getByText("“I choose to…”")).toBeVisible();

    // 3. Edit statement and commit
    const statementInput = page.locator("textarea").nth(1);
    await statementInput.fill("I choose to execute daily with uncompromising focus.");
    await page.getByRole("button", { name: "Commit" }).click();

    // 4. Verify collapsed reminder updated
    await expect(page.getByText("Your commitment:", { exact: true })).toBeVisible();
    await expect(page.getByText(/uncompromising focus/)).toBeVisible();

    // 5. Reload and verify persistence
    await page.reload();
    await expect(page.getByText(/uncompromising focus/)).toBeVisible();
  });

  test("WAM (F10) guided weekly report, auto snapshot, user textareas, and Markdown export", async ({ page }) => {
    await page.goto("/wam");

    // 1. Header & Verbatim Intro
    await expect(page.getByRole("heading", { name: "WAM" })).toBeVisible();
    await expect(
      page.getByText(
        "Accountability is not consequences — it's ownership. Report to yourself like you'd report to a peer."
      )
    ).toBeVisible();

    // 2. Week Picker (W1 to W12)
    for (let w = 1; w <= 12; w++) {
      await expect(
        page.getByRole("button", { name: new RegExp(`^W${w}(\\s*current)?$`) })
      ).toBeVisible();
    }

    // 3. Select Week 1 (closed at 92%)
    await page.getByRole("button", { name: /^W1(\s*current)?$/ }).click();

    // Verify Auto Report contents
    await expect(page.getByText("Results to date")).toBeVisible();
    await expect(page.getByText("Commitments for next week")).toBeVisible();
    await expect(page.getByText("Week Score: 92%")).toBeVisible();
    await expect(page.getByText(/Lose 10 lbs/)).toBeVisible();

    // 4. Fill User Assessment fields
    const blockersArea = page.locator("textarea").nth(0);
    const whatWorkedArea = page.locator("textarea").nth(1);
    const encouragementArea = page.locator("textarea").nth(2);

    await blockersArea.fill("Outreach slipped due to ad-hoc fires.");
    await whatWorkedArea.fill("Morning strength workouts were 100% on schedule.");
    await encouragementArea.fill("The discipline of week 1 builds the freedom of week 12.");

    // 5. Save report
    await page.getByRole("button", { name: "Save report" }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();

    // 6. Verify Markdown export anchor
    const exportLink = page.getByRole("link", { name: "Export as Markdown" });
    await expect(exportLink).toBeVisible();
    const href = await exportLink.getAttribute("href");
    expect(href).toMatch(/\/api\/cycles\/\d+\/wam\/1\/export/);
  });

  test("Week 13 Review Wizard (F11) celebration, steps 1–6, and reload affordance", async ({ page }) => {
    // Visit review for archived cycle id 1 (seeded full review)
    await page.goto("/review?id=1");

    // 1. Step 1: Celebrate
    await expect(page.getByText("Celebrate before you analyze.")).toBeVisible();
    await expect(page.getByText("Peak Execution")).toBeVisible();
    await expect(page.getByText("12-Week Average")).toBeVisible();
    await expect(page.getByText("Goals Achieved")).toBeVisible();

    // 2. Advance to Step 2: Results
    await page.getByRole("button", { name: "Next →" }).click();
    await expect(page.getByText("Step 2: Results")).toBeVisible();
    await expect(page.getByText("Self-Assigned Grade (1–10)").first()).toBeVisible();

    // 3. Advance to Step 3: Quality of Life
    await page.getByRole("button", { name: "Next →" }).click();
    await expect(page.getByText("Step 3: Quality of Life")).toBeVisible();
    await expect(
      page.getByText(
        "Life balance is an illusion — strive for intentional imbalance. Where did you over-invest, and where deliberately not?"
      )
    ).toBeVisible();
    await expect(page.getByText("Spiritual", { exact: true })).toBeVisible();
    await expect(page.getByText("Physical", { exact: true })).toBeVisible();

    // 4. Advance to Step 4: Success Disciplines
    await page.getByRole("button", { name: "Next →" }).click();
    await expect(page.getByText("Step 4: Success Disciplines")).toBeVisible();
    await expect(
      page.getByText(
        "Rate how you executed the system itself — not the results, the disciplines."
      )
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Vision" })).toBeVisible();
    await expect(page.getByText("Performance Time (Blocks)", { exact: true })).toBeVisible();

    // 5. Advance to Step 5: Breakthroughs
    await page.getByRole("button", { name: "Next →" }).click();
    await expect(page.getByText("Step 5: Breakthroughs")).toBeVisible();
    await expect(
      page.getByText(
        "How must your thinking change to double your results? What new actions are required?"
      )
    ).toBeVisible();

    // 6. Advance to Step 6: Reload
    await page.getByRole("button", { name: "Next →" }).click();
    await expect(page.getByText("Step 6: Reload")).toBeVisible();
    await expect(
      page.getByText(
        "Archiving freezes this cycle forever — its scores, its review, its vision snapshot."
      )
    ).toBeVisible();
  });

  test("History & Insights (F13) cycle list, deep-linked detail view, and cross-cycle insights", async ({ page }) => {
    await page.goto("/history");

    // 1. Header & Tabs
    await expect(page.getByRole("heading", { name: "History" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cycles" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Insights" })).toBeVisible();

    // 2. Verify seeded cycles exist in list
    await expect(page.getByText("Q3 2026 — Completed Example")).toBeVisible();
    await expect(page.getByText("Q4 2026 — Book Example")).toBeVisible();
    await expect(page.getByText("Review saved").first()).toBeVisible();

    // 3. Click archived cycle card to open detail view
    await page.getByText("Q3 2026 — Completed Example").click();

    // Verify detail view
    await expect(page.getByText("← Back to all cycles")).toBeVisible();
    await expect(page.getByText("12-Week Execution History")).toBeVisible();
    await expect(page.getByText("12-Week Retrospective")).toBeVisible();
    await expect(page.getByText("Weekly Reflections")).toBeVisible();

    // 4. Back to list
    await page.getByText("← Back to all cycles").click();
    await expect(page.getByText("Q3 2026 — Completed Example")).toBeVisible();

    // 5. Switch to Insights tab
    await page.getByRole("button", { name: "Insights" }).click();

    await expect(page.getByText("Best Cycle")).toBeVisible();
    await expect(page.getByText("Goals Achieved")).toBeVisible();
    await expect(page.getByText("Quality of Life Movement")).toBeVisible();
    await expect(page.getByText("Cross-Cycle Execution Trend")).toBeVisible();
  });
});
