import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { ACTIVE_CYCLE_INFO_DTO } from "../../src/lib/contracts";

const START = "2026-01-05";
const dbPath = path.join(os.tmpdir(), `twy-cycle-context-api-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
process.env.TWY_DB_PATH = dbPath;

const cyclesRoute = await import("../../src/app/api/cycles/route");
const startRoute = await import("../../src/app/api/cycles/[id]/start/route");
const archiveRoute = await import("../../src/app/api/cycles/[id]/archive/route");
const activeRoute = await import("../../src/app/api/cycles/active/route");
const contextRoute = await import("../../src/app/api/cycles/[id]/context/route");
const goalsRoute = await import("../../src/app/api/cycles/[id]/goals/route");
const wamRoute = await import("../../src/app/api/cycles/[id]/wam/[week]/route");
const wamExportRoute = await import("../../src/app/api/cycles/[id]/wam/[week]/export/route");

function req(method: string, url: string, bodyJson?: unknown, today = START): Request {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { "content-type": "application/json", "x-twy-today": today },
    body: bodyJson === undefined ? undefined : JSON.stringify(bodyJson),
  });
}

function ctx(values: Record<string, string | number>): { params: Promise<any> } {
  return { params: Promise.resolve(Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value)]))) };
}

async function json(response: Response) {
  return (await response.json()) as Record<string, any>;
}

describe("GET /api/cycles/:id/context", () => {
  it("returns selected planning and archived cycle context using the request date", async () => {
    const planning = await json(await cyclesRoute.POST(req("POST", "/api/cycles", { name: "Selected", startDate: START })));

    const preResponse = await contextRoute.GET(
      req("GET", `/api/cycles/${planning.id}/context`, undefined, "2026-01-04"),
      ctx({ id: planning.id }),
    );
    expect(preResponse.status).toBe(200);
    const pre = await json(preResponse);
    expect(pre).toMatchObject({
      cycle: { id: planning.id, status: "planning" },
      weekNumber: 0,
      weekLabel: null,
      daysRemaining: 0,
      phase: "pre",
    });
    expect(() => ACTIVE_CYCLE_INFO_DTO.parse(pre)).not.toThrow();

    await startRoute.POST(req("POST", `/api/cycles/${planning.id}/start`), ctx({ id: planning.id }));
    await archiveRoute.POST(
      req("POST", `/api/cycles/${planning.id}/archive`, undefined, "2026-03-30"),
      ctx({ id: planning.id }),
    );
    const archived = await json(
      await contextRoute.GET(
        req("GET", `/api/cycles/${planning.id}/context`, undefined, "2026-03-30"),
        ctx({ id: planning.id }),
      ),
    );
    expect(archived).toMatchObject({ cycle: { id: planning.id, status: "archived" }, weekNumber: 13, phase: "review" });
  });

  it("returns 400 for malformed ids and 404 for a missing cycle", async () => {
    for (const id of ["abc", "0", "-1", "1.5"]) {
      const response = await contextRoute.GET(req("GET", `/api/cycles/${id}/context`), ctx({ id }));
      expect(response.status).toBe(400);
    }
    const missing = await contextRoute.GET(req("GET", "/api/cycles/999999/context"), ctx({ id: 999999 }));
    expect(missing.status).toBe(404);
    expect(await json(missing)).toMatchObject({ error: "Cycle not found." });
  });
});

describe("selected-cycle WAM reads", () => {
  it("keeps archived saved facts readable after a different cycle becomes active", async () => {
    const historical = await json(await cyclesRoute.POST(req("POST", "/api/cycles", { name: "Historical", startDate: START })));
    await startRoute.POST(req("POST", `/api/cycles/${historical.id}/start`), ctx({ id: historical.id }));
    await goalsRoute.POST(
      req("POST", `/api/cycles/${historical.id}/goals`, {
        title: "Historical result",
        why: "Proof",
        lagMetricName: "Units",
        lagUnit: "u",
        lagStart: 0,
        lagTarget: 10,
      }),
      ctx({ id: historical.id }),
    );
    await wamRoute.PUT(
      req("PUT", `/api/cycles/${historical.id}/wam/1`, {
        blockers: "Saved blocker",
        whatWorked: "Saved method",
        encouragement: "Saved focus",
      }),
      ctx({ id: historical.id, week: 1 }),
    );
    const saved = await json(await wamRoute.GET(req("GET", `/api/cycles/${historical.id}/wam/1`), ctx({ id: historical.id, week: 1 })));

    await archiveRoute.POST(req("POST", `/api/cycles/${historical.id}/archive`), ctx({ id: historical.id }));
    const current = await json(await cyclesRoute.POST(req("POST", "/api/cycles", { name: "Current", startDate: "2026-04-06" })));
    await startRoute.POST(req("POST", `/api/cycles/${current.id}/start`), ctx({ id: current.id }));

    const archivedRead = await json(
      await wamRoute.GET(req("GET", `/api/cycles/${historical.id}/wam/1`), ctx({ id: historical.id, week: 1 })),
    );
    expect(archivedRead).toEqual(saved);
    expect(archivedRead).toMatchObject({
      report: { cycleId: historical.id, blockers: "Saved blocker", whatWorked: "Saved method", encouragement: "Saved focus" },
      auto: { cycleName: "Historical", weekNumber: 1 },
    });

    const exported = await wamExportRoute.GET(
      req("GET", `/api/cycles/${historical.id}/wam/1/export`),
      ctx({ id: historical.id, week: 1 }),
    );
    expect(exported.status).toBe(200);
    const markdown = await exported.text();
    expect(markdown).toContain("# WAM Report — Historical, Week 1");
    expect(markdown).toContain("Saved blocker");
    expect(markdown).toContain("Saved method");
    expect(markdown).toContain("Saved focus");

    const active = await json(await activeRoute.GET(req("GET", "/api/cycles/active", undefined, "2026-04-06")));
    expect(active.cycle.id).toBe(current.id);

    const blocked = await wamRoute.PUT(
      req("PUT", `/api/cycles/${historical.id}/wam/1`, { blockers: "Changed" }),
      ctx({ id: historical.id, week: 1 }),
    );
    expect(blocked.status).toBe(409);
  });
});

afterAll(async () => {
  const { closeDb } = await import("../../src/server/db");
  closeDb(dbPath);
  for (const suffix of ["", "-wal", "-shm"]) fs.rmSync(dbPath + suffix, { force: true });
});
