import { test, expect } from "@playwright/test";

test.describe("Phase 3 E2E (Antigravity UI Verification)", () => {
  test("Guardrails (F12) commitment card on /plan with collapsed reminder & edit flow", async ({ page }) => {
    await page.goto("/plan");

    // 1. Commitment card in collapsed mode (seeded)
    await expect(page.getByText(/(Your commitment:|Lời cam kết)/)).toBeVisible();
    await expect(page.getByText(/(I choose to|Tôi chọn)/)).toBeVisible();

    // 2. Click Edit inside commitment card to open form
    const editBtn = page.getByTestId("commitment-card").getByRole("button", { name: /(Edit|Chỉnh sửa|Sửa)/ });
    await editBtn.click();

    await expect(page.getByText(/(Make it a commitment|Biến nó thành một lời cam kết|Thiết lập lời cam kết)/)).toBeVisible();
    await expect(
      page.getByText(/(Count the costs|Hãy tính trước cái giá phải trả|Tính toán cái giá phải trả)/)
    ).toBeVisible();
    await expect(page.locator("label", { hasText: /“I choose to…”|“Tôi chọn…”/ })).toBeVisible();

    // 3. Edit statement and commit
    const statementInput = page.locator("textarea").nth(1);
    await statementInput.fill("I choose to execute daily with uncompromising focus.");
    await page.getByRole("button", { name: /(Commit|Cam kết)/ }).click();

    // 4. Verify collapsed reminder updated
    await expect(page.getByText(/(Your commitment:|Lời cam kết)/)).toBeVisible();
    await expect(page.getByText(/uncompromising focus/)).toBeVisible();

    // 5. Reload and verify persistence
    await page.reload();
    await expect(page.getByText(/uncompromising focus/)).toBeVisible();
  });

  test("WAM (F10) guided weekly report, auto snapshot, user textareas, and Markdown export", async ({ page }) => {
    await page.goto("/wam");

    // 1. Header & Verbatim Intro
    await expect(page.getByRole("heading", { name: /(WAM|Họp WAM|Cuộc họp Trách nhiệm Tuần)/ })).toBeVisible();
    await expect(
      page.getByText(
        /(Accountability is not consequences|Trách nhiệm không phải là chịu phạt)/
      )
    ).toBeVisible();

    // 2. Week Picker (W1 to W12)
    for (let w = 1; w <= 12; w++) {
      await expect(
        page.getByRole("button", { name: new RegExp(`^(W|T)${w}(\\s*(current|hiện tại))?$`) })
      ).toBeVisible();
    }

    // 3. Select Week 1 (closed at 92%)
    await page.getByRole("button", { name: /^(W|T)1(\s*(current|hiện tại))?$/ }).click();

    // Verify Auto Report contents
    await expect(page.getByText(/(Results to date|Kết quả lũy kế đến nay|Kết quả đến nay)/)).toBeVisible();
    await expect(page.getByText(/(Commitments for next week|Cam kết cho tuần tiếp theo|Cam kết tuần tới)/)).toBeVisible();
    await expect(page.getByText(/(Week Score: 92%|Điểm tuần: 92%)/)).toBeVisible();
    await expect(page.getByText(/Lose 10 lbs/)).toBeVisible();

    // 4. Fill User Assessment fields
    const blockersArea = page.locator("textarea").nth(0);
    const whatWorkedArea = page.locator("textarea").nth(1);
    const encouragementArea = page.locator("textarea").nth(2);

    await blockersArea.fill("Outreach slipped due to ad-hoc fires.");
    await whatWorkedArea.fill("Morning strength workouts were 100% on schedule.");
    await encouragementArea.fill("The discipline of week 1 builds the freedom of week 12.");

    // 5. Save report
    await page.getByRole("button", { name: /(Save report|Lưu báo cáo)/ }).click();
    await expect(page.locator("span", { hasText: /^(Saved|Đã lưu)$/ })).toBeVisible();

    // 6. Verify Markdown export anchor
    const exportLink = page.getByRole("link", { name: /(Export as Markdown|Xuất file Markdown|Xuất Markdown)/ });
    await expect(exportLink).toBeVisible();
    const href = await exportLink.getAttribute("href");
    expect(href).toMatch(/\/api\/cycles\/\d+\/wam\/1\/export/);
  });

  test("Week 13 Review Wizard (F11) celebration, steps 1–6, and reload affordance", async ({ page }) => {
    // Visit review for archived cycle id 1 (seeded full review)
    await page.goto("/review?id=1");

    // Completed archived reviews resume at Reload; the saved steps remain available for read-only review.
    await expect(page.getByRole("heading", { name: /(Step 6: Reload|Bước 6: Tái khởi động)/ })).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: /(Celebrate|Ăn mừng)/ }).click();

    // 1. Step 1: Celebrate
    // A cold dev server compiles three review API routes on this first visit and
    // Fast Refresh reloads the page twice, so allow for compilation here.
    await expect(page.getByText(/(Celebrate before you analyze\.|Ăn mừng trước khi bạn phân tích\.|Ăn mừng trước khi phân tích\.)/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/(Peak Execution|Đỉnh cao thực thi)/)).toBeVisible();
    await expect(page.getByText(/(12-Week Average|Điểm trung bình 12 tuần|Trung bình 12 tuần)/)).toBeVisible();
    await expect(page.getByText(/(Goals Achieved|Mục tiêu đã hoàn thành|Mục tiêu đạt được)/)).toBeVisible();

    // 2. Advance to Step 2: Results
    await page.getByRole("button", { name: /(Next →|Tiếp tục →|Tiếp theo →)/ }).click();
    await expect(page.getByRole("heading", { name: /(Step 2: Results|2 Kết quả|Bước 2)/ })).toBeVisible();
    await expect(page.getByText(/(Self-Assigned Grade|Tự chấm điểm|Đánh giá tự chấm)/).first()).toBeVisible();

    // 3. Advance to Step 3: Quality of Life
    await page.getByRole("button", { name: /(Next →|Tiếp tục →|Tiếp theo →)/ }).click();
    await expect(page.getByRole("heading", { name: /(Step 3: Quality of Life|Chất lượng|Bước 3)/ })).toBeVisible();
    await expect(
      page.getByText(
        /(Life balance is an illusion|Cân bằng cuộc sống là|ảo tưởng)/
      )
    ).toBeVisible();
    await expect(page.getByText(/(Spiritual|Tâm linh)/i)).toBeVisible();
    await expect(page.getByText(/(Physical|Thể chất)/i)).toBeVisible();

    // 4. Advance to Step 4: Success Disciplines
    await page.getByRole("button", { name: /(Next →|Tiếp tục →|Tiếp theo →)/ }).click();
    await expect(page.getByRole("heading", { name: /(Step 4: Success Disciplines|4 Kỷ luật|Bước 4)/ })).toBeVisible();
    await expect(
      page.getByText(
        /(Rate how you executed the system itself|Đánh giá mức độ bạn thực thi chính hệ thống|thực thi chính hệ thống)/i
      )
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: /(Vision|Tầm nhìn)/ })).toBeVisible();
    await expect(page.getByText(/(Performance Time \(Blocks\)|Quản trị thời gian hiệu suất|Thời gian hiệu suất)/)).toBeVisible();

    // 5. Advance to Step 5: Breakthroughs
    await page.getByRole("button", { name: /(Next →|Tiếp tục →|Tiếp theo →)/ }).click();
    await expect(page.getByRole("heading", { name: /(Step 5: Breakthroughs|5 Đột phá|Bước 5)/ })).toBeVisible();
    await expect(
      page.getByText(
        /(How must your thinking change|Tư duy của bạn phải thay đổi như thế nào)/
      )
    ).toBeVisible();

    // 6. Advance to Step 6: Reload
    await page.getByRole("button", { name: /(Next →|Tiếp tục →|Tiếp theo →)/ }).click();
    await expect(page.getByRole("heading", { name: /(Step 6: Reload|6 Tái khởi động|Bước 6)/ })).toBeVisible();
    await expect(
      page.getByText(
        /(Archiving freezes this cycle forever|Lưu trữ sẽ đóng băng chu kỳ này vĩnh viễn)/
      )
    ).toBeVisible();
  });

  test("History & Insights (F13) cycle list, deep-linked detail view, and cross-cycle insights", async ({ page }) => {
    await page.goto("/history");

    // 1. Header & Tabs
    await expect(page.getByRole("heading", { name: /(History|Lịch sử)/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /(Cycles|Các chu kỳ đã qua)/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /(Insights|Phân tích đa chu kỳ)/ })).toBeVisible();

    // 2. Verify seeded cycles exist in list
    await expect(page.getByText("Q3 2026 — Completed Example")).toBeVisible();
    await expect(page.getByText("Q4 2026 — Book Example")).toBeVisible();
    await expect(page.getByText(/(Review saved|Đã có đánh giá)/).first()).toBeVisible();

    // 3. Click archived cycle card to open detail view
    await page.getByText("Q3 2026 — Completed Example").click();

    // Verify detail view
    await expect(page.getByText(/(← Back to all cycles|← Quay lại danh sách chu kỳ)/)).toBeVisible();
    await expect(page.getByText(/(12-Week Execution History|Lịch sử thực thi 12 tuần)/)).toBeVisible();
    await expect(page.getByText(/(12-Week Retrospective|Đánh giá nhìn lại 12 tuần)/)).toBeVisible();
    await expect(page.getByText(/(Weekly Reflections|Chiêm nghiệm hàng tuần)/)).toBeVisible();

    // 4. Back to list
    await page.getByText(/(← Back to all cycles|← Quay lại danh sách chu kỳ)/).click();
    await expect(page.getByText("Q3 2026 — Completed Example")).toBeVisible();

    // 5. Switch to Insights tab
    await page.getByRole("button", { name: /(Insights|Phân tích đa chu kỳ)/ }).click();

    await expect(page.getByText(/(Best Cycle|Chu kỳ tốt nhất)/)).toBeVisible();
    await expect(page.getByText(/(Goals Achieved|Mục tiêu đã đạt)/)).toBeVisible();
    await expect(page.getByText(/(Quality of Life Movement|Chuyển động chất lượng sống)/)).toBeVisible();
    await expect(page.getByText(/(Cross-Cycle Execution Trend|Xu hướng thực thi qua các chu kỳ)/)).toBeVisible();
  });
});
