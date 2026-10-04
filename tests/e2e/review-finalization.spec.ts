import { expect, test, type Page } from "@playwright/test";
import type { CycleReviewDto } from "../../src/lib/contracts";

const cycle = {
  id: 41,
  name: "Review finalization fixture",
  startDate: "2026-07-06",
  status: "review",
  createdAt: "2026-07-01T00:00:00.000Z",
  archivedAt: null,
} as const;

const goal = {
  id: 411,
  cycleId: cycle.id,
  title: "Ship the durable review",
  why: "The owner can resume with confidence.",
  lagMetricName: "Review journeys",
  lagUnit: "journeys",
  lagStart: 0,
  lagTarget: 1,
  deadlineWeek: 12,
  status: "active",
  sortOrder: 0,
  createdAt: "2026-07-01T00:00:00.000Z",
  tactics: [],
} as const;

const secondGoal = {
  ...goal,
  id: 412,
  title: "Keep semantic comparisons stable",
  sortOrder: 1,
} as const;

const baseReview = {
  id: 91,
  cycleId: cycle.id,
  status: "draft" as const,
  results: [{ goalId: goal.id, title: goal.title, percentComplete: 100, avgScore: 88, grade: 9, note: "Kept scope tight." }],
  qol: [
    "Spiritual", "Spouse/Key Relationship", "Family", "Business", "Personal", "Physical",
  ].map((area) => ({ area, rating: 5, anchor1: "", anchor10: "" })),
  disciplines: [
    "Vision", "12-Week Planning", "Weekly Routine (Score · Plan · WAM)", "Performance Time (Blocks)", "Key Measures",
  ].map((name) => ({ name, rating: 5 })),
  breakthroughs: null,
  nextCycleNotes: null,
  updatedAt: "2026-10-04T00:00:00.000Z",
};

async function mockReview(page: Page, options: {
  initialReview?: CycleReviewDto;
  goals?: Array<typeof goal | typeof secondGoal>;
  finalizeReplies?: Array<"error" | "draft" | "complete">;
} = {}) {
  const requests: Array<{ method: string; pathname: string; body: string | null }> = [];
  let finalizeAttempts = 0;
  let review: CycleReviewDto = options.initialReview ?? baseReview;
  const goals = options.goals ?? [goal];
  const finalizeReplies = options.finalizeReplies ?? ["error", "complete"];
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    requests.push({ method: request.method(), pathname: url.pathname, body: request.postData() });
    const fulfill = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname === "/api/settings") return fulfill({ settings: { id: 1, currentCycleId: cycle.id, weekStartsOn: 1, theme: "light", locale: "en", createdAt: cycle.createdAt } });
    if (url.pathname === "/api/cycles") return fulfill([cycle]);
    if (url.pathname === `/api/cycles/${cycle.id}`) return fulfill({ cycle, goals });
    if (url.pathname === `/api/cycles/${cycle.id}/scores`) return fulfill({ currentWeek: 13, weeks: [], goals: [] });
    if (url.pathname === `/api/cycles/${cycle.id}/review/celebration`) return fulfill({ cycleId: cycle.id, cycleName: cycle.name, bestWeek: null, scoredWeeks: 0, averageScore: null, goalsCompleted: 1, goalsTotal: 1 });
    if (url.pathname === `/api/cycles/${cycle.id}/review` && request.method() === "GET") return fulfill({ review });
    if (url.pathname === `/api/cycles/${cycle.id}/review` && request.method() === "PUT") {
      review = { ...review, ...JSON.parse(request.postData() ?? "{}"), status: "draft" };
      return fulfill({ review });
    }
    if (url.pathname === `/api/cycles/${cycle.id}/review/finalize`) {
      const reply = finalizeReplies[finalizeAttempts] ?? "complete";
      finalizeAttempts += 1;
      if (reply === "error") return fulfill({ error: "Finish every scored section before finalizing.", details: { issues: [{ section: "results", message: "Confirm the result." }] } }, 422);
      review = { ...review, status: reply, updatedAt: "2026-10-04T00:01:00.000Z" };
      return fulfill({ review });
    }
    return fulfill({ error: `Unhandled mocked request: ${request.method()} ${url.pathname}` }, 501);
  });
  return requests;
}

