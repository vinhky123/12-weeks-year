import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3210/guide", { waitUntil: "load" });
await page.waitForTimeout(1200);
await page.screenshot({ path: "ui-shots/guide-top.png" });
await page.screenshot({ path: "ui-shots/guide-full.png", fullPage: true });
console.log("shot guide");
await browser.close();
