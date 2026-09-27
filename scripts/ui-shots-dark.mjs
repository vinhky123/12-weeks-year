import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3210/settings", { waitUntil: "load" });
await page.getByRole("button", { name: "Dark" }).click().catch(async () => {
  await page.getByText("Dark", { exact: true }).first().click();
});
await page.waitForTimeout(600);
await page.goto("http://localhost:3210/", { waitUntil: "load" });
await page.waitForTimeout(1500);
await page.screenshot({ path: "ui-shots/dashboard-dark.png", fullPage: true });
console.log("shot dark");
await page.goto("http://localhost:3210/today", { waitUntil: "load" });
await page.waitForTimeout(1500);
await page.screenshot({ path: "ui-shots/today-dark.png", fullPage: true });
console.log("shot today-dark");
await browser.close();
