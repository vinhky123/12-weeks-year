/**
 * Phase 2 contract test — vision (with archive snapshot), model week warnings,
 * lead measures/logs, and the measures overview, through the real route handlers.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const TODAY = "2026-10-05";

process.env.TWY_DB_PATH = path.join(os.tmpdir(), `twy-p2-api-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);

const cyclesRoute = await import("../../src/app/api/cycles/route");
const startRoute = await import("../../src/app/api/cycles/[id]/start/route");
const goalsRoute = await import("../../src/app/api/cycles/[id]/goals/route");
const archiveRoute = await import("../../src/app/api/cycles/[id]/archive/route");
const cycleVisionRoute = await import("../../src/app/api/cycles/[id]/vision/route");
const visionRoute = await import("../../src/app/api/vision/route");
const modelWeekRoute = await import("../../src/app/api/model-week/route");
const modelWeekItemRoute = await import("../../src/app/api/model-week/[id]/route");
const leadMeasuresRoute = await import("../../src/app/api/goals/[id]/lead-measures/route");
const leadLogsRoute = await import("../../src/app/api/lead-logs/route");
const measuresRoute = await import("../../src/app/api/measures/route");

function req(method: string, bodyJson?: unknown, today: string = TODAY): Request {
  return new Request(`http://localhost/x`, {
    method,
    headers: { "content-type": "application/json", "x-twy-today": today },
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

describe("phase 2 contract: vision", () => {
  it("upserts the living vision; archive freezes a snapshot; edits stay living", async () => {
    const created = await json(await cyclesRoute.POST(req("POST", { name: "Q4", startDate: TODAY })));
    cycleId = created.id;
    await startRoute.POST(req("POST"), ctx({ id: cycleId }));
    const g = await json(await goalsRoute.POST(req("POST", { title: "G", why: "Y", lagMetricName: "M", lagUnit: "u", lagStart: 0, lagTarget: 10 }), ctx({ id: cycleId })));
    goalId = g.id;

    expect((await json(await visionRoute.GET())).vision).toBeNull();

    const put1 = await json(await visionRoute.PUT(req("PUT", { longTerm: "Own my time", threeYear: "Independent income", cycleConnection: "This cycle proves the model." })));
    expect(put1.vision.cycleId).toBeNull();
    expect(put1.vision.lifeDomains).toEqual([]);

    await visionRoute.PUT(req("PUT", { lifeDomains: [{ area: "Health", note: "Strong and rested" }] }));
    const living = (await json(await visionRoute.GET())).vision;
    expect(living.longTerm).toBe("Own my time"); // preserved
    expect(living.lifeDomains).toEqual([{ area: "Health", note: "Strong and rested" }]);

    // archive -> snapshot frozen at "This cycle proves the model."
    await archiveRoute.POST(req("POST"), ctx({ id: cycleId }));
    const snap = (await json(await cycleVisionRoute.GET(new Request("http://localhost/x"), ctx({ id: cycleId })))).vision;
    expect(snap.cycleId).toBe(cycleId);
    expect(snap.longTerm).toBe("Own my time");
    // living vision still editable after archive
    await visionRoute.PUT(req("PUT", { longTerm: "v2" }));
    const snap2 = (await json(await cycleVisionRoute.GET(new Request("http://localhost/x"), ctx({ id: cycleId })))).vision;
    expect(snap2.longTerm).toBe("Own my time");
    expect((await json(await visionRoute.GET())).vision.longTerm).toBe("v2");
  });
});

describe("phase 2 contract: model week", () => {
  it("empty state warns on all five; book blocks clear the warnings", async () => {
    const empty = await json(await modelWeekRoute.GET());
    expect(empty.warnings.map((w: any) => w.field)).toEqual(expect.arrayContaining(["STRATEGIC", "BREAKOUT", "BUFFER", "PLANNING", "WAM"]));

    const added = await json(await modelWeekRoute.POST(req("POST", { type: "STRATEGIC", dayOfWeek: 2, startMinute: 540, durationMinutes: 180, label: "Deep work" })));
    expect(added.blocks).toHaveLength(1);
    expect(added.warnings.map((w: any) => w.field)).not.toContain("STRATEGIC");

    const bad = await modelWeekRoute.POST(req("POST", { type: "BUFFER", dayOfWeek: 9, startMinute: 0, durationMinutes: 45 }));
    expect(bad.status).toBe(400); // zod rejects dayOfWeek 9 at the boundary

    for (const block of [
      { type: "BUFFER", dayOfWeek: 0, startMinute: 660, durationMinutes: 45 },
      { type: "BREAKOUT", dayOfWeek: 5, startMinute: 480, durationMinutes: 240 },
      { type: "PLANNING", dayOfWeek: 0, startMinute: 510, durationMinutes: 20 },
      { type: "WAM", dayOfWeek: 0, startMinute: 1050, durationMinutes: 30 },
    ]) {
      await modelWeekRoute.POST(req("POST", block));
    }
    const full = await json(await modelWeekRoute.GET());
    expect(full.warnings).toEqual([]);

    const blockId = full.blocks[0].id;
    const patched = await json(await modelWeekItemRoute.PATCH(req("PATCH", { dayOfWeek: 4 }), ctx({ id: blockId })));
    expect(patched.blocks.find((b: any) => b.id === blockId).dayOfWeek).toBe(4);
    const afterDelete = await json(await modelWeekItemRoute.DELETE(req("DELETE"), ctx({ id: blockId })));
    expect(afterDelete.blocks).toHaveLength(4);
  });
});

describe("phase 2 contract: measures", () => {
  it("lead measure CRUD, log upsert, overview with diagnosis fields", async () => {
    // a fresh cycle + goal for the measures views (the vision test archived its cycle)
    const cycle = await json(await cyclesRoute.POST(req("POST", { name: "Q5", startDate: "2027-01-04" })));
    cycleId = cycle.id;
    await startRoute.POST(req("POST"), ctx({ id: cycleId }));
    const g = await json(await goalsRoute.POST(req("POST", { title: "Lose weight", why: "Energy", lagMetricName: "Weight", lagUnit: "lbs", lagStart: 200, lagTarget: 190 }), ctx({ id: cycleId })));
    goalId = g.id;

    const m = await json(await leadMeasuresRoute.POST(req("POST", { name: "Workouts completed", weeklyTarget: 3 }), ctx({ id: goalId })));
    expect(m.goalId).toBe(goalId);

    await leadLogsRoute.POST(req("POST", { leadMeasureId: m.id, weekNumber: 1, value: 3 }));
    const upserted = await json(await leadLogsRoute.POST(req("POST", { leadMeasureId: m.id, weekNumber: 1, value: 2 })));
    expect(upserted.value).toBe(2);

    const bad = await leadLogsRoute.POST(req("POST", { leadMeasureId: m.id, weekNumber: 13, value: 1 }));
    expect(bad.status).toBe(400); // zod schema rejects week 13

    const overview = await json(await measuresRoute.GET(req("GET")));
    expect(overview.cycleId).toBe(cycleId);
    expect(overview.goals).toHaveLength(1);
    const goalView = overview.goals[0];
    expect(goalView.goal.id).toBe(goalId);
    expect(goalView.latestLag).toBeNull(); // no lag logged yet
    expect(goalView.lagProgress).toBeNull();
    expect(goalView.leadMeasures[0]).toMatchObject({ name: "Workouts completed", weeklyTarget: 3, thisWeek: 2 }); // pre-cycle week clamps to week 1
    expect(goalView.seriesWeeks).toBeUndefined();
    expect(goalView.leadMeasures[0].series).toEqual([{ week: 1, value: 2 }]);

    const patched = await json(await (await import("../../src/app/api/lead-measures/[id]/route")).PATCH(req("PATCH", { weeklyTarget: 5 }), ctx({ id: m.id })));
    expect(patched.weeklyTarget).toBe(5);
    const deleted = await json(await (await import("../../src/app/api/lead-measures/[id]/route")).DELETE(req("DELETE"), ctx({ id: m.id })));
    expect(deleted.ok).toBe(true);
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
