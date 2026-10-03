import { test, expect } from "@playwright/test";
import { mockUiWorkspace } from "./fixtures/uiWorkspace";

test.describe("dialog step focus and disclosure state", () => {
  test("close-week transitions focus each new step and preserves answers after a failed save", async ({ page }) => {
    const fixture = await mockUiWorkspace(page, { manualClose: true });
    await page.goto("/week?week=3");

    const opener = page.getByRole("button", { name: "Close week 3", exact: true });
    await opener.click();
    const dialog = page.getByRole("dialog", { name: "Close week 3" });

    await dialog.getByRole("button", { name: "Continue", exact: true }).click();
    const resultsHeading = dialog.getByRole("heading", { name: "Update results", exact: true });
    await expect(resultsHeading).toBeFocused();

    const lagInput = dialog.getByLabel(/this week:/);
    await lagInput.fill("4");
    await dialog.getByRole("button", { name: "Continue", exact: true }).click();
    const reflectionHeading = dialog.getByRole("heading", { name: "Reflect and close", exact: true });
    await expect(reflectionHeading).toBeFocused();

    const reflection = dialog.getByRole("textbox", { name: "Weekly reflection" });
    await reflection.fill("Keep the proof close to the user.");
    await dialog.getByRole("button", { name: "Back", exact: true }).click();
    await expect(resultsHeading).toBeFocused();
    await expect(lagInput).toHaveValue("4");

    await dialog.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(reflectionHeading).toBeFocused();
    await expect(reflection).toHaveValue("Keep the proof close to the user.");

    const save = dialog.getByRole("button", { name: "Close week 3", exact: true });
    await save.click();
    await expect(save).toBeDisabled();

    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveJSProperty("open", true);

    fixture.resolveClose(500);
    await expect(dialog.getByRole("alert")).toContainText("Could not close week.");
    await expect(reflection).toHaveValue("Keep the proof close to the user.");
    await expect(save).toBeFocused();
  });

  test("close-week success focuses its confirmation after the closed plan is adopted", async ({ page }) => {
    const fixture = await mockUiWorkspace(page, { manualClose: true });
    await page.goto("/week?week=3&close=1");

    const dialog = page.getByRole("dialog", { name: "Close week 3" });
    await dialog.getByRole("button", { name: "Continue", exact: true }).click();
    await dialog.getByRole("button", { name: "Continue", exact: true }).click();
    await dialog.getByRole("button", { name: "Close week 3", exact: true }).click();
    fixture.resolveClose();

    const successHeading = dialog.getByRole("heading", { name: "Week closed", exact: true });
    await expect(successHeading).toBeFocused();
    await expect(dialog.getByRole("heading", { name: "Week 3 is closed", exact: true })).toBeVisible();
    await expect(page.getByText("closed", { exact: true })).toBeVisible();
  });

  test("repeated Escape cannot dismiss a manually gated close save", async ({ page }) => {
    const fixture = await mockUiWorkspace(page, { manualClose: true });
    await page.goto("/week?week=3&close=1");

    const dialog = page.getByRole("dialog", { name: "Close week 3" });
    await dialog.getByRole("button", { name: "Continue", exact: true }).click();
    await dialog.getByRole("button", { name: "Continue", exact: true }).click();
    const save = dialog.getByRole("button", { name: "Close week 3", exact: true });
    await save.click();
    await expect(save).toBeDisabled();
    await expect(save).toBeFocused();

    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");

    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveJSProperty("open", true);
    await expect(save).toBeFocused();

    fixture.resolveClose(500);
    await expect(dialog.getByRole("alert")).toContainText("Could not close week.");
    await expect(save).toBeFocused();
  });

  test("normal Escape dismisses the dialog and restores its trigger focus", async ({ page }) => {
    await mockUiWorkspace(page);
    await page.goto("/week?week=3");

    const opener = page.getByRole("button", { name: "Close week 3", exact: true });
    await opener.click();
    const dialog = page.getByRole("dialog", { name: "Close week 3" });
    await page.keyboard.press("Escape");

    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test("Rest of week exposes an accurate expanded state and keeps summary focus", async ({ page }) => {
    await mockUiWorkspace(page);
    await page.goto("/today");

    const disclosure = page.getByRole("button", { name: /Rest of week/ });
    await expect(disclosure).toHaveAttribute("aria-expanded", "false");

    await disclosure.click();
    await expect(disclosure).toHaveAttribute("aria-expanded", "true");
    await expect(disclosure).toBeFocused();

    await disclosure.click();
    await expect(disclosure).toHaveAttribute("aria-expanded", "false");
    await expect(disclosure).toBeFocused();
  });
});
