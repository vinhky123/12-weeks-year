import { test, expect } from "@playwright/test";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

test.describe("Phase 1 Core Loop E2E (Antigravity UI Verification)", () => {
  test("Dashboard (F6) renders active cycle, next ritual, scores, and goal cards", async ({ page }) => {
    await page.goto("/");

    // 1. Header Row
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByText(/(days left in the year|ngày trong năm)/)).toBeVisible();

    // 2. Daily Principle
    const quote = page.locator("text=/“.*”/").first();
    await expect(quote).toBeVisible();

    // 3. Next Ritual Card
    await expect(page.getByText(/(Next Ritual|Nghi thức tiếp theo)/)).toBeVisible();

    // 4. Score Panel
    await expect(page.getByText(/(Execution Score|Điểm thực thi)/)).toBeVisible();
    await expect(
      page.getByText(/(85% weekly execution is the benchmark — below 65, revise the plan\.|85% thực hiện hàng tuần là chuẩn — dưới 65, hãy sửa kế hoạch\.)/),
    ).toBeVisible();

    // 5. 12-Week History Strip
    await expect(page.getByText(/(12-Week Execution History|Lịch sử thực thi 12 tuần)/)).toBeVisible();
    for (let w = 1; w <= 12; w++) {
      await expect(page.getByRole("link", { name: new RegExp(`W${w}\\b`) })).toBeVisible();
    }

    // Week 1 was closed in seed data at 92%
    const w1Link = page.getByRole("link", { name: /W1\b/ });
    await expect(w1Link).toContainText("92%");

    // 6. Goals List
    await expect(page.getByRole("heading", { name: /(Goals|Mục tiêu) \(\d\/3\)/ })).toBeVisible();
  });

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

  test("12-Week Plan Builder (F2) displays goals, tactics, and validation", async ({ page }) => {
    await page.goto("/plan");

    // Cycle bar
    await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();

    // Goals header
    await expect(page.getByRole("heading", { name: /(12-Week Goals|Mục tiêu 12 tuần)/ })).toBeVisible();

    // Check goal cards exist
    const goalCards = page.locator("h3.text-lg");
    await expect(goalCards.first()).toBeVisible();

    // Verify tactics are listed with due badges (e.g. 3×/week, W3)
    await expect(page.getByText(/(Tactics|Chiến thuật) \(\d+\)/).first()).toBeVisible();

    // Test Goal Form Modal validation
    const addGoalBtn = page.getByRole("button", { name: /^\+ (Add Goal|Thêm mục tiêu)$/ });
    if (await addGoalBtn.isEnabled()) {
      await addGoalBtn.click();
      await expect(page.getByRole("heading", { name: /(Add 12-Week Goal|Thêm mục tiêu 12 tuần)/ })).toBeVisible();

      // Submit empty form to trigger validation
      await page.getByRole("button", { name: /^(Add Goal|Thêm mục tiêu)$/ }).click();
      await expect(page.getByText(/(Goal title is required|Tiêu đề mục tiêu là bắt buộc)/)).toBeVisible();

      // Close modal
      await page.getByRole("button", { name: /^(Cancel|Hủy)$/ }).click();
    }
  });

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
});
