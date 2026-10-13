import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb, type DbHandles } from "../db/index";
import * as cycleService from "./cycleService";
import * as planService from "./planService";
import * as scoringService from "./scoringService";
import * as weekPlanService from "./weekPlanService";

const TODAY = "2026-10-05"; // Monday, week 1 day 1 for a cycle starting today
let tmpPath: string;
let h: DbHandles;

beforeEach(() => {
  tmpPath = path.join(os.tmpdir(), `twy-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  h = createDb(tmpPath);
});

afterEach(() => {
  h.sqlite.close();
  fs.rmSync(tmpPath, { force: true });
  fs.rmSync(`${tmpPath}-wal`, { force: true });
  fs.rmSync(`${tmpPath}-shm`, { force: true });
});

function makeActiveCycleWithGoal(name = "Q4") {
  const cycle = cycleService.createCycle(h, { name, startDate: TODAY }, TODAY);
  cycleService.startCycle(h, cycle.id);
  const goal = planService.addGoal(
    h,
    cycle.id,
    { title: "Lose 10 lbs", why: "Energy", lagMetricName: "Weight", lagUnit: "lbs", lagStart: 180, lagTarget: 170 },
    TODAY,
  );
  return { cycle, goal };
}

describe("cycle lifecycle", () => {
  it("defaults start date to next Monday and honors explicit dates", () => {
    const c1 = cycleService.createCycle(h, { name: "A" }, "2026-10-07");
    expect(c1.startDate).toBe("2026-10-12"); // Wednesday after -> next Monday
    const c2 = cycleService.createCycle(h, { name: "B", startDate: "2026-11-02" }, "2026-10-07");
    expect(c2.startDate).toBe("2026-11-02");
  });

  it("blocks starting a second cycle while one is active — one year at a time", () => {
    const a = cycleService.createCycle(h, { name: "A", startDate: TODAY }, TODAY);
    cycleService.startCycle(h, a.id);
    const b = cycleService.createCycle(h, { name: "B", startDate: TODAY }, TODAY);
    expect(() => cycleService.startCycle(h, b.id)).toThrowError(/Archive it first/);
    cycleService.archiveCycle(h, a.id, TODAY);
    expect(() => cycleService.startCycle(h, b.id)).not.toThrow();
  });

  it("rejects malformed dates", () => {
    expect(() => cycleService.createCycle(h, { name: "X", startDate: "2026-02-31" }, TODAY)).toThrow();
  });
});

describe("plan builder rules", () => {
  it("rejects the 4th active goal and goals without a why", () => {
    const { cycle } = makeActiveCycleWithGoal();
    const mk = (n: number, why = "because") =>
      ({ title: `G${n}`, why, lagMetricName: "M", lagUnit: "u", lagStart: 0, lagTarget: n + 1 });
    planService.addGoal(h, cycle.id, mk(2), TODAY);
    planService.addGoal(h, cycle.id, mk(3), TODAY);
    expect(() => planService.addGoal(h, cycle.id, mk(4), TODAY)).toThrowError(/Max 3 active goals/);
    expect(() => planService.addGoal(h, cycle.id, mk(5, "  "), TODAY)).toThrowError(/why is required/);
  });

  it("round-trips due patterns and respects deactivation windows in scoring", () => {
    const { cycle, goal } = makeActiveCycleWithGoal();
    const t = planService.addTactic(h, goal.id, { text: "Perform 30-min strength training", duePattern: { type: "EVERY_WEEK", timesPerWeek: 3 } }, TODAY);
    expect(t.duePattern).toEqual({ type: "EVERY_WEEK", timesPerWeek: 3 });
    planService.deactivateTactic(h, t.id, 3, TODAY); // counts through week 3 inclusive
    const scores = scoringService.getCycleScores(h, cycle.id, "2026-10-19"); // week 3
    expect(scores.weeks[0]?.due).toBe(3); // week 1
    expect(scores.weeks[2]?.due).toBe(3); // week 3 inclusive
    expect(scores.weeks[3]).toBeNull(); // week 4 — tactic no longer due
  });

  it("blocks due-pattern edits after any closed week (plan-revision discipline)", () => {
    const { goal } = makeActiveCycleWithGoal();
    planService.addTactic(h, goal.id, { text: "Do the thing", duePattern: { type: "EVERY_WEEK", timesPerWeek: 2 } }, TODAY);
    const { cycle } = { cycle: { id: goal.cycleId } };
    weekPlanService.generateWeekPlan(h, goal.cycleId, 1, TODAY);
    const planId = weekPlanService.getWeekPlanDetail(h, goal.cycleId, 1, TODAY).plan.id;
    weekPlanService.closeWeek(h, planId, {}, TODAY);
    const tactics = planService.listTacticLikes(h, goal.cycleId);
    const tacticRowId = tactics[0]!.id;
    expect(() =>
      planService.updateTactic(h, tacticRowId, { duePattern: { type: "EVERY_WEEK", timesPerWeek: 5 } }),
    ).toThrowError(/deactivate this tactic and add a new one/);
    void cycle;
  });
});

describe("weekly plan generation", () => {
  it("generates one Monday-default item per due occurrence", () => {
    const { cycle, goal } = makeActiveCycleWithGoal();
    planService.addTactic(h, goal.id, { text: "Train", duePattern: { type: "EVERY_WEEK", timesPerWeek: 3 } }, TODAY);
    planService.addTactic(h, goal.id, { text: "Weigh in", duePattern: { type: "SPECIFIC_WEEKS", weeks: [1] } }, TODAY);
    weekPlanService.generateWeekPlan(h, cycle.id, 1, TODAY);
    const detail = weekPlanService.getWeekPlanDetail(h, cycle.id, 1, TODAY);
    expect(detail.items).toHaveLength(4);
    expect(detail.items.map((i) => i.plannedCount).sort()).toEqual([1, 1, 1, 1]);
    expect(detail.items.filter((i) => i.label === "Train")).toHaveLength(3);
    expect(detail.items.every((i) => i.dayOfWeek === 0)).toBe(true);
  });

  it("is idempotent for drafts and refuses to regenerate closed weeks", () => {
    const { cycle } = makeActiveCycleWithGoal();
    const first = weekPlanService.generateWeekPlan(h, cycle.id, 1, TODAY);
    const again = weekPlanService.generateWeekPlan(h, cycle.id, 1, TODAY);
    expect(again.id).toBe(first.id);
    weekPlanService.closeWeek(h, first.id, {}, TODAY);
    expect(() => weekPlanService.generateWeekPlan(h, cycle.id, 1, TODAY)).toThrowError(/closed weeks are immutable/i);
  });

  it("refuses planning more than one week ahead", () => {
    const { cycle } = makeActiveCycleWithGoal();
    expect(() => weekPlanService.generateWeekPlan(h, cycle.id, 3, TODAY)).toThrowError(/too far ahead/);
    expect(() => weekPlanService.generateWeekPlan(h, cycle.id, 2, TODAY)).not.toThrow();
  });

  it("requires explicit confirmation for plan-revision items", () => {
    const { cycle } = makeActiveCycleWithGoal();
    const plan = weekPlanService.generateWeekPlan(h, cycle.id, 1, TODAY);
    expect(() => weekPlanService.addPlanRevisionItem(h, plan.id, { label: "Random task", dayOfWeek: 2, confirmPlanRevision: false }))
      .toThrowError(/confirmPlanRevision/);
    expect(() => weekPlanService.addPlanRevisionItem(h, plan.id, { label: "Plan revision", dayOfWeek: 2, confirmPlanRevision: true }))
      .not.toThrow();
  });
});

describe("completions and scoring (the honest score)", () => {
  it("caps completions at due — no extra credit", () => {
    const { goal } = makeActiveCycleWithGoal();
    const t = planService.addTactic(h, goal.id, { text: "Train", duePattern: { type: "EVERY_WEEK", timesPerWeek: 3 } }, TODAY);
    for (let i = 0; i < 3; i++) scoringService.logCompletion(h, { tacticId: t.id, weekNumber: 1 }, TODAY);
    expect(() => scoringService.logCompletion(h, { tacticId: t.id, weekNumber: 1 }, TODAY)).toThrowError(/no extra credit/);
  });

  it("rejects future weeks, closed weeks, and inactive cycles", () => {
    const { cycle, goal } = makeActiveCycleWithGoal();
    const t = planService.addTactic(h, goal.id, { text: "Train", duePattern: { type: "EVERY_WEEK", timesPerWeek: 3 } }, TODAY);
    expect(() => scoringService.logCompletion(h, { tacticId: t.id, weekNumber: 2 }, TODAY)).toThrowError(/future week/);
    const plan = weekPlanService.generateWeekPlan(h, cycle.id, 1, TODAY);
    weekPlanService.closeWeek(h, plan.id, {}, TODAY);
    expect(() => scoringService.logCompletion(h, { tacticId: t.id, weekNumber: 1 }, TODAY)).toThrowError(/closed/);
  });

  it("matches hand calculation: 3 of 4 due = 75% AT_RISK", () => {
    const { cycle, goal } = makeActiveCycleWithGoal();
    const a = planService.addTactic(h, goal.id, { text: "Train 3x", duePattern: { type: "EVERY_WEEK", timesPerWeek: 3 } }, TODAY);
    const b = planService.addTactic(h, goal.id, { text: "Weigh in", duePattern: { type: "SPECIFIC_WEEKS", weeks: [1] } }, TODAY);
    weekPlanService.generateWeekPlan(h, cycle.id, 1, TODAY);
    scoringService.logCompletion(h, { tacticId: a.id, weekNumber: 1 }, TODAY);
    scoringService.logCompletion(h, { tacticId: a.id, weekNumber: 1 }, TODAY);
    scoringService.logCompletion(h, { tacticId: a.id, weekNumber: 1 }, TODAY);
    scoringService.logCompletion(h, { tacticId: b.id, weekNumber: 1 }, TODAY);
    const detail = weekPlanService.getWeekPlanDetail(h, cycle.id, 1, TODAY);
    expect(detail.score).toMatchObject({ due: 4, completed: 4, scorePct: 100, band: "ON_TRACK", projected: true });
    scoringService.unlogCompletion(h, { tacticId: b.id, weekNumber: 1 }, TODAY);
    const after = weekPlanService.getWeekPlanDetail(h, cycle.id, 1, TODAY);
    expect(after.score).toMatchObject({ due: 4, completed: 3, scorePct: 75, band: "AT_RISK" });
  });

  it("closing a week freezes it and stores lag values", () => {
    const { cycle, goal } = makeActiveCycleWithGoal();
    const t = planService.addTactic(h, goal.id, { text: "Train", duePattern: { type: "EVERY_WEEK", timesPerWeek: 1 } }, TODAY);
    const plan = weekPlanService.generateWeekPlan(h, cycle.id, 1, TODAY);
    scoringService.logCompletion(h, { tacticId: t.id, weekNumber: 1 }, TODAY);
    weekPlanService.closeWeek(h, plan.id, { reflection: "Solid start", lagValues: [{ goalId: goal.id, value: 178.5 }] }, TODAY);
    const detail = weekPlanService.getWeekPlanDetail(h, cycle.id, 1, TODAY);
    expect(detail.plan.status).toBe("closed");
    expect(detail.score).toMatchObject({ scorePct: 100, closed: true, projected: false });
    expect(() => scoringService.unlogCompletion(h, { tacticId: t.id, weekNumber: 1 }, TODAY)).toThrowError(/closed/);
    expect(() => weekPlanService.closeWeek(h, plan.id, {}, TODAY)).toThrowError(/immutable/);
  });
});

describe("dashboard and today", () => {
  it("walks the rituals in the book's order", () => {
    expect(scoringService.buildDashboard(h, TODAY).nextRitual).toBe("create_cycle");
    const cycle = cycleService.createCycle(h, { name: "Q4", startDate: TODAY }, TODAY);
    expect(scoringService.buildDashboard(h, TODAY).nextRitual).toBe("start_cycle");
    cycleService.startCycle(h, cycle.id);
    expect(scoringService.buildDashboard(h, TODAY).nextRitual).toBe("plan_week");
    weekPlanService.generateWeekPlan(h, cycle.id, 1, TODAY);
    expect(scoringService.buildDashboard(h, TODAY).nextRitual).toBe("execute_today");
  });

  it("flags close_last_week when a new week begins with the old one open", () => {
    const { cycle, goal } = makeActiveCycleWithGoal();
    const t = planService.addTactic(h, goal.id, { text: "Train", duePattern: { type: "EVERY_WEEK", timesPerWeek: 1 } }, TODAY);
    weekPlanService.generateWeekPlan(h, cycle.id, 1, TODAY);
    const nextMonday = "2026-10-12";
    expect(scoringService.buildDashboard(h, nextMonday).nextRitual).toBe("close_last_week");
    const plan = weekPlanService.getWeekPlanDetail(h, cycle.id, 1, nextMonday).plan;
    weekPlanService.closeWeek(h, plan.id, {}, nextMonday);
    expect(scoringService.buildDashboard(h, nextMonday).nextRitual).toBe("plan_week");
    void t;
  });

  it("groups today's items by day with projected score and principle", () => {
    const { cycle, goal } = makeActiveCycleWithGoal();
    planService.addTactic(h, goal.id, { text: "Train", duePattern: { type: "EVERY_WEEK", timesPerWeek: 1 } }, TODAY);
    weekPlanService.generateWeekPlan(h, cycle.id, 1, TODAY);
    const view = scoringService.getTodayView(h, TODAY);
    expect(view).not.toBeNull();
    expect(view!.days).toHaveLength(7);
    expect(view!.dayIndexToday).toBe(0);
    expect(view!.days[0]!.items[0]!.label).toBe("Train");
    expect(view!.projectedScore).toMatchObject({ due: 1, completed: 0, scorePct: 0, projected: true });
    expect(typeof view!.dailyPrinciple).toBe("string");
  });

  it("returns null today view outside execution weeks", () => {
    makeActiveCycleWithGoal();
    expect(scoringService.getTodayView(h, "2026-12-31")).toBeNull(); // week 13+
  });
});
