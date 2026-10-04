/**
 * Phase 3 contract test — WAM reports + markdown export, the week-13 review
 * (celebration, 4-part review, next-cycle carry), commitment, history and
 * insights — through the real route handlers against a temp database.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const TODAY = "2026-10-05";

process.env.TWY_DB_PATH = path.join(os.tmpdir(), `twy-p3-api-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);

const cyclesRoute = await import("../../src/app/api/cycles/route");
const startRoute = await import("../../src/app/api/cycles/[id]/start/route");
const archiveRoute = await import("../../src/app/api/cycles/[id]/archive/route");
const goalsRoute = await import("../../src/app/api/cycles/[id]/goals/route");
const tacticsRoute = await import("../../src/app/api/goals/[id]/tactics/route");
const wamRoute = await import("../../src/app/api/cycles/[id]/wam/[week]/route");
const wamExportRoute = await import("../../src/app/api/cycles/[id]/wam/[week]/export/route");
const reviewRoute = await import("../../src/app/api/cycles/[id]/review/route");
const finalizeRoute = await import("../../src/app/api/cycles/[id]/review/finalize/route");
const celebrationRoute = await import("../../src/app/api/cycles/[id]/review/celebration/route");
const nextRoute = await import("../../src/app/api/cycles/[id]/next/route");
const commitmentRoute = await import("../../src/app/api/cycles/[id]/commitment/route");
const historyRoute = await import("../../src/app/api/history/route");
const historyDetailRoute = await import("../../src/app/api/history/[id]/route");
const insightsRoute = await import("../../src/app/api/insights/route");
const dashboardRoute = await import("../../src/app/api/dashboard/route");

function req(method: string, bodyJson?: unknown): Request {
  return new Request("http://localhost/x", {
    method,
    headers: { "content-type": "application/json", "x-twy-today": TODAY },
    body: bodyJson === undefined ? undefined : JSON.stringify(bodyJson),
  });
}

function ctx(p: Record<string, string | number>): { params: Promise<any> } {
  const resolved: Record<string, string> = {};
  for (const [k, v] of Object.entries(p)) resolved[k] = String(v);
  return { params: Promise.resolve(resolved) };
}

async function json(res: Response) {
  return (await res.json()) as Record<string, any>;
}

let cycleId = 0;
let goalId = 0;

async function createCycleWithGoal(name: string) {
  const cycle = await json(await cyclesRoute.POST(req("POST", { name, startDate: TODAY })));
  await startRoute.POST(req("POST"), ctx({ id: cycle.id }));
  const goal = await json(
    await goalsRoute.POST(req("POST", { title: "Lose 10 lbs", why: "Energy", lagMetricName: "Weight", lagUnit: "lbs", lagStart: 180, lagTarget: 170 }), ctx({ id: cycle.id })),
  );
  return { cycleId: cycle.id, goalId: goal.id };
}

describe("phase 3: WAM reports", () => {
  it("auto-fills live data, saves free text, exports markdown", async () => {
    const created = await createCycleWithGoal("Q4");
    cycleId = created.cycleId;
    goalId = created.goalId;
    await tacticsRoute.POST(req("POST", { text: "Perform 30-min strength training", duePattern: { type: "EVERY_WEEK", timesPerWeek: 1 } }), ctx({ id: goalId }));

    const empty = await json(await wamRoute.GET(req("GET"), ctx({ id: cycleId, week: 1 })));
    expect(empty.report).toBeNull();
    expect(empty.auto.cycleName).toBe("Q4");
    expect(empty.auto.nextWeekCommitments).toContain("Perform 30-min strength training");

    await wamRoute.PUT(req("PUT", { blockers: "Outreach slips on Fridays", whatWorked: "Morning workouts" }), ctx({ id: cycleId, week: 1 }));
    const saved = await json(await wamRoute.GET(req("GET"), ctx({ id: cycleId, week: 1 })));
    expect(saved.report?.blockers).toBe("Outreach slips on Fridays");
    expect(saved.report?.auto).toBeDefined(); // frozen snapshot

    const exported = await wamExportRoute.GET(req("GET"), ctx({ id: cycleId, week: 1 }));
    expect(exported.status).toBe(200);
    expect(exported.headers.get("content-type")).toContain("text/markdown");
    const md = await exported.text();
    expect(md).toContain("# WAM Report — Q4, Week 1");
    expect(md).toContain("Morning workouts");
  });
});

describe("phase 3: week-13 review & next cycle", () => {
  it("celebration, review validation, next-cycle carry, history, insights", async () => {
    const celebration = await json(await celebrationRoute.GET(req("GET"), ctx({ id: cycleId })));
    expect(celebration).toMatchObject({ cycleName: "Q4", goalsTotal: 1, goalsCompleted: 0 });

    const badQol = await reviewRoute.PUT(req("PUT", { qol: [{ area: "Physical", rating: 11 }] }), ctx({ id: cycleId }));
    expect(badQol.status).toBe(400); // zod boundary rejects out-of-range ratings
    const badArea = await reviewRoute.PUT(req("PUT", { qol: [{ area: "Money", rating: 5 }] }), ctx({ id: cycleId }));
    expect(badArea.status).toBe(422); // service rejects unknown areas (book's six)

    const savedReview = await json(
      await reviewRoute.PUT(
        req("PUT", {
          qol: [{ area: "Physical", rating: 7, anchor1: "Sick", anchor10: "Athlete" }, { area: "Business", rating: 6 }],
          disciplines: [{ name: "Vision", rating: 8 }, { name: "Key Measures", rating: 6 }],
          breakthroughs: "Work ON the system, not just in it.",
          nextCycleNotes: "Keep outreach daily.",
        }),
        ctx({ id: cycleId }),
      ),
    );
    expect(savedReview.review.results).toHaveLength(1); // auto results with grades
    expect(savedReview.review.results[0].grade).toBeGreaterThanOrEqual(1);
    expect(savedReview.review.qol).toHaveLength(2);
    expect(savedReview.review.breakthroughs).toContain("Work ON");
    expect(savedReview.review.status).toBe("draft"); // saved answers are a draft until the owner finalizes them

    // History does not count a draft as a finished review, and finalizing needs every defined section
    const draftHistory = await json(await historyRoute.GET());
    expect(draftHistory.find((c: any) => c.id === cycleId)).toMatchObject({ hasReview: false });
    const unfinished = await finalizeRoute.POST(req("POST"), ctx({ id: cycleId }));
    expect(unfinished.status).toBe(422); // only two areas and two disciplines are answered

    await reviewRoute.PUT(
      req("PUT", {
        qol: [
          { area: "Spiritual", rating: 6 }, { area: "Spouse/Key Relationship", rating: 7 }, { area: "Family", rating: 7 },
          { area: "Business", rating: 6 }, { area: "Personal", rating: 6 }, { area: "Physical", rating: 7 },
        ],
        disciplines: [
          { name: "Vision", rating: 8 }, { name: "12-Week Planning", rating: 7 },
          { name: "Weekly Routine (Score · Plan · WAM)", rating: 7 }, { name: "Performance Time (Blocks)", rating: 6 },
          { name: "Key Measures", rating: 6 },
        ],
      }),
      ctx({ id: cycleId }),
    );
    const finalized = await json(await finalizeRoute.POST(req("POST"), ctx({ id: cycleId })));
    expect(finalized.review.status).toBe("complete");
    expect(finalized.review.breakthroughs).toContain("Work ON"); // finalizing manufactures and drops nothing

    // commitment
    await commitmentRoute.PUT(req("PUT", { costs: "Early mornings", statement: "I choose to execute the vital few daily." }), ctx({ id: cycleId }));
    const commitment = await json(await commitmentRoute.GET(req("GET"), ctx({ id: cycleId })));
    expect(commitment.commitment.statement).toContain("I choose to");

    // next-cycle guard: must archive first
    const blocked = await nextRoute.POST(req("POST", { carryoverGoalIds: [goalId] }), ctx({ id: cycleId }));
    expect(blocked.status).toBe(409);
    await archiveRoute.POST(req("POST"), ctx({ id: cycleId }));
    const next = await json(await nextRoute.POST(req("POST", { name: "Q1 2027", carryoverGoalIds: [goalId] }), ctx({ id: cycleId })));
    expect(next.status).toBe("planning");

    const nextDetail = await json(await (await import("../../src/app/api/cycles/[id]/route")).GET(req("GET"), ctx({ id: next.id })));
    expect(nextDetail.goals).toHaveLength(1);
    expect(nextDetail.goals[0].tactics).toHaveLength(0); // tactics re-derived, not copied

    // history & insights now see the archived cycle with its review
    const history = await json(await historyRoute.GET());
    expect(history).toHaveLength(2); // archived Q4 + the new planning cycle
    expect(history.find((c: any) => c.id === cycleId)).toMatchObject({ status: "archived", hasReview: true });

    const detail = await json(await historyDetailRoute.GET(req("GET"), ctx({ id: cycleId })));
    expect(detail.cycle.id).toBe(cycleId);
    expect(detail.review.breakthroughs).toContain("Work ON");
    expect(detail.scores.weeks).toHaveLength(12);

    const insights = await json(await insightsRoute.GET());
    expect(insights.cycles).toHaveLength(2); // Q4 (scored) + Q1 2027 (no scores yet)
    expect(insights.cycles.find((c: any) => c.cycleId === cycleId)).toMatchObject({ name: "Q4", status: "archived" });
    expect(insights.totalGoalsAchieved).toBe(0);
    expect(insights.qualityOfLifeMovement).toBeNull(); // movement needs two reviewed cycles

    // dashboard carries valley guidance field (null outside the valley)
    const dash = await json(await dashboardRoute.GET(req("GET")));
    expect(dash).toHaveProperty("valleyGuidance");
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
