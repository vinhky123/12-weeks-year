import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb, type DbHandles } from "../db";
import * as executionRepo from "../db/repositories/execution";
import { RuleError } from "../ruleError";
import * as cycleService from "./cycleService";
import * as planService from "./planService";
import * as scoringService from "./scoringService";
import * as weekPlanService from "./weekPlanService";

const WEEK_1 = "2026-10-05";
let tmpDir: string;
let h: DbHandles;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "twy-occurrence-reconcile-"));
  h = createDb(path.join(tmpDir, "app.db"));
});

afterEach(() => {
  h.sqlite.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function setup(due = 3) {
  const cycle = cycleService.createCycle(h, { name: "Occurrences", startDate: WEEK_1 }, WEEK_1);
  cycleService.startCycle(h, cycle.id);
  const goal = planService.addGoal(h, cycle.id, {
    title: "Ship", why: "Momentum", lagMetricName: "Result", lagUnit: "units", lagStart: 0, lagTarget: 10,
  }, WEEK_1);
  const tactic = planService.addTactic(h, goal.id, {
    text: "Practice", duePattern: { type: "EVERY_WEEK", timesPerWeek: due },
  }, WEEK_1);
  const plan = weekPlanService.generateWeekPlan(h, cycle.id, 1, WEEK_1);
  return { cycle, goal, tactic, plan };
}

function occurrences(planId: number, tacticId: number) {
  return executionRepo.listWeekPlanItems(h, planId).filter((item) => item.tacticId === tacticId);
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

describe("draft-plan tactic occurrence reconciliation", () => {
  it("adds every due occurrence when a tactic is added after a draft plan exists", () => {
    const { goal, plan } = setup();
    const added = planService.addTactic(h, goal.id, {
      text: "Write", duePattern: { type: "EVERY_WEEK", timesPerWeek: 2 },
    }, WEEK_1);

    expect(occurrences(plan.id, added.id)).toHaveLength(2);
    expect(occurrences(plan.id, added.id).map((item) => [item.dayOfWeek, item.plannedCount, item.done])).toEqual([
      [0, 1, 0], [0, 1, 0],
    ]);
  });

  it("removes only surplus incomplete occurrences and rejects reductions below completed count", () => {
    const { cycle, tactic, plan } = setup();
    const initial = occurrences(plan.id, tactic.id);
    scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 1 }, WEEK_1);

    planService.updateTactic(h, tactic.id, { duePattern: { type: "EVERY_WEEK", timesPerWeek: 2 } });
    expect(occurrences(plan.id, tactic.id)).toHaveLength(2);
    expect(occurrences(plan.id, tactic.id).find((item) => item.id === initial[0]!.id)?.done).toBe(1);

    scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 1 }, WEEK_1);
    expectConflict(() => planService.updateTactic(h, tactic.id, { duePattern: { type: "EVERY_WEEK", timesPerWeek: 1 } }));
    expect(scoringService.getCycleScores(h, cycle.id, WEEK_1).weeks[0]).toMatchObject({ due: 2, completed: 2, scorePct: 100 });
  });

  it("restores legacy completions when a weekly plan is generated later", () => {
    const cycle = cycleService.createCycle(h, { name: "Occurrences", startDate: WEEK_1 }, WEEK_1);
    cycleService.startCycle(h, cycle.id);
    const goal = planService.addGoal(h, cycle.id, {
      title: "Ship", why: "Momentum", lagMetricName: "Result", lagUnit: "units", lagStart: 0, lagTarget: 10,
    }, WEEK_1);
    const tactic = planService.addTactic(h, goal.id, {
      text: "Practice", duePattern: { type: "EVERY_WEEK", timesPerWeek: 3 },
    }, WEEK_1);

    scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 1 }, WEEK_1);
    scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 1 }, WEEK_1);
    expectConflict(() => planService.updateTactic(h, tactic.id, {
      duePattern: { type: "EVERY_WEEK", timesPerWeek: 1 },
    }));
    const plan = weekPlanService.generateWeekPlan(h, cycle.id, 1, WEEK_1);

    expect(occurrences(plan.id, tactic.id).map((item) => item.done)).toEqual([1, 1, 0]);
    expectConflict(() => planService.updateTactic(h, tactic.id, {
      duePattern: { type: "EVERY_WEEK", timesPerWeek: 1 },
    }));
  });

  it("allows a rename when a normalized legacy row has more completed work than the current due count", () => {
    const { tactic, plan } = setup(2);
    const item = occurrences(plan.id, tactic.id)[0]!;
    executionRepo.updateWeekPlanItem(h, item.id, { plannedCount: 3, done: 3 });

    expect(() => planService.updateTactic(h, tactic.id, { text: "Practice deliberately" })).not.toThrow();
    expect(executionRepo.getWeekPlanItem(h, item.id)).toMatchObject({ label: "Practice deliberately", plannedCount: 3, done: 3 });
  });

  it("restores missing completion-backed rows on rename", () => {
    const { tactic, plan } = setup(2);
    for (const item of occurrences(plan.id, tactic.id)) weekPlanService.removeItem(h, plan.id, item.id);
    scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 1 }, WEEK_1);
    scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 1 }, WEEK_1);

    expect(() => planService.updateTactic(h, tactic.id, { text: "Practice deliberately" })).not.toThrow();

    const restored = occurrences(plan.id, tactic.id);
    expect(restored.map((item) => [item.label, item.done, item.plannedCount])).toEqual([
      ["Practice deliberately", 1, 1],
      ["Practice deliberately", 1, 1],
    ]);
    expect(executionRepo.listCompletionsForTacticWeek(h, tactic.id, 1)).toHaveLength(2);
  });

  it("updates only labels that still match the old tactic text and preserves custom labels and placement", () => {
    const { tactic, plan } = setup(2);
    const [custom, defaultLabel] = occurrences(plan.id, tactic.id);
    weekPlanService.moveItem(h, plan.id, custom!.id, { dayOfWeek: 4, label: "Owner's custom wording" });

    planService.updateTactic(h, tactic.id, { text: "Practice deliberately" });

    expect(executionRepo.getWeekPlanItem(h, custom!.id)).toMatchObject({ label: "Owner's custom wording", dayOfWeek: 4 });
    expect(executionRepo.getWeekPlanItem(h, defaultLabel!.id)).toMatchObject({ label: "Practice deliberately" });
  });

  it("removes incomplete occurrences after the inclusive deactivation cutoff", () => {
    const { cycle, tactic } = setup(2);
    const plan = weekPlanService.generateWeekPlan(h, cycle.id, 2, WEEK_1);
    planService.deactivateTactic(h, tactic.id, 1, WEEK_1);

    expect(occurrences(plan.id, tactic.id)).toHaveLength(0);
  });
});
