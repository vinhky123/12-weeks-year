import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { COMPLETION_SCHEMA } from "../../lib/contracts";
import { createDb, type DbHandles } from "../db/index";
import * as executionRepo from "../db/repositories/execution";
import { cycles as cyclesTable } from "../db/schema";
import * as cycleService from "./cycleService";
import * as planService from "./planService";
import * as scoringService from "./scoringService";
import * as weekPlanService from "./weekPlanService";

const START = "2026-07-13";
const WEEK_1 = "2026-07-13";
const WEEK_2 = "2026-07-20";
const WEEK_3 = "2026-07-27";
const WEEK_11 = "2026-09-21";
const WEEK_12 = "2026-09-28";
const WEEK_12_MIDWEEK = "2026-09-30";
const WEEK_13 = "2026-10-05";
const POST_CYCLE = "2026-10-12";

let tmpPath: string;
let h: DbHandles;

beforeEach(() => {
  tmpPath = path.join(os.tmpdir(), `twy-finalization-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  h = createDb(tmpPath);
});

afterEach(() => {
  h.sqlite.close();
  fs.rmSync(tmpPath, { force: true });
  fs.rmSync(`${tmpPath}-wal`, { force: true });
  fs.rmSync(`${tmpPath}-shm`, { force: true });
});

function makeCycle(duePattern: { type: "EVERY_WEEK"; timesPerWeek: number } | { type: "SPECIFIC_WEEKS"; weeks: number[] } = { type: "EVERY_WEEK", timesPerWeek: 1 }) {
  const cycle = cycleService.createCycle(h, { name: "Finalization", startDate: START }, START);
  cycleService.startCycle(h, cycle.id);
  const goal = planService.addGoal(
    h,
    cycle.id,
    { title: "Ship", why: "Finish well", lagMetricName: "Result", lagUnit: "%", lagStart: 0, lagTarget: 100 },
    START,
  );
  const tactic = planService.addTactic(h, goal.id, { text: "Do the work", duePattern }, START);
  return { cycle, goal, tactic };
}

function itemState(cycleId: number, weekNumber: number) {
  const plan = executionRepo.findWeekPlan(h, cycleId, weekNumber);
  return plan ? executionRepo.listWeekPlanItems(h, plan.id).map((item) => item.done) : [];
}

function completionState(cycleId: number) {
  return executionRepo.listCycleCompletions(h, cycleId).map((completion) => ({
    tacticId: completion.tacticId,
    cycleWeek: completion.cycleWeek,
    date: completion.date,
  }));
}

describe("finalized cycle scores", () => {
  it("averages only closed weeks while open current work remains projected", () => {
    const { cycle, tactic } = makeCycle();
    const week1 = weekPlanService.generateWeekPlan(h, cycle.id, 1, WEEK_1);
    scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 1 }, WEEK_1);
    weekPlanService.closeWeek(h, week1.id, {}, WEEK_1);
    const week2 = weekPlanService.generateWeekPlan(h, cycle.id, 2, WEEK_2);

    const before = scoringService.getCycleScores(h, cycle.id, WEEK_2);
    expect(before.averageScore).toBe(100);
    expect(before.weeks[0]).toMatchObject({ scorePct: 100, closed: true, projected: false });
    expect(before.weeks[1]).toMatchObject({ scorePct: 0, closed: false, projected: true });

    scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 2 }, WEEK_2);
    const during = scoringService.getCycleScores(h, cycle.id, WEEK_2);
    expect(during.averageScore).toBe(100);
    expect(during.weeks[1]).toMatchObject({ scorePct: 100, closed: false, projected: true });

    weekPlanService.closeWeek(h, week2.id, {}, WEEK_2);
    const after = scoringService.getCycleScores(h, cycle.id, WEEK_2);
    expect(after.averageScore).toBe(100);
    expect(after.weeks[1]).toMatchObject({ scorePct: 100, closed: true, projected: false });
  });

  it("keeps open historical and current weeks as projected progress and future weeks null", () => {
    const { cycle } = makeCycle();
    weekPlanService.generateWeekPlan(h, cycle.id, 1, WEEK_1);
    weekPlanService.generateWeekPlan(h, cycle.id, 2, WEEK_1);

    expect(weekPlanService.getWeekPlanDetail(h, cycle.id, 2, WEEK_1).score).toMatchObject({ projected: true });

    const scores = scoringService.getCycleScores(h, cycle.id, WEEK_2);
    expect(scores.averageScore).toBeNull();
    expect(scores.weeks[0]).toMatchObject({ scorePct: 0, closed: false, projected: true });
    expect(scores.weeks[1]).toMatchObject({ scorePct: 0, closed: false, projected: true });
    expect(scores.weeks[2]).toBeNull();
    expect(weekPlanService.getWeekPlanDetail(h, cycle.id, 1, WEEK_2).score).toMatchObject({ projected: true });
  });

  it("excludes closed weeks with nothing due from the average", () => {
    const { cycle } = makeCycle({ type: "SPECIFIC_WEEKS", weeks: [2] });
    const week1 = weekPlanService.generateWeekPlan(h, cycle.id, 1, WEEK_1);
    weekPlanService.closeWeek(h, week1.id, {}, WEEK_1);

    const scores = scoringService.getCycleScores(h, cycle.id, WEEK_1);
    expect(scores.weeks[0]).toBeNull();
    expect(scores.averageScore).toBeNull();
  });
});

describe("dated completion eligibility", () => {
  it.each(["active", "review"] as const)("allows week-13 completion and undo for a drafted week 12 in a %s cycle", (status) => {
    const { cycle, tactic } = makeCycle();
    weekPlanService.generateWeekPlan(h, cycle.id, 12, WEEK_12);
    if (status === "review") h.db.update(cyclesTable).set({ status }).where(eq(cyclesTable.id, cycle.id)).run();

    scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 12, date: WEEK_12_MIDWEEK }, WEEK_13);
    expect(completionState(cycle.id)).toEqual([{ tacticId: tactic.id, cycleWeek: 12, date: WEEK_12_MIDWEEK }]);
    expect(itemState(cycle.id, 12)).toEqual([1]);

    expect(() => scoringService.unlogCompletion(h, { tacticId: tactic.id, weekNumber: 12 }, WEEK_13)).toThrowError(/explicit date/i);
    expect(completionState(cycle.id)).toEqual([{ tacticId: tactic.id, cycleWeek: 12, date: WEEK_12_MIDWEEK }]);
    expect(itemState(cycle.id, 12)).toEqual([1]);

    scoringService.unlogCompletion(h, { tacticId: tactic.id, weekNumber: 12, date: WEEK_12_MIDWEEK }, WEEK_13);
    expect(completionState(cycle.id)).toEqual([]);
    expect(itemState(cycle.id, 12)).toEqual([0]);
  });

  it("keeps legacy current-week POST and DELETE defaults", () => {
    const { cycle, tactic } = makeCycle();
    weekPlanService.generateWeekPlan(h, cycle.id, 1, WEEK_1);

    scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 1 }, WEEK_1);
    expect(completionState(cycle.id)[0]?.date).toBe(WEEK_1);
    scoringService.unlogCompletion(h, { tacticId: tactic.id, weekNumber: 1 }, WEEK_1);
    expect(completionState(cycle.id)).toEqual([]);
  });

  it("uses an existing completion date for normal past-week undo but requires an explicit past-week POST date", () => {
    const { cycle, tactic } = makeCycle();
    weekPlanService.generateWeekPlan(h, cycle.id, 2, WEEK_2);
    scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 2, date: WEEK_2 }, WEEK_2);

    expect(() => scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 1 }, WEEK_3)).toThrowError(/explicit date/i);
    scoringService.unlogCompletion(h, { tacticId: tactic.id, weekNumber: 2 }, WEEK_3);
    expect(completionState(cycle.id)).toEqual([]);
  });

  it.each([
    ["invalid calendar date", { weekNumber: 2, date: "2026-02-31" }, WEEK_2, /valid.*calendar date/i],
    ["future date", { weekNumber: 2, date: "2026-07-21" }, WEEK_2, /after today/i],
    ["date outside requested week", { weekNumber: 2, date: "2026-07-19" }, WEEK_2, /week 2/i],
  ])("rejects a %s without changing completions or cached items", (_label, partial, today, error) => {
    const { cycle, tactic } = makeCycle();
    weekPlanService.generateWeekPlan(h, cycle.id, 2, WEEK_2);
    const beforeCompletions = completionState(cycle.id);
    const beforeItems = itemState(cycle.id, 2);

    expect(() => scoringService.logCompletion(h, { tacticId: tactic.id, ...partial }, today as string)).toThrowError(error as RegExp);
    expect(completionState(cycle.id)).toEqual(beforeCompletions);
    expect(itemState(cycle.id, 2)).toEqual(beforeItems);
  });

  it.each([
    ["missing catch-up date", 12, undefined, WEEK_13, true, "active", /explicit date/i],
    ["week 11 catch-up", 11, WEEK_11, WEEK_13, true, "active", /only.*week 12/i],
    ["closed week 12", 12, "not-a-date", WEEK_13, true, "active", /closed/i],
    ["archived cycle", 12, "not-a-date", WEEK_13, true, "archived", /archived/i],
    ["post-week-13", 12, WEEK_12_MIDWEEK, POST_CYCLE, true, "active", /outside.*catch-up|outside.*cycle/i],
    ["absent week-12 plan", 12, WEEK_12_MIDWEEK, WEEK_13, false, "active", /draft week 12 plan/i],
  ] as const)("rejects %s without changing persisted state", (_label, weekNumber, date, today, createPlan, status, error) => {
    const { cycle, tactic } = makeCycle();
    if (createPlan) {
      const plan = weekPlanService.generateWeekPlan(h, cycle.id, weekNumber, weekNumber === 11 ? WEEK_11 : WEEK_12);
      if (_label === "closed week 12") weekPlanService.closeWeek(h, plan.id, {}, WEEK_12);
    }
    if (status === "archived") cycleService.archiveCycle(h, cycle.id, WEEK_13);
    const beforeCompletions = completionState(cycle.id);
    const beforeItems = itemState(cycle.id, weekNumber);

    expect(() => scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber, date }, today)).toThrowError(error);
    expect(completionState(cycle.id)).toEqual(beforeCompletions);
    expect(itemState(cycle.id, weekNumber)).toEqual(beforeItems);
  });

  it("rolls back completion insert when cached item sync fails", () => {
    const { cycle, tactic } = makeCycle();
    weekPlanService.generateWeekPlan(h, cycle.id, 1, WEEK_1);
    h.sqlite.exec("CREATE TRIGGER fail_item_sync BEFORE UPDATE ON week_plan_items BEGIN SELECT RAISE(ABORT, 'sync failed'); END;");

    expect(() => scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 1 }, WEEK_1)).toThrowError(/sync failed/);
    expect(completionState(cycle.id)).toEqual([]);
    expect(itemState(cycle.id, 1)).toEqual([0]);
  });

  it("rolls back completion delete when cached item sync fails", () => {
    const { cycle, tactic } = makeCycle();
    weekPlanService.generateWeekPlan(h, cycle.id, 1, WEEK_1);
    scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 1 }, WEEK_1);
    h.sqlite.exec("CREATE TRIGGER fail_item_sync BEFORE UPDATE ON week_plan_items BEGIN SELECT RAISE(ABORT, 'sync failed'); END;");

    expect(() => scoringService.unlogCompletion(h, { tacticId: tactic.id, weekNumber: 1 }, WEEK_1)).toThrowError(/sync failed/);
    expect(completionState(cycle.id)).toEqual([{ tacticId: tactic.id, cycleWeek: 1, date: WEEK_1 }]);
    expect(itemState(cycle.id, 1)).toEqual([1]);
  });

  it("keeps the optional completion date in the request contract", () => {
    expect(COMPLETION_SCHEMA.parse({ tacticId: 7, weekNumber: 12, date: WEEK_12_MIDWEEK })).toEqual({
      tacticId: 7,
      weekNumber: 12,
      date: WEEK_12_MIDWEEK,
    });
  });
});
