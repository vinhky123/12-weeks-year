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
const WEEK_11_MIDWEEK = "2026-09-23";
const WEEK_11_LAST_DAY = "2026-09-27";
const WEEK_12 = "2026-09-28";
const WEEK_12_MIDWEEK = "2026-09-30";
const WEEK_12_LAST_DAY = "2026-10-04";
const WEEK_13 = "2026-10-05";
const WEEK_13_DAY_2 = "2026-10-06";
const WEEK_13_LAST_DAY = "2026-10-11";
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

/** Active cycle whose drafted week 12 already holds one catch-up completion, logged on the first day of week 13. */
function makeCaughtUpWeek12() {
  const { cycle, tactic } = makeCycle();
  weekPlanService.generateWeekPlan(h, cycle.id, 12, WEEK_12);
  scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 12, date: WEEK_12_MIDWEEK }, WEEK_13);
  return { cycle, tactic };
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

  it("promotes a week's final score into the average only when its plan closes (week 2 closing at 0% moves 100 to 50)", () => {
    const { cycle, tactic } = makeCycle();
    const week1 = weekPlanService.generateWeekPlan(h, cycle.id, 1, WEEK_1);
    scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 1 }, WEEK_1);
    weekPlanService.closeWeek(h, week1.id, {}, WEEK_1);
    const week2 = weekPlanService.generateWeekPlan(h, cycle.id, 2, WEEK_2);

    // Open week 2 sits at 0% progress, yet the average is still just the final week 1 score.
    const open = scoringService.getCycleScores(h, cycle.id, WEEK_2);
    expect(open.averageScore).toBe(100);
    expect(open.weeks[1]).toMatchObject({ scorePct: 0, closed: false, projected: true });

    // Closing makes the 0% final, so the average becomes (100 + 0) / 2.
    weekPlanService.closeWeek(h, week2.id, {}, WEEK_2);
    const closed = scoringService.getCycleScores(h, cycle.id, WEEK_2);
    expect(closed.averageScore).toBe(50);
    expect(closed.weeks[0]).toMatchObject({ scorePct: 100, closed: true, projected: false });
    expect(closed.weeks[1]).toMatchObject({ scorePct: 0, closed: true, projected: false });
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

// Week 12 runs 2026-09-28..2026-10-04 and week 13 starts 2026-10-05. 2026-09-31 does not exist; a lenient
// parser would roll it into 2026-10-01, which is inside week 12, so only strict validation rejects it.
const REJECTED_CATCH_UP_DATES = [
  ["the day before week 12", WEEK_11_LAST_DAY, /belong to execution week 12/i],
  ["the first day of week 13", WEEK_13, /belong to execution week 12/i],
  ["2026-09-31 (not a calendar date)", "2026-09-31", /valid.*calendar date/i],
  ["a day after today", WEEK_13_DAY_2, /after today/i],
] as const;

