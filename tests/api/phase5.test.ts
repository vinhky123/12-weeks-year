/**
 * Phase 5 — guide journey contract: the "You are here" engine, walked through
 * the real route handlers against a temp database, exactly as the UI will.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { JOURNEY_DTO } from "../../src/lib/contracts";

process.env.TWY_DB_PATH = path.join(os.tmpdir(), `twy-journey-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);

const journeyRoute = await import("../../src/app/api/guide/journey/route");
const visionRoute = await import("../../src/app/api/vision/route");
const cyclesRoute = await import("../../src/app/api/cycles/route");
const cycleDetailRoute = await import("../../src/app/api/cycles/[id]/route");
const startRoute = await import("../../src/app/api/cycles/[id]/start/route");
const goalsRoute = await import("../../src/app/api/cycles/[id]/goals/route");
const tacticsRoute = await import("../../src/app/api/goals/[id]/tactics/route");
const weeksRoute = await import("../../src/app/api/cycles/[id]/weeks/[week]/route");
const generateRoute = await import("../../src/app/api/cycles/[id]/weeks/[week]/generate/route");
const closeRoute = await import("../../src/app/api/week-plans/[id]/close/route");
const reviewRoute = await import("../../src/app/api/cycles/[id]/review/route");
const archiveRoute = await import("../../src/app/api/cycles/[id]/archive/route");
const nextRoute = await import("../../src/app/api/cycles/[id]/next/route");
const modelWeekRoute = await import("../../src/app/api/model-week/route");
const commitmentRoute = await import("../../src/app/api/cycles/[id]/commitment/route");

function req(method: string, url: string, bodyJson?: unknown, today?: string): Request {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { "content-type": "application/json", ...(today ? { "x-twy-today": today } : {}) },
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

async function journey(today?: string) {
  return (await json(await journeyRoute.GET(req("GET", "/api/guide/journey", undefined, today)))).journey;
}

describe("guide journey (Phase 5 contract)", () => {
  it("empty database → foundation, write_vision, null cycle context", async () => {
    const j = await journey();
    expect(j.phase).toBe("foundation");
    expect(j.steps).toHaveLength(14);
    expect(j.nextAction).toEqual({ id: "write_vision" });
    expect(j.context).toEqual({ cycleName: null, weekNumber: 0, unclosedWeek: null });
    expect(() => JOURNEY_DTO.parse(j)).not.toThrow();

    // Vision written, still no cycle → create_cycle (spec §7): the vision is
    // global, so write_vision flips to done even before the cycle exists.
    await visionRoute.PUT(req("PUT", "/api/vision", { longTerm: "Vision before cycle." }));
    const jVision = await journey();
    expect(jVision.nextAction).toEqual({ id: "create_cycle" });
    expect(jVision.steps.find((s: any) => s.id === "write_vision").status).toBe("done");
  });

  it("full foundation, planning → start_cycle", async () => {
    await visionRoute.PUT(req("PUT", "/api/vision", { longTerm: "A life on my own terms." }));
    const cycle = await json(await cyclesRoute.POST(req("POST", "/api/cycles", { name: "Journey cycle" })));
    const goal = await json(
      await goalsRoute.POST(
        req("POST", `/api/cycles/${cycle.id}/goals`, {
          title: "Lose 10 lbs", why: "Energy", lagMetricName: "Weight", lagUnit: "lbs", lagStart: 180, lagTarget: 170,
        }),
        ctx({ id: cycle.id }),
      ),
    );
    await tacticsRoute.POST(
      req("POST", `/api/goals/${goal.id}/tactics`, {
        text: "Strength train 30 min", duePattern: { type: "EVERY_WEEK", timesPerWeek: 3 },
      }),
      ctx({ id: goal.id }),
    );
    await modelWeekRoute.POST(req("POST", "/api/model-week", { type: "STRATEGIC", dayOfWeek: 0, startMinute: 540, durationMinutes: 180 }));
    await commitmentRoute.PUT(req("PUT", `/api/cycles/${cycle.id}/commitment`, { costs: "Early mornings", statement: "I choose to finish." }), ctx({ id: cycle.id }));

    const j = await journey();
    expect(j.phase).toBe("foundation");
    expect(j.nextAction).toEqual({ id: "start_cycle" });
    expect(j.context.cycleName).toBe("Journey cycle");
  });

  it("started + week 1 generated, mid-week → execute_today", async () => {
    const cycles = await json(await cyclesRoute.GET());
    const cycle = cycles[cycles.length - 1]; // the planning cycle created above
    await startRoute.POST(req("POST", `/api/cycles/${cycle.id}/start`), ctx({ id: cycle.id }));
    await generateRoute.POST(req("POST", `/api/cycles/${cycle.id}/weeks/1/generate`), ctx({ id: cycle.id, week: 1 }));

    const j = await journey(cycle.startDate); // Monday of week 1
    expect(j.phase).toBe("execution");
    expect(j.nextAction).toEqual({ id: "execute_today" });
    expect(j.context).toMatchObject({ weekNumber: 1, unclosedWeek: null });
  });

  it("Sunday of week 1, plan still open → close_week with unclosedWeek=1", async () => {
    const active = await json(await (await import("../../src/app/api/cycles/active/route")).GET(req("GET", "/api/cycles/active")));
    const sunday = addDays(active.cycle.startDate, 6);
    const j = await journey(sunday);
    expect(j.nextAction).toEqual({ id: "close_week" });
    expect(j.context.unclosedWeek).toBe(1);
  });

  it("week 1 closed (Sunday night, before next generate) → null; after generating week 2 → execute_today", async () => {
    const active = await json(await (await import("../../src/app/api/cycles/active/route")).GET(req("GET", "/api/cycles/active")));
    const detail = await json(await weeksRoute.GET(req("GET", `/api/cycles/${active.cycle.id}/weeks/1`, undefined, addDays(active.cycle.startDate, 6)), ctx({ id: active.cycle.id, week: 1 })));
    await closeRoute.POST(req("POST", `/api/week-plans/${detail.plan.id}/close`, { reflection: "Honest week." }, addDays(active.cycle.startDate, 6)), ctx({ id: detail.plan.id }));

    // The null window: week 1 closed, week 2 not yet generated — nothing is owed tonight.
    const jClosed = await journey(addDays(active.cycle.startDate, 6)); // Sunday of week 1
    expect(jClosed.nextAction).toBeNull();
    expect(jClosed.steps.find((s: any) => s.id === "wam_report").status).toBe("todo");

    // Monday: generate week 2 → execution resumes.
    await generateRoute.POST(req("POST", `/api/cycles/${active.cycle.id}/weeks/2/generate`, undefined, addDays(active.cycle.startDate, 7)), ctx({ id: active.cycle.id, week: 2 }));
    const jMonday = await journey(addDays(active.cycle.startDate, 7));
    expect(jMonday.nextAction).toEqual({ id: "execute_today" });
    expect(jMonday.steps.find((s: any) => s.id === "execute_today").status).toBe("current");
  });

  it("week 13 → write_review; then archive → start_next_cycle; then successor → foundation again", async () => {
    const active = await json(await (await import("../../src/app/api/cycles/active/route")).GET(req("GET", "/api/cycles/active")));
    const week13 = addDays(active.cycle.startDate, 84);
    const j13 = await journey(week13);
    expect(j13.phase).toBe("completion");
    expect(j13.nextAction).toEqual({ id: "write_review" });

    await reviewRoute.PUT(
      req("PUT", `/api/cycles/${active.cycle.id}/review`, {
        qol: [
          { area: "Spiritual", rating: 6 }, { area: "Spouse/Key Relationship", rating: 7 }, { area: "Family", rating: 7 },
          { area: "Business", rating: 6 }, { area: "Personal", rating: 6 }, { area: "Physical", rating: 7 },
        ],
        disciplines: [
          { name: "Vision", rating: 7 }, { name: "12-Week Planning", rating: 8 },
          { name: "Weekly Routine (Score · Plan · WAM)", rating: 7 }, { name: "Performance Time (Blocks)", rating: 6 },
          { name: "Key Measures", rating: 7 },
        ],
        breakthroughs: "The score made the truth impossible to hide.",
      }, week13),
      ctx({ id: active.cycle.id }),
    );
    await archiveRoute.POST(req("POST", `/api/cycles/${active.cycle.id}/archive`, undefined, week13), ctx({ id: active.cycle.id }));

    const jArchived = await journey(week13);
    expect(jArchived.nextAction).toEqual({ id: "start_next_cycle" });

    const goalId = (await json(await cycleDetailRoute.GET(req("GET", `/api/cycles/${active.cycle.id}`), ctx({ id: active.cycle.id })))).goals[0].id;
    await nextRoute.POST(req("POST", `/api/cycles/${active.cycle.id}/next`, { name: "Journey II", carryoverGoalIds: [goalId] }, week13), ctx({ id: active.cycle.id }));
    const jNext = await journey(week13);
    expect(jNext.phase).toBe("foundation");
    expect(jNext.nextAction).toEqual({ id: "add_tactics" }); // carried goal has no tactics
  });
});

function addDays(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

afterAll(() => {
  const p = process.env.TWY_DB_PATH!;
  try {
    for (const suffix of ["", "-wal", "-shm"]) fs.rmSync(p + suffix, { force: true });
  } catch {
    // Windows may hold the file briefly; temp dir cleanup handles it
  }
});
