import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { NEXT_CYCLE_PREVIEW_DTO } from "../../src/lib/contracts";

const DB_PATH = path.join(os.tmpdir(), `twy-next-preview-api-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
process.env.TWY_DB_PATH = DB_PATH;

const cyclesRoute = await import("../../src/app/api/cycles/route");
const goalsRoute = await import("../../src/app/api/cycles/[id]/goals/route");
const nextRoute = await import("../../src/app/api/cycles/[id]/next/route");

function request(method: string, body?: unknown): Request {
  return new Request("http://localhost/x", {
    method,
    headers: { "content-type": "application/json", "x-twy-today": "2026-10-04" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function context(id: string | number): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id: String(id) }) };
}

async function json(response: Response) {
  return (await response.json()) as Record<string, any>;
}

describe("GET /api/cycles/:id/next", () => {
  it("returns a contract-valid preview for a nonarchived cycle and maps bad or missing ids", async () => {
    const cycle = await json(await cyclesRoute.POST(request("POST", { name: "Planning", startDate: "2026-10-05" })));
    const goal = await json(await goalsRoute.POST(
      request("POST", { title: "Grow", why: "Impact", lagMetricName: "Revenue", lagUnit: "k", lagStart: 2, lagTarget: 10 }),
      context(cycle.id),
    ));

    const previewResponse = await nextRoute.GET(request("GET"), context(cycle.id));
    expect(previewResponse.status).toBe(200);
    const preview = await json(previewResponse);
    expect(preview).toEqual({ cycleId: cycle.id, goals: [{ goalId: goal.id, lagStart: 2, lagTarget: 10, canCarry: true }] });
    expect(() => NEXT_CYCLE_PREVIEW_DTO.parse(preview)).not.toThrow();

    const blockedPost = await nextRoute.POST(request("POST", { carryoverGoalIds: [goal.id] }), context(cycle.id));
    expect(blockedPost.status).toBe(409);
    expect((await json(blockedPost)).error).toMatch(/Archive this cycle first/);

    expect((await nextRoute.GET(request("GET"), context("bad"))).status).toBe(400);
    expect((await nextRoute.GET(request("GET"), context(999_999))).status).toBe(404);
  });
});

afterAll(async () => {
  const { closeDb } = await import("../../src/server/db/index");
  closeDb(DB_PATH);
  delete process.env.TWY_DB_PATH;
  for (const suffix of ["", "-wal", "-shm"]) fs.rmSync(DB_PATH + suffix, { force: true });
});
