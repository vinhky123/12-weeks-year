import { test, expect } from "@playwright/test";

test.describe("Phase 2 E2E (Antigravity UI Verification)", () => {
  test("Vision (F7) displays single consolidated vision card, supports dirty tracking, saving, and persistence", async ({ page }) => {
    await page.goto("/vision");

    // 1. Header
    await expect(
      page.getByRole("heading", { level: 1, name: /^(Vision|Tầm nhìn)$/ })
    ).toBeVisible();

    // 2. Example Vision badge and single consolidated card
    await expect(page.getByText(/(Ví dụ tầm nhìn · Example Vision|Ví dụ tầm nhìn|Example Vision)/)).toBeVisible();

    // 3. Pitfall micro-copy
    await expect(
      page.getByText(/(A vision that isn't personal|Tầm nhìn không mang tính cá nhân)/)
    ).toBeVisible();

    // 4. Save button disabled initially (not dirty)
    const saveBtn = page.getByRole("button", { name: /(Save|Lưu)/ });
    await expect(saveBtn).toBeDisabled();

    // 5. Edit single vision card
    const visionTextarea = page.locator("textarea").first();
    const originalText = await visionTextarea.inputValue();
    await visionTextarea.fill(`${originalText} [Refined for execution]`);

    // Verify dirty indicator and enabled button
    await expect(page.getByText(/(\(unsaved changes\)|\(chưa lưu thay đổi\))/)).toBeVisible();
    await expect(saveBtn).toBeEnabled();

    // 6. Save
    await saveBtn.click();
    await expect(
      page.getByText(/^(Vision saved successfully|Đã lưu tầm nhìn thành công)$/)
    ).toBeVisible();

    // 7. Reload and verify persistence
    await page.reload();
    await expect(page.locator("textarea").first()).toHaveValue(`${originalText} [Refined for execution]`);
  });

  test("Measures (F8) renders score trend chart, lag progress, lead indicators, and supports lead logging & CRUD", async ({ page }) => {
    await page.goto("/measures");

    // 1. Header & Verbatim Benchmark
    await expect(
      page.getByRole("heading", { level: 1, name: /^(Measures|Chỉ số)$/ })
    ).toBeVisible();
    await expect(
      page.getByText(/(85% weekly execution is the benchmark — below 65, revise the plan\.|85% thực hiện hàng tuần là chuẩn — dưới 65, hãy sửa kế hoạch\.)/)
    ).toBeVisible();

    // 2. Score Trend Chart
    await expect(page.getByText(/(Execution Score Trend|Xu hướng điểm thực thi)/)).toBeVisible();
    await expect(page.getByText(/(85% benchmark|Chuẩn 85%)/, { exact: true })).toBeVisible();
    // 12 week slots
    for (let w = 1; w <= 12; w++) {
      await expect(page.getByText(new RegExp(`^(W|T)${w}$`))).toBeVisible();
    }

    // 3. Goal Lag Section (Weight goal from seed)
    await expect(page.getByText(/(Target: Weight|Chỉ số đích: Weight|Mục tiêu: Weight|Mục tiêu: Cân nặng).*180.*170/)).toBeVisible();
    await expect(page.getByText(/178\.5\s*(lbs|kg)?/).first()).toBeVisible();
    await expect(page.getByText(/(Log lag at week close →|Cập nhật kết quả khi đóng tuần →|Ghi nhận số liệu kết quả khi chốt tuần →)/).first()).toBeVisible();

    // 4. Lead Indicators
    await expect(page.getByText(/(Lead indicators are the activities you control|Chỉ số dẫn dắt là những)/).first()).toBeVisible();
    await expect(page.getByText(/Workouts completed/)).toBeVisible();

    // 5. Test Log Lead Value (+log popover)
    const logBtn = page.getByRole("button", { name: /(\+log|\+ghi nhận)/ }).first();
    await logBtn.click();
    await expect(page.getByRole("heading", { name: /(Log Lead Activity|Ghi nhận hoạt động dẫn dắt)/ })).toBeVisible();

    const valueInput = page.locator("input[placeholder*='3']");
    await valueInput.fill("4");
    await page.getByRole("button", { name: /(Log value|Ghi nhận giá trị|Ghi nhận)/ }).click();

    // Check modal closed and value updated
    await expect(page.getByRole("heading", { name: /(Log Lead Activity|Ghi nhận hoạt động dẫn dắt)/ })).not.toBeVisible();
    await expect(page.getByText(/4 \/ 3/)).toBeVisible();

    // 6. Test Add Lead Indicator
    const addLeadBtn = page.getByRole("button", { name: /(\+ Add lead indicator|\+ Thêm chỉ số dẫn dắt)/ }).first();
    await addLeadBtn.click();
    await expect(page.locator("span", { hasText: /^(Add Lead Measure|Thêm chỉ số dẫn dắt)$/ })).toBeVisible();

    await page.locator("input[placeholder*='Activity name'], input[placeholder*='Tên hoạt động']").fill("Daily water intake");
    await page.locator("input[type='number']").last().fill("7");
    await page.getByRole("button", { name: /^(Add|Thêm)$/ }).click();

    // Verify newly added measure appears
    await expect(page.getByText("Daily water intake")).toBeVisible();
    await expect(page.getByText(/(Target: 7x \/ week|Mục tiêu: 7 lần \/ tuần|Mục tiêu: 7x \/ tuần)/)).toBeVisible();

    // 7. Delete newly added lead indicator
    page.on("dialog", (dialog) => dialog.accept());
    const waterRow = page.locator("div.rounded-lg", { hasText: "Daily water intake" }).last();
    await waterRow.locator("button[title*='Remove lead measure'], button[title*='Xóa']").click();
    await expect(page.getByText("Daily water intake")).not.toBeVisible();
  });

  test("Model Week (F9) validates book quantities, renders 7-day grid, and handles block CRUD", async ({ page }) => {
    await page.goto("/model-week");

    // 1. Tagline
    await expect(page.getByText(/(Control your time, or forfeit control of your results\.|Kiểm soát thời gian của bạn, hoặc bạn sẽ đánh mất quyền kiểm soát kết quả\.|Làm chủ thời gian của bạn)/)).toBeVisible();

    // 2. Initial state: seeded with 10 blocks -> model week complete
    await expect(
      page.getByText(/(Model week complete — the book's quantities are in place\.|Tuần mẫu hoàn chỉnh — các khối thời gian theo phương pháp đã được thiết lập đầy đủ\.|Tuần mẫu hoàn tất)/)
    ).toBeVisible();

    // 3. Grid: Mon-Sun columns
    await expect(page.getByText(/(Mon|T2)/, { exact: true })).toBeVisible();
    await expect(page.getByText(/(Sun|CN)/, { exact: true })).toBeVisible();

    // 4. Check book block types exist on the grid
    await expect(page.getByText(/(Strategic|Chiến lược)/).first()).toBeVisible();
    await expect(page.getByText(/(Buffer|Đệm)/).first()).toBeVisible();
    await expect(page.getByText(/(Breakout|Bứt phá|Nghỉ ngơi)/).first()).toBeVisible();
    await expect(page.getByText(/(Planning|Kế hoạch|Lập kế hoạch)/).first()).toBeVisible();
    await expect(page.getByText(/(WAM|Họp WAM)/).first()).toBeVisible();

    // 5. Test Add Block
    await page.getByRole("button", { name: /(\+ Add block|\+ Thêm khung giờ|\+ Thêm khối)/ }).click();
    await expect(page.getByRole("heading", { name: /(Add Time Block|Thêm khung giờ|Thêm khối thời gian)/ })).toBeVisible();

    // Fill form
    await page.locator("input[placeholder*='Deep work'], input[placeholder*='Công việc sâu'], input[placeholder*='Làm việc sâu']").fill("Ad-hoc sprint block");
    await page.locator("form button[type='submit']").click();

    // Verify new block is placed
    await expect(page.getByText("Ad-hoc sprint block")).toBeVisible();

    // 6. Test Edit Block
    const blockCard = page.locator("div.group", { hasText: "Ad-hoc sprint block" }).first();
    await blockCard.locator("button[title*='Edit block'], button[title*='Chỉnh sửa khung giờ'], button[title*='Chỉnh sửa']").click();
    await expect(page.getByRole("heading", { name: /(Edit Time Block|Chỉnh sửa khung giờ|Sửa khung giờ|Sửa khối thời gian)/ })).toBeVisible();

    await page.locator("input[placeholder*='Deep work'], input[placeholder*='Công việc sâu'], input[placeholder*='Làm việc sâu']").fill("Focused revision sprint");
    await page.getByRole("button", { name: /(Save changes|Lưu thay đổi)/ }).click();
    await expect(page.getByText("Focused revision sprint")).toBeVisible();

    // 7. Test Delete Block
    const cardToDelete = page.locator("div.group", { hasText: "Focused revision sprint" }).first();
    await cardToDelete.locator("button[title*='Delete block'], button[title*='Xóa khung giờ'], button[title*='Xóa']").click();
    await expect(page.getByText("Focused revision sprint")).not.toBeVisible();

    // 8. Micro-copy footer
    await expect(
      page.getByText(/(Being busy is a form of laziness|Bận rộn là một.*lười biếng)/)
    ).toBeVisible();
  });
});
