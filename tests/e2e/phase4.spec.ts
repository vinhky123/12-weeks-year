import { test, expect } from "@playwright/test";

test.describe("Phase 4 E2E (Antigravity UI Verification)", () => {
  test("Settings screen renders data portability, appearance, and language sections", async ({ page }) => {
    await page.goto("/settings");

    // 1. Header & Section Headings
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Data Portability" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Appearance" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Language" })).toBeVisible();

    // 2. Verbatim Intro Copy
    await expect(
      page.getByText("Your data is yours — one file, one folder, no cloud.")
    ).toBeVisible();

    // 3. Export Link
    const exportLink = page.getByRole("link", { name: "Download backup" });
    await expect(exportLink).toBeVisible();
    await expect(exportLink).toHaveAttribute("href", "/api/export");
    await expect(exportLink).toHaveAttribute("download");

    // 4. Backups List
    await expect(page.getByText("Automatic Backups")).toBeVisible();
    await expect(
      page.getByText("A checkpoint is saved automatically every time you close a week. The newest 5 are kept.")
    ).toBeVisible();
  });

  test("Import modal enforces double-confirm warning before database replacement", async ({ page }) => {
    await page.goto("/settings");

    // Create a dummy backup json payload
    const dummyPayload = JSON.stringify({
      format: "12-week-year-local-backup",
      version: 1,
      timestamp: new Date().toISOString(),
      tables: {},
    });

    // Upload via file input
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByText("Import backup").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "test-backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(dummyPayload),
    });

    // Modal appears with verbatim copy
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Confirm Database Import")).toBeVisible();
    await expect(
      page.getByText(
        "Importing replaces EVERYTHING — cycles, goals, scores, reviews. An automatic backup of the current data is saved first. Import now?"
      )
    ).toBeVisible();

    // Cancel closes the modal
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("Theme switch toggles dark class on html root element", async ({ page }) => {
    await page.goto("/settings");

    // Select Dark
    await page.getByRole("button", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    // Select Light
    await page.getByRole("button", { name: "Light" }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);

    // Restore System
    await page.getByRole("button", { name: "System" }).click();
  });

  test("Language switch flips navigation and UI labels between English and Vietnamese", async ({ page }) => {
    await page.goto("/settings");

    // Switch to Vietnamese
    await page.getByRole("button", { name: "Tiếng Việt" }).click();

    // Verify Vietnamese Nav Labels
    await expect(page.getByRole("link", { name: /Bảng điều khiển/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Hôm nay/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Kế hoạch 12 tuần/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Cài đặt/ })).toBeVisible();

    // Navigate to Today and verify Vietnamese heading
    await page.goto("/today");
    await expect(page.getByRole("heading", { name: "Hôm nay" })).toBeVisible();

    // Switch back to English
    await page.goto("/settings");
    await page.getByRole("button", { name: "English" }).click();

    // Verify English Nav Labels restored
    await expect(page.getByRole("link", { name: /Dashboard/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Today/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /12-Week Plan/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Settings/ })).toBeVisible();
  });
});