test("draft resumes at notes and advances only after server-confirmed finalization", async ({ page }) => {
  const requests = await mockReview(page);
  await page.goto(`/review?id=${cycle.id}`);

  const heading = page.getByRole("heading", { name: /Bước 5: Những đột phá/i });
  await expect(heading).toBeVisible();
  await expect(heading).toBeFocused();

  const finish = page.getByRole("button", { name: /^Finish review/ });
  await finish.click();
  await expect(page.getByRole("alert").filter({ hasText: "Finish every scored section" })).toContainText("Confirm the result.");
  await expect(heading).toBeVisible();
  await expect(finish).toBeFocused();

  await finish.click();
  await expect(page.getByRole("heading", { name: /Bước 6:/i })).toBeVisible();

  expect(requests.filter((request) => request.pathname.endsWith("/review/finalize"))).toHaveLength(2);
  const puts = requests.filter((request) => request.method === "PUT");
  expect(puts).toHaveLength(1);
  expect(JSON.parse(puts[0]!.body ?? "{}")).toEqual({ breakthroughs: "", nextCycleNotes: "" });
  expect(requests.filter((request) => request.pathname.endsWith("/archive"))).toHaveLength(0);
});

test("a 200 draft finalize response stays on notes until complete is confirmed", async ({ page }) => {
  const requests = await mockReview(page, { finalizeReplies: ["draft", "complete"] });
  await page.goto(`/review?id=${cycle.id}`);

  const notesHeading = page.getByRole("heading", { name: /Bước 5:/ });
  const finish = page.getByRole("button", { name: /^Finish review/ });
  await finish.click();
  await expect(notesHeading).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: /confirm completion/i })).toBeVisible();
  await expect(finish).toBeFocused();
  await expect(page.getByRole("heading", { name: /Bước 6:/ })).toHaveCount(0);

  await finish.click();
  await expect(page.getByRole("heading", { name: /Bước 6:/ })).toBeVisible();
  expect(requests.filter((request) => request.pathname.endsWith("/review/finalize"))).toHaveLength(2);
  expect(requests.filter((request) => request.pathname.endsWith("/archive"))).toHaveLength(0);
});

test("reordered confirmed rows navigate without a PUT or phantom draft", async ({ page }) => {
  const completeReview: CycleReviewDto = {
    ...baseReview,
    status: "complete",
    results: [
      { goalId: secondGoal.id, title: secondGoal.title, percentComplete: null, avgScore: null, grade: 5, note: "" },
      baseReview.results[0]!,
    ],
    qol: [...baseReview.qol].reverse(),
    disciplines: [...baseReview.disciplines].reverse(),
    breakthroughs: "",
    nextCycleNotes: "",
  };
  const requests = await mockReview(page, { initialReview: completeReview, goals: [goal, secondGoal], finalizeReplies: ["complete"] });
  await page.goto(`/review?id=${cycle.id}`);
  await expect(page.getByRole("heading", { name: /Bước 6:/ })).toBeVisible();

  for (const [button, heading] of [
    [/Results|Kết quả/, /Bước 2:/],
    [/Quality of Life|Chất lượng sống/, /Bước 3:/],
    [/Disciplines|Kỷ luật/, /Bước 4:/],
    [/Breakthroughs|Đột phá/, /Bước 5:/],
  ] as const) {
    await page.getByRole("button", { name: button }).click();
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await page.getByRole("button", { name: /Continue|Tiếp tục|Finish review|Hoàn tất đánh giá/ }).click();
  }
  await expect(page.getByRole("heading", { name: /Bước 6:/ })).toBeVisible();
  expect(requests.filter((request) => request.method === "PUT")).toHaveLength(0);
  expect(requests.filter((request) => request.pathname.endsWith("/review/finalize"))).toHaveLength(0);
});

