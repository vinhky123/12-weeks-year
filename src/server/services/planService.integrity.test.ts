import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { createDb, type DbHandles } from "../db/index";
import * as planRepo from "../db/repositories/plan";
import { RuleError } from "../ruleError";
import * as cycleService from "./cycleService";
import * as planService from "./planService";
import * as scoringService from "./scoringService";
import * as weekPlanService from "./weekPlanService";

const WEEK_1 = "2026-10-05";
const WEEK_2 = "2026-10-12";
const WEEK_3 = "2026-10-19";

let tmpDir: string;
let h: DbHandles;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "twy-plan-integrity-"));
  h = createDb(path.join(tmpDir, "app.db"));
});

afterEach(() => {
  h.sqlite.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function setup() {
  const cycle = cycleService.createCycle(h, { name: "Integrity", startDate: WEEK_1 }, WEEK_1);
  cycleService.startCycle(h, cycle.id);
  const goal = planService.addGoal(
    h,
    cycle.id,
    { title: "Ship", why: "Reliably", lagMetricName: "Result", lagUnit: "units", lagStart: 0, lagTarget: 10 },
    WEEK_1,
  );
  return { cycle, goal };
}

function closeWeek2(cycleId: number) {
  const plan = weekPlanService.generateWeekPlan(h, cycleId, 2, WEEK_2);
  weekPlanService.closeWeek(h, plan.id, {}, WEEK_2);
}

function expectConflict(action: () => unknown) {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(RuleError);
    expect((error as RuleError).status).toBe(409);
    return;
  }
  throw new Error("Expected a 409 RuleError");
}

function snapshotPlan(cycleId: number) {
  return {
    goals: planRepo.listGoals(h, cycleId),
    tactics: planRepo.listTacticsByCycle(h, cycleId),
  };
}

describe("closed-score plan integrity", () => {
  it("rejects backdating a live tactic before a closed week and preserves its 50% score", () => {
    const { cycle, goal } = setup();
    const tactic = planService.addTactic(
      h,
      goal.id,
      { text: "Practice twice", duePattern: { type: "EVERY_WEEK", timesPerWeek: 2 } },
      WEEK_1,
    );
    weekPlanService.generateWeekPlan(h, cycle.id, 2, WEEK_2);
    scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 2 }, WEEK_2);
    closeWeek2(cycle.id);

    expectConflict(() => planService.deactivateTactic(h, tactic.id, 1, WEEK_2));

    expect(planRepo.getTactic(h, tactic.id)?.deactivatedAtWeek).toBeNull();
    expect(scoringService.getCycleScores(h, cycle.id, WEEK_2).weeks[1]).toMatchObject({ due: 2, completed: 1, scorePct: 50 });
  });

  it("rejects re-extending a previously deactivated tactic into a closed week", () => {
    const { cycle, goal } = setup();
    const tactic = planService.addTactic(
      h,
      goal.id,
      { text: "Practice weekly", duePattern: { type: "EVERY_WEEK", timesPerWeek: 2 } },
      WEEK_1,
    );
    planService.deactivateTactic(h, tactic.id, 1, WEEK_1);
    closeWeek2(cycle.id);

    expectConflict(() => planService.deactivateTactic(h, tactic.id, 3, WEEK_2));

    expect(planRepo.getTactic(h, tactic.id)?.deactivatedAtWeek).toBe(1);
  });

  it.each([2, 3])("allows an inclusive cutoff at week %i when closed week 2 stays due", (cutoff) => {
    const { cycle, goal } = setup();
    const tactic = planService.addTactic(
      h,
      goal.id,
      { text: "Practice weekly", duePattern: { type: "EVERY_WEEK", timesPerWeek: 1 } },
      WEEK_1,
    );
    closeWeek2(cycle.id);

    expect(planService.deactivateTactic(h, tactic.id, cutoff, WEEK_2).deactivatedAtWeek).toBe(cutoff);
  });

  it("allows a cutoff when a specific-weeks tactic remains irrelevant to the closed week", () => {
    const { cycle, goal } = setup();
    const tactic = planService.addTactic(
      h,
      goal.id,
      { text: "Review once", duePattern: { type: "SPECIFIC_WEEKS", weeks: [1] } },
      WEEK_1,
    );
    closeWeek2(cycle.id);

    expect(planService.deactivateTactic(h, tactic.id, 1, WEEK_2).deactivatedAtWeek).toBe(1);
  });

  it("preflights every tactic before dropping a goal", () => {
    const { cycle, goal } = setup();
    planService.addTactic(h, goal.id, { text: "Review once", duePattern: { type: "SPECIFIC_WEEKS", weeks: [1] } }, WEEK_1);
    planService.addTactic(h, goal.id, { text: "Practice weekly", duePattern: { type: "EVERY_WEEK", timesPerWeek: 1 } }, WEEK_1);
    closeWeek2(cycle.id);
    const before = snapshotPlan(cycle.id);

    expectConflict(() => planService.dropGoal(h, goal.id, WEEK_1));

    expect(snapshotPlan(cycle.id)).toEqual(before);
  });

  it("rejects adding into a closed current week but allows a future-only addition", () => {
    const { cycle, goal } = setup();
    closeWeek2(cycle.id);

    expectConflict(() =>
      planService.addTactic(h, goal.id, { text: "Practice now", duePattern: { type: "EVERY_WEEK", timesPerWeek: 1 } }, WEEK_2),
    );
    expect(planRepo.listTacticsByGoal(h, goal.id)).toEqual([]);

    expect(
      planService.addTactic(h, goal.id, { text: "Practice later", duePattern: { type: "EVERY_WEEK", timesPerWeek: 1 } }, WEEK_3),
    ).toMatchObject({ activeFromWeek: 3 });
  });
});

describe("archived cycle plan integrity", () => {
  it("rejects every public plan write without changing goals or tactics", () => {
    const { cycle, goal } = setup();
    const tactic = planService.addTactic(
      h,
      goal.id,
      { text: "Practice weekly", duePattern: { type: "EVERY_WEEK", timesPerWeek: 1 } },
      WEEK_1,
    );
    cycleService.archiveCycle(h, cycle.id, WEEK_2);
    const before = snapshotPlan(cycle.id);
    const actions = [
      () => planService.addGoal(h, cycle.id, { title: "New", why: "Reason", lagMetricName: "Metric", lagUnit: "u", lagStart: 0, lagTarget: 1 }, WEEK_2),
      () => planService.updateGoal(h, goal.id, { title: "Changed" }),
      () => planService.dropGoal(h, goal.id, WEEK_2),
      () => planService.addTactic(h, goal.id, { text: "Practice more", duePattern: { type: "EVERY_WEEK", timesPerWeek: 2 } }, WEEK_2),
      () => planService.updateTactic(h, tactic.id, { text: "Practice differently" }),
      () => planService.deactivateTactic(h, tactic.id, 2, WEEK_2),
    ];

    for (const action of actions) expectConflict(action);
    expect(snapshotPlan(cycle.id)).toEqual(before);
  });
});
