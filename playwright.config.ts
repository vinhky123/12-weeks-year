import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  workers: 1,
  use: { baseURL: "http://localhost:3210" },
  webServer: {
    command: "npm run dev -- -p 3210",
    url: "http://localhost:3210",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