test("real review resumes partial saves, clears notes, and stays complete on read navigation", async ({ page, request }) => {
  const suffix = `${Date.now()}-${test.info().workerIndex}`;
  const headers = { "x-twy-today": "2026-10-04" };
  const created = await request.post("/api/cycles", { headers, data: { name: `C08a ${suffix}`, startDate: "2026-07-06" } });
  expect(created.ok()).toBeTruthy();
  const createdCycle = await created.json();
  const cycleId = createdCycle.id as number;
  const goalResponse = await request.post(`/api/cycles/${cycleId}/goals`, { headers, data: { title: `Durable review ${suffix}`, why: "Resume safely", lagMetricName: "Journeys", lagUnit: "journeys", lagStart: 0, lagTarget: 1, deadlineWeek: 12 } });
  expect(goalResponse.ok()).toBeTruthy();

  const writes: string[] = [];
  page.on("request", (browserRequest) => {
    if (["PUT", "POST"].includes(browserRequest.method()) && browserRequest.url().includes(`/api/cycles/${cycleId}/review`)) writes.push(`${browserRequest.method()} ${new URL(browserRequest.url()).pathname}`);
  });
  await page.goto(`/review?id=${cycleId}`);
  await page.getByRole("button", { name: /Continue|Tiếp tục/ }).click();
  await expect(page.getByRole("heading", { name: /Bước 2:/ })).toBeFocused();
  await page.getByRole("button", { name: /Continue|Tiếp tục/ }).click();
  await expect(page.getByRole("heading", { name: /Bước 3:/ })).toBeFocused();

  await page.reload();
  await expect(page.getByRole("heading", { name: /Bước 3:/ })).toBeVisible();
  await page.getByRole("button", { name: /Continue|Tiếp tục/ }).click();
  await expect(page.getByRole("heading", { name: /Bước 4:/ })).toBeVisible();
  await page.getByRole("button", { name: /Continue|Tiếp tục/ }).click();
  await expect(page.getByRole("heading", { name: /Bước 5:/ })).toBeVisible();
  const textareas = page.getByRole("textbox");
  await textareas.nth(0).fill("Temporary lesson");
  await textareas.nth(1).fill("Temporary next-cycle note");
  await page.getByRole("button", { name: /Finish review|Hoàn tất đánh giá/ }).click();
  await expect(page.getByRole("heading", { name: /Bước 6:/ })).toBeVisible();

  await page.getByRole("button", { name: /Breakthroughs|Đột phá/ }).click();
  await textareas.nth(0).fill("");
  await textareas.nth(1).fill("");
  await page.getByRole("button", { name: /Continue|Finish review|Tiếp tục|Hoàn tất đánh giá/ }).click();
  await expect(page.getByRole("heading", { name: /Bước 6:/ })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: /Bước 6:/ })).toBeVisible();
  const writesBeforeRead = writes.length;
  await page.getByRole("button", { name: /Results|Kết quả/ }).click();
  await page.getByRole("button", { name: /Continue|Tiếp tục/ }).click();
  expect(writes).toHaveLength(writesBeforeRead);

  const reviewResponse = await request.get(`/api/cycles/${cycleId}/review`, { headers });
  const persisted = await reviewResponse.json();
  expect(persisted.review.status).toBe("complete");
  expect(persisted.review.breakthroughs).toBe("");
  expect(persisted.review.nextCycleNotes).toBe("");
  expect(writes.filter((entry) => entry.endsWith("/review/finalize"))).toHaveLength(2);
  expect(writes.some((entry) => entry === `PUT /api/cycles/${cycleId}/review`)).toBeTruthy();
});

test("review controls fit a 390px viewport and expose semantic step state", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockReview(page);
  await page.goto(`/review?id=${cycle.id}`);
  await expect(page.locator('button[aria-current="step"]')).toHaveAttribute("aria-current", "step");
  const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth }));
  expect(widths.page).toBeLessThanOrEqual(widths.viewport);
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: /^Finish review/ })).toBeVisible();
});
