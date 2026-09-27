import { chromium } from "@playwright/test";
const BASE = "http://localhost:3210";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const shots = [
  ["/plan", "h1", 2500],
  ["/week", "h1", 2500],
  ["/measures", "h1", 2500],
  ["/review", "h1", 2500],
  ["/settings", "h1", 2500],
  ["/history", "h1", 2500],
  ["/model-week", "h1", 2500],
  ["/wam", "h1", 2500],
];
for (const [route, sel, wait] of shots) {
  await page.goto(BASE + route, { waitUntil: "load" });
  await page.locator(sel).first().waitFor({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(wait);
  const name = route.slice(1);
  await page.screenshot({ path: `ui-shots/${name}.png`, fullPage: true });
  console.log("shot", name);
}
await browser.close();