describe("week-13 catch-up boundaries", () => {
  it.each([
    ["the first day of week 12", WEEK_12, WEEK_13],
    ["the last day of week 12", WEEK_12_LAST_DAY, WEEK_13],
    ["the last day of week 12, used on the last day of week 13", WEEK_12_LAST_DAY, WEEK_13_LAST_DAY],
  ] as const)("accepts a catch-up and undo dated %s", (_label, date, today) => {
    const { cycle, tactic } = makeCycle();
    weekPlanService.generateWeekPlan(h, cycle.id, 12, WEEK_12);

    scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 12, date }, today);
    expect(completionState(cycle.id)).toEqual([{ tacticId: tactic.id, cycleWeek: 12, date }]);
    expect(itemState(cycle.id, 12)).toEqual([1]);

    scoringService.unlogCompletion(h, { tacticId: tactic.id, weekNumber: 12, date }, today);
    expect(completionState(cycle.id)).toEqual([]);
    expect(itemState(cycle.id, 12)).toEqual([0]);
  });

  it.each(REJECTED_CATCH_UP_DATES)("rejects a week-13 catch-up logged for %s without changing persisted state", (_label, date, error) => {
    const { cycle, tactic } = makeCycle();
    weekPlanService.generateWeekPlan(h, cycle.id, 12, WEEK_12);

    expect(() => scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 12, date }, WEEK_13)).toThrowError(error);
    expect(completionState(cycle.id)).toEqual([]);
    expect(itemState(cycle.id, 12)).toEqual([0]);
  });

  it.each(REJECTED_CATCH_UP_DATES)("rejects a week-13 undo requested for %s and keeps the completion", (_label, date, error) => {
    const { cycle, tactic } = makeCaughtUpWeek12();

    expect(() => scoringService.unlogCompletion(h, { tacticId: tactic.id, weekNumber: 12, date }, WEEK_13)).toThrowError(error);
    expect(completionState(cycle.id)).toEqual([{ tacticId: tactic.id, cycleWeek: 12, date: WEEK_12_MIDWEEK }]);
    expect(itemState(cycle.id, 12)).toEqual([1]);
  });

  it("rejects a week-13 undo for week 11 and keeps the completion", () => {
    const { cycle, tactic } = makeCycle();
    weekPlanService.generateWeekPlan(h, cycle.id, 11, WEEK_11);
    scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 11, date: WEEK_11_MIDWEEK }, WEEK_11_MIDWEEK);

    expect(() => scoringService.unlogCompletion(h, { tacticId: tactic.id, weekNumber: 11, date: WEEK_11_MIDWEEK }, WEEK_13)).toThrowError(
      /only.*week 12/i,
    );
    expect(completionState(cycle.id)).toEqual([{ tacticId: tactic.id, cycleWeek: 11, date: WEEK_11_MIDWEEK }]);
    expect(itemState(cycle.id, 11)).toEqual([1]);
  });

  it("rejects a week-13 undo once week 12 is closed and keeps the completion", () => {
    const { cycle, tactic } = makeCycle();
    const week12 = weekPlanService.generateWeekPlan(h, cycle.id, 12, WEEK_12);
    scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 12, date: WEEK_12_MIDWEEK }, WEEK_12_MIDWEEK);
    weekPlanService.closeWeek(h, week12.id, {}, WEEK_12_MIDWEEK);

    expect(() => scoringService.unlogCompletion(h, { tacticId: tactic.id, weekNumber: 12, date: WEEK_12_MIDWEEK }, WEEK_13)).toThrowError(/closed/i);
    expect(completionState(cycle.id)).toEqual([{ tacticId: tactic.id, cycleWeek: 12, date: WEEK_12_MIDWEEK }]);
    expect(itemState(cycle.id, 12)).toEqual([1]);
  });

  it("rejects a week-13 undo in an archived cycle and keeps the completion", () => {
    const { cycle, tactic } = makeCaughtUpWeek12();
    cycleService.archiveCycle(h, cycle.id, WEEK_13);

    expect(() => scoringService.unlogCompletion(h, { tacticId: tactic.id, weekNumber: 12, date: WEEK_12_MIDWEEK }, WEEK_13)).toThrowError(/archived/i);
    expect(completionState(cycle.id)).toEqual([{ tacticId: tactic.id, cycleWeek: 12, date: WEEK_12_MIDWEEK }]);
    expect(itemState(cycle.id, 12)).toEqual([1]);
  });

  it("rejects an undo after week 13 and keeps the completion", () => {
    const { cycle, tactic } = makeCaughtUpWeek12();

    expect(() => scoringService.unlogCompletion(h, { tacticId: tactic.id, weekNumber: 12, date: WEEK_12_MIDWEEK }, POST_CYCLE)).toThrowError(
      /outside.*catch-up|outside.*cycle/i,
    );
    expect(completionState(cycle.id)).toEqual([{ tacticId: tactic.id, cycleWeek: 12, date: WEEK_12_MIDWEEK }]);
    expect(itemState(cycle.id, 12)).toEqual([1]);
  });

  it("rejects a week-13 undo when week 12 has no draft plan and keeps the completion", () => {
    const { cycle, tactic } = makeCycle();
    scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 12, date: WEEK_12_MIDWEEK }, WEEK_12_MIDWEEK);

    expect(() => scoringService.unlogCompletion(h, { tacticId: tactic.id, weekNumber: 12, date: WEEK_12_MIDWEEK }, WEEK_13)).toThrowError(
      /draft week 12 plan/i,
    );
    expect(completionState(cycle.id)).toEqual([{ tacticId: tactic.id, cycleWeek: 12, date: WEEK_12_MIDWEEK }]);
  });
});
