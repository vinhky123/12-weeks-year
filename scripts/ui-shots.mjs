import { chromium } from "@playwright/test";
const BASE = "http://localhost:3210";
const OUT = "ui-shots";
import fs from "node:fs";
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const routes = ["/", "/today", "/plan", "/week", "/vision", "/measures", "/model-week", "/wam", "/review", "/history", "/settings"];
for (const r of routes) {
  await page.goto(BASE + r, { waitUntil: "load" });
  await page.waitForTimeout(600);
  const name = r === "/" ? "dashboard" : r.slice(1);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log("shot", name);
}
// dark mode
await page.goto(BASE + "/settings", { waitUntil: "load" });
await page.getByText("Dark", { exact: false }).first().click().catch(() => {});
await page.waitForTimeout(400);
await page.goto(BASE + "/", { waitUntil: "load" });
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/dashboard-dark.png`, fullPage: true });
console.log("shot dashboard-dark");
// today at mobile width
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE + "/today", { waitUntil: "load" });
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/today-mobile.png`, fullPage: true });
console.log("shot today-mobile");
await browser.close();
