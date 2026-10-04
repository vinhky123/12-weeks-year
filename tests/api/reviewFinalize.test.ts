/**
 * Review draft and finalization contract — saved answers stay drafts until the owner finalizes them, walked
 * through the real route handlers against a temp database exactly as the UI will.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { REVIEW_FINALIZE_ERROR_DETAILS_DTO, REVIEW_FINALIZE_RESULT_DTO } from "../../src/lib/contracts";

process.env.TWY_DB_PATH = path.join(os.tmpdir(), `twy-review-finalize-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);

const cyclesRoute = await import("../../src/app/api/cycles/route");
const goalsRoute = await import("../../src/app/api/cycles/[id]/goals/route");
const archiveRoute = await import("../../src/app/api/cycles/[id]/archive/route");
const reviewRoute = await import("../../src/app/api/cycles/[id]/review/route");
const finalizeRoute = await import("../../src/app/api/cycles/[id]/review/finalize/route");

const TODAY = "2026-10-05";
const AREAS = ["Spiritual", "Spouse/Key Relationship", "Family", "Business", "Personal", "Physical"];
const DISCIPLINES = ["Vision", "12-Week Planning", "Weekly Routine (Score · Plan · WAM)", "Performance Time (Blocks)", "Key Measures"];
const FULL_REVIEW = {
  qol: AREAS.map((area, index) => ({ area, rating: 5 + index })),
  disciplines: DISCIPLINES.map((name, index) => ({ name, rating: 4 + index })),
  breakthroughs: "Protect the first hour.",
};

function req(method: string, bodyJson?: unknown, today = TODAY): Request {
  return new Request("http://localhost/x", {
    method,
    headers: { "content-type": "application/json", "x-twy-today": today },
    body: bodyJson === undefined ? undefined : JSON.stringify(bodyJson),
  });
}

function ctx(id: string | number): { params: Promise<any> } {
  return { params: Promise.resolve({ id: String(id) }) };
}

async function json(res: Response) {
  return (await res.json()) as Record<string, any>;
}

let cycleCount = 0;

async function createCycleWithGoal() {
  const cycle = await json(await cyclesRoute.POST(req("POST", { name: `Review cycle ${++cycleCount}`, startDate: "2026-07-13" })));
  await goalsRoute.POST(
    req("POST", { title: "Lose 10 lbs", why: "Energy", lagMetricName: "Weight", lagUnit: "lbs", lagStart: 180, lagTarget: 170 }),
    ctx(cycle.id),
  );
  return cycle.id as number;
}

const getReview = async (cycleId: number) => (await json(await reviewRoute.GET(req("GET"), ctx(cycleId)))).review;
const save = (cycleId: number, patch: unknown) => reviewRoute.PUT(req("PUT", patch), ctx(cycleId));
const finalize = (cycleId: number, today?: string) => finalizeRoute.POST(req("POST", undefined, today), ctx(cycleId));

describe("review finalization API", () => {
  it("answers 409 while no review has been saved, then 422 with per-section details for a draft that is not finished", async () => {
    const cycleId = await createCycleWithGoal();

    const missing = await finalize(cycleId);
    expect(missing.status).toBe(409);
    expect((await json(missing)).error).toMatch(/no review/i);
    expect(await getReview(cycleId)).toBeNull();

    const saved = await json(await save(cycleId, { qol: [{ area: "Physical", rating: 7 }], breakthroughs: "A start" }));
    expect(saved.review.status).toBe("draft");

    const refused = await finalize(cycleId);
    expect(refused.status).toBe(422);
    const body = await json(refused);
    expect(body.error).toMatch(/finalize/i);
    const details = REVIEW_FINALIZE_ERROR_DETAILS_DTO.parse(body.details);
    expect(details.issues.map((issue) => issue.section)).toEqual(["qol", "disciplines"]);
    expect(details.issues[0]!.message).toContain("Spiritual");
    expect(details.issues[1]!.message).toContain("Vision");
    expect(await getReview(cycleId)).toEqual(saved.review); // nothing was written
  });

  it("never lets a save complete a review, even when the body says it is complete", async () => {
    const cycleId = await createCycleWithGoal();

    const saved = await json(await save(cycleId, { ...FULL_REVIEW, status: "complete" }));

    expect(saved.review.status).toBe("draft");
    expect((await getReview(cycleId)).status).toBe("draft");
  });

  it("finalizes a fully defined draft with the request date, repeats safely and reopens on the next edit", async () => {
    const cycleId = await createCycleWithGoal();
    const draft = (await json(await save(cycleId, FULL_REVIEW))).review;

    const done = await finalize(cycleId, "2026-10-06");
    expect(done.status).toBe(200);
    const { review } = REVIEW_FINALIZE_RESULT_DTO.parse(await done.json());
    expect(review).toEqual({ ...draft, status: "complete", updatedAt: "2026-10-06" });
    expect(await getReview(cycleId)).toEqual(review);

    const again = await finalize(cycleId, "2026-12-01");
    expect(again.status).toBe(200);
    expect(REVIEW_FINALIZE_RESULT_DTO.parse(await again.json()).review).toEqual(review);

    const edited = await json(await save(cycleId, { breakthroughs: "Edited." }));
    expect(edited.review).toMatchObject({ status: "draft", breakthroughs: "Edited." });
    expect((await getReview(cycleId)).status).toBe("draft");

    const refinalized = await json(await finalize(cycleId, "2026-10-08"));
    expect(refinalized.review).toMatchObject({ status: "complete", breakthroughs: "Edited.", updatedAt: "2026-10-08" });
  });

  it("rejects saving and finalizing once the cycle is archived, while the review stays readable", async () => {
    const cycleId = await createCycleWithGoal();
    await save(cycleId, FULL_REVIEW);
    await finalize(cycleId);
    const before = await getReview(cycleId);
    await archiveRoute.POST(req("POST"), ctx(cycleId));

    const lateSave = await save(cycleId, { breakthroughs: "Too late" });
    const lateFinalize = await finalize(cycleId);

    expect(lateSave.status).toBe(409);
    expect((await json(lateSave)).error).toMatch(/archived/i);
    expect(lateFinalize.status).toBe(409);
    expect((await json(lateFinalize)).error).toMatch(/archived/i);
    expect(await getReview(cycleId)).toEqual(before);
    expect(before.status).toBe("complete");
  });

  it("answers 404 for an unknown cycle and 400 for a malformed cycle id", async () => {
    expect((await finalize(987654)).status).toBe(404);
    expect((await finalizeRoute.POST(req("POST"), ctx("abc"))).status).toBe(400);
  });
});

afterAll(() => {
  const p = process.env.TWY_DB_PATH!;
  try {
    for (const suffix of ["", "-wal", "-shm"]) fs.rmSync(p + suffix, { force: true });
  } catch {
    // temp cleanup
  }
});
