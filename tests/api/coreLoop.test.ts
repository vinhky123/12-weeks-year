/**
 * Phase 1 exit-path contract test — walks the full core loop through the real
 * route handlers against a temp database, exactly as the UI will:
 * create cycle -> start -> goals + tactics -> generate week 1 -> log completions
 * -> close week 1 (score 86% ON_TRACK) -> generate week 2 -> dashboard.
 * Plus one negative per book invariant.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const TODAY = "2026-10-05"; // Monday: week 1, day 1 of a cycle starting today

process.env.TWY_DB_PATH = path.join(os.tmpdir(), `twy-api-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);

const cyclesRoute = await import("../../src/app/api/cycles/route");
const activeRoute = await import("../../src/app/api/cycles/active/route");
const startRoute = await import("../../src/app/api/cycles/[id]/start/route");
const goalsRoute = await import("../../src/app/api/cycles/[id]/goals/route");
const goalRoute = await import("../../src/app/api/goals/[id]/route");
const tacticsRoute = await import("../../src/app/api/goals/[id]/tactics/route");
const weekRoute = await import("../../src/app/api/cycles/[id]/weeks/[week]/route");
const generateRoute = await import("../../src/app/api/cycles/[id]/weeks/[week]/generate/route");
const scoresRoute = await import("../../src/app/api/cycles/[id]/scores/route");
const closeRoute = await import("../../src/app/api/week-plans/[id]/close/route");
const completionsRoute = await import("../../src/app/api/completions/route");
const todayRoute = await import("../../src/app/api/today/route");
const dashboardRoute = await import("../../src/app/api/dashboard/route");

function req(method: string, url: string, bodyJson?: unknown, today: string = TODAY): Request {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { "content-type": "application/json", "x-twy-today": today },
    body: bodyJson === undefined ? undefined : JSON.stringify(bodyJson),
  });
}

/** Route context for dynamic segments (Next 15: params is a Promise). */
function ctx(p: Record<string, string | number>): { params: Promise<any> } {
  const resolved: Record<string, string> = {};
  for (const [k, v] of Object.entries(p)) resolved[k] = String(v);
  return { params: Promise.resolve(resolved) };
}

async function json(res: Response) {
  return (await res.json()) as Record<string, any>;
}

