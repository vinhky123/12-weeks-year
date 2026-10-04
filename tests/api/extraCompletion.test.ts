import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const TODAY = "2026-10-05";
const DB_PATH = path.join(os.tmpdir(), `twy-extra-api-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
process.env.TWY_DB_PATH = DB_PATH;

const { closeDb, getDb } = await import("../../src/server/db/index");
const executionRepo = await import("../../src/server/db/repositories/execution");
const cycleService = await import("../../src/server/services/cycleService");
const planService = await import("../../src/server/services/planService");
const weekPlanService = await import("../../src/server/services/weekPlanService");
const itemRoute = await import("../../src/app/api/week-plans/[id]/items/[itemId]/route");
const weekRoute = await import("../../src/app/api/cycles/[id]/weeks/[week]/route");

let cycleId = 0;
let planId = 0;
let scoredItemId = 0;
let extraItemId = 0;

function req(bodyJson: unknown): Request {
  return new Request("http://localhost/x", {
    method: "PATCH",
    headers: { "content-type": "application/json", "x-twy-today": TODAY },
    body: JSON.stringify(bodyJson),
  });
}

function readReq(): Request {
  return new Request("http://localhost/x", { headers: { "x-twy-today": TODAY } });
}

function ctx(p: Record<string, string | number>): { params: Promise<any> } {
  return { params: Promise.resolve(Object.fromEntries(Object.entries(p).map(([key, value]) => [key, String(value)]))) };
}

async function json(res: Response) {
  return (await res.json()) as Record<string, any>;
}

async function patch(itemId: number, body: unknown) {
  return itemRoute.PATCH(req(body), ctx({ id: planId, itemId }));
}

async function detail() {
  return json(await weekRoute.GET(readReq(), ctx({ id: cycleId, week: 1 })));
}

beforeAll(() => {
  const h = getDb();
  const cycle = cycleService.createCycle(h, { name: "Extra API", startDate: TODAY }, TODAY);
  cycleService.startCycle(h, cycle.id);
  const goal = planService.addGoal(
    h,
    cycle.id,
    { title: "Ship", why: "Momentum", lagMetricName: "Result", lagUnit: "units", lagStart: 0, lagTarget: 10 },
    TODAY,
  );
  const tactic = planService.addTactic(
    h,
    goal.id,
    { text: "Practice three times", duePattern: { type: "EVERY_WEEK", timesPerWeek: 3 } },
    TODAY,
  );
  const plan = weekPlanService.generateWeekPlan(h, cycle.id, 1, TODAY);
  const scored = executionRepo.listWeekPlanItems(h, plan.id).find((item) => item.tacticId === tactic.id)!;
  const extra = weekPlanService.addPlanRevisionItem(h, plan.id, {
    label: "Prepare equipment",
    dayOfWeek: 1,
    confirmPlanRevision: true,
  });
  cycleId = cycle.id;
  planId = plan.id;
  scoredItemId = scored.id;
  extraItemId = extra.id;
});

afterAll(() => {
  closeDb(DB_PATH);
  for (const suffix of ["", "-wal", "-shm"]) fs.rmSync(DB_PATH + suffix, { force: true });
});

describe("extra completion item PATCH API", () => {
  it("persists done and undo across database reopens without changing scored due or completion events", async () => {
    const completedResponse = await patch(extraItemId, { done: 1 });
    expect(completedResponse.status).toBe(200);
    const completed = await json(completedResponse);
    expect(completed.plan.id).toBe(planId);
    expect(completed.items.find((item: any) => item.id === extraItemId).done).toBe(1);
    expect(completed.score).toMatchObject({ due: 3, completed: 0 });
    expect(executionRepo.listCycleCompletions(getDb(), cycleId)).toEqual([]);

    closeDb(DB_PATH);
    const reopened = await detail();
    expect(reopened.items.find((item: any) => item.id === extraItemId).done).toBe(1);
    expect(reopened.score).toMatchObject({ due: 3, completed: 0 });
    expect(executionRepo.listCycleCompletions(getDb(), cycleId)).toEqual([]);

    const undoneResponse = await patch(extraItemId, { done: 0 });
    expect(undoneResponse.status).toBe(200);
    closeDb(DB_PATH);
    const undone = await detail();
    expect(undone.items.find((item: any) => item.id === extraItemId).done).toBe(0);
    expect(executionRepo.listCycleCompletions(getDb(), cycleId)).toEqual([]);
  });

  it("accepts a nonempty move patch and rejects mixed, empty, and unknown patch shapes", async () => {
    const movedResponse = await patch(scoredItemId, { dayOfWeek: 4, sortOrder: 7, label: "Friday practice" });
    expect(movedResponse.status).toBe(200);
    const moved = await json(movedResponse);
    expect(moved.items.find((item: any) => item.id === scoredItemId)).toMatchObject({
      dayOfWeek: 4,
      sortOrder: 7,
      label: "Friday practice",
    });

    for (const invalidBody of [
      { done: 1, dayOfWeek: 2 },
      {},
      { unexpected: true },
      { dayOfWeek: 3, unexpected: true },
    ]) {
      const response = await patch(extraItemId, invalidBody);
      expect(response.status).toBe(400);
      expect((await json(response)).error).toBe("Invalid request body.");
    }
  });
});