describe("core loop happy path (the Phase 1 exit criteria)", () => {
  it("create cycle -> start -> plan -> execute -> score -> close -> next week", async () => {
    // 1. create + start
    const created = await json(await cyclesRoute.POST(req("POST", "/api/cycles", { name: "Q4 2026", startDate: TODAY })));
    expect(created.id).toBeGreaterThan(0);
    expect(created.status).toBe("planning");
    const started = await json(await startRoute.POST(req("POST", `/api/cycles/${created.id}/start`), ctx({ id: created.id })));
    expect(started.status).toBe("active");
    const active = await json(await activeRoute.GET(req("GET", "/api/cycles/active")));
    expect(active.weekLabel).toBe("Week 1 · Day 1");
    expect(active.daysRemaining).toBe(84);

    // 2. two goals (the vital few)
    const g1 = await json(
      await goalsRoute.POST(
        req("POST", `/api/cycles/${created.id}/goals`, {
          title: "Lose 10 lbs", why: "Energy and confidence", lagMetricName: "Weight", lagUnit: "lbs", lagStart: 180, lagTarget: 170,
        }),
        ctx({ id: created.id }),
      ),
    );
    const g2 = await json(
      await goalsRoute.POST(
        req("POST", `/api/cycles/${created.id}/goals`, {
          title: "Earn first $1,000 freelancing", why: "Prove the income path", lagMetricName: "Revenue", lagUnit: "$", lagStart: 0, lagTarget: 1000,
        }),
        ctx({ id: created.id }),
      ),
    );

    // 3. five tactics (book worked example, week-1 dues: 3+1+2+1 = 7)
    const addTactic = (goalId: number, text: string, duePattern: unknown) =>
      tacticsRoute.POST(req("POST", `/api/goals/${goalId}/tactics`, { text, duePattern }), ctx({ id: goalId }));
    const t1 = await json(await addTactic(g1.id, "Perform 30-min strength training", { type: "EVERY_WEEK", timesPerWeek: 3 }));
    await addTactic(g1.id, "Log meals in the food app daily", { type: "EVERY_WEEK", timesPerWeek: 1 });
    await addTactic(g2.id, "Publish one portfolio article", { type: "EVERY_WEEK", timesPerWeek: 2 });
    await addTactic(g2.id, "Send 10 personalized outreach messages", { type: "EVERY_WEEK", timesPerWeek: 1 });
    await addTactic(g2.id, "Publish service landing page", { type: "SPECIFIC_WEEKS", weeks: [3] });
    expect(t1.duePattern).toEqual({ type: "EVERY_WEEK", timesPerWeek: 3 });

    // 4. generate week 1 — seven due tactic-completions become plan items
    const week1 = await json(await generateRoute.POST(req("POST", `/api/cycles/${created.id}/weeks/1/generate`), ctx({ id: created.id, week: 1 })));
    expect(week1.items).toHaveLength(4); // one item per due tactic (multi-count inside plannedCount)
    expect(week1.items.reduce((s: number, i: any) => s + i.plannedCount, 0)).toBe(7);
    expect(week1.score).toMatchObject({ due: 7, completed: 0, scorePct: 0, projected: true });

    // 5. log 6 of 7 completions -> 86% ON_TRACK (outreach slipped)
    const items = week1.items as any[];
    const meals = items.find((i) => i.goal?.id === g1.id && i.plannedCount === 1)!;
    const articles = items.find((i) => i.goal?.id === g2.id && i.plannedCount === 2)!;
    for (let i = 0; i < 3; i++) {
      await completionsRoute.POST(req("POST", "/api/completions", { tacticId: t1.id, weekNumber: 1 }));
    }
    await completionsRoute.POST(req("POST", "/api/completions", { tacticId: meals.tacticId, weekNumber: 1 }));
    await completionsRoute.POST(req("POST", "/api/completions", { tacticId: articles.tacticId, weekNumber: 1 }));
    await completionsRoute.POST(req("POST", "/api/completions", { tacticId: articles.tacticId, weekNumber: 1 }));

    const week1After = await json(await weekRoute.GET(req("GET", `/api/cycles/${created.id}/weeks/1`), ctx({ id: created.id, week: 1 })));
    expect(week1After.score).toMatchObject({ due: 7, completed: 6, scorePct: 86, band: "ON_TRACK", projected: true });

    // 6. close week 1 with lag values — frozen forever
    const closed = await json(
      await closeRoute.POST(
        req("POST", `/api/week-plans/${week1.plan.id}/close`, {
          reflection: "Solid start — outreach slipped one day.",
          lagValues: [{ goalId: g1.id, value: 178.5 }, { goalId: g2.id, value: 0 }],
        }),
        ctx({ id: week1.plan.id }),
      ),
    );
    expect(closed.plan.status).toBe("closed");
    expect(closed.score).toMatchObject({ scorePct: 86, closed: true, projected: false });

    // 7. generate week 2 and check the dashboard story
    const week2 = await json(await generateRoute.POST(req("POST", `/api/cycles/${created.id}/weeks/2/generate`), ctx({ id: created.id, week: 2 })));
    expect(week2.plan.weekNumber).toBe(2);
    const dash = await json(await dashboardRoute.GET(req("GET", "/api/dashboard")));
    expect(dash.phase).toBe("execution");
    expect(dash.today.weekLabel).toBe("Week 1 · Day 1");
    expect(dash.scoreHistory[0]).toMatchObject({ scorePct: 86, closed: true });
    expect(dash.averageScore).toBe(86);
    expect(dash.goals).toHaveLength(2);
    expect(dash.nextRitual).toBe("execute_today");

    // Today is still week 1 (already closed) — the view shows the frozen truth.
    const todayView = await json(await todayRoute.GET(req("GET", "/api/today")));
    expect(todayView.days).toHaveLength(7);
    expect(todayView.planStatus).toBe("closed");
    expect(todayView.projectedScore).toMatchObject({ due: 7, completed: 6, scorePct: 86 });

    const scores = await json(await scoresRoute.GET(req("GET", `/api/cycles/${created.id}/scores`), ctx({ id: created.id })));
    expect(scores.weeks[0]).toMatchObject({ scorePct: 86 });
    expect(scores.averageScore).toBe(86);
  });

  it("enforces the book's invariants (negatives)", async () => {
    const list = await json(await cyclesRoute.GET(req("GET", "/api/cycles")));
    const cycleId = list[list.length - 1].id;

    // 4th goal rejected
    const g = await json(
      await goalsRoute.POST(
        req("POST", `/api/cycles/${cycleId}/goals`, {
          title: "Learn piano", why: "Joy", lagMetricName: "Songs", lagUnit: "songs", lagStart: 0, lagTarget: 3,
        }),
        ctx({ id: cycleId }),
      ),
    );
    const fourth = await json(
      await goalsRoute.POST(
        req("POST", `/api/cycles/${cycleId}/goals`, {
          title: "Read 12 books", why: "Growth", lagMetricName: "Books", lagUnit: "books", lagStart: 0, lagTarget: 12,
        }),
        ctx({ id: cycleId }),
      ),
    );
    expect(fourth.error).toMatch(/Max 3 active goals/);

    // goal with a blank why rejected by the service validation (zod passes, book rules don't)
    const noWhy = await json(
      await goalsRoute.POST(
        req("POST", `/api/cycles/${cycleId}/goals`, {
          title: "X", why: "   ", lagMetricName: "Y", lagUnit: "u", lagStart: 0, lagTarget: 1,
        }),
        ctx({ id: cycleId }),
      ),
    );
    expect(noWhy.error).toMatch(/why is required/);

    // dropping the 3rd goal frees a slot (soft drop)
    const dropped = await json(await goalRoute.DELETE(req("DELETE", `/api/goals/${g.id}`), ctx({ id: g.id })));
    expect(dropped.status).toBe("dropped");

    // completion cap: a 3x/week tactic can't take a 4th (time-travel to week 2, still open)
    const detail = await json(await weekRoute.GET(req("GET", `/api/cycles/${cycleId}/weeks/1`), ctx({ id: cycleId, week: 1 })));
    const workouts = (detail.items as any[]).find((i) => i.plannedCount === 3)!;
    const inWeek2 = (partial: [string, string, unknown?]) => req(partial[0], partial[1], partial[2], "2026-10-12");
    for (let i = 0; i < 3; i++) {
      await completionsRoute.POST(inWeek2(["POST", "/api/completions", { tacticId: workouts.tacticId, weekNumber: 2 }]));
    }
    const capped = await completionsRoute.POST(inWeek2(["POST", "/api/completions", { tacticId: workouts.tacticId, weekNumber: 2 }]));
    expect(capped.status).toBe(409);
    expect((await json(capped)).error).toMatch(/no extra credit/);

    // closed week immutability (week 1)
    const again = await closeRoute.POST(req("POST", `/api/week-plans/${detail.plan.id}/close`, {}), ctx({ id: detail.plan.id }));
    expect(again.status).toBe(409);

    // can't plan far ahead
    const future = await generateRoute.POST(req("POST", `/api/cycles/${cycleId}/weeks/5/generate`), ctx({ id: cycleId, week: 5 }));
    expect(future.status).toBe(409);
  });
});

afterAll(() => {
  const p = process.env.TWY_DB_PATH!;
  try {
    fs.rmSync(p, { force: true });
    fs.rmSync(`${p}-wal`, { force: true });
    fs.rmSync(`${p}-shm`, { force: true });
  } catch {
    // Windows may hold the file briefly; temp dir cleanup handles it
  }
});
