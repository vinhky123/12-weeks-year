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

const TODAY = "2026-10-05";
let tmpDir: string;
let h: DbHandles;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "twy-occurrence-scoring-"));
  h = createDb(path.join(tmpDir, "app.db"));
});

afterEach(() => {
  h.sqlite.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function setup() {
  const cycle = cycleService.createCycle(h, { name: "Scoring occurrences", startDate: TODAY }, TODAY);
  cycleService.startCycle(h, cycle.id);
  const goal = planService.addGoal(h, cycle.id, {
    title: "Ship", why: "Momentum", lagMetricName: "Result", lagUnit: "units", lagStart: 0, lagTarget: 10,
  }, TODAY);
  const tactic = planService.addTactic(h, goal.id, {
    text: "Practice", duePattern: { type: "EVERY_WEEK", timesPerWeek: 3 },
  }, TODAY);
  const plan = weekPlanService.generateWeekPlan(h, cycle.id, 1, TODAY);
  return { cycle, tactic, plan, items: executionRepo.listWeekPlanItems(h, plan.id) };
}

function expectRuleError(action: () => unknown, status: number) {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(RuleError);
    expect((error as RuleError).status).toBe(status);
    return;
  }
  throw new Error(`Expected a ${status} RuleError`);
}

function snapshot(planId: number, tacticId: number) {
  return {
    items: executionRepo.listWeekPlanItems(h, planId),
    completions: executionRepo.listCompletionsForTacticWeek(h, tacticId, 1),
  };
}

describe("occurrence-aware completion", () => {
  it("completes and undoes only the selected occurrence while preserving the weekly aggregate score", () => {
    const { cycle, tactic, plan, items } = setup();

    const logged = scoringService.logCompletion(h, {
      tacticId: tactic.id, weekNumber: 1, weekPlanItemId: items[2]!.id,
    }, TODAY);
    expect(logged.done).toBe(1);
    expect(executionRepo.listWeekPlanItems(h, plan.id).map((item) => item.done)).toEqual([0, 0, 1]);
    expect(executionRepo.listCompletionsForTacticWeek(h, tactic.id, 1)[0]).toMatchObject({ weekPlanItemId: items[2]!.id });
    expect(scoringService.getCycleScores(h, cycle.id, TODAY).weeks[0]).toMatchObject({ due: 3, completed: 1, scorePct: 33 });

    scoringService.unlogCompletion(h, {
      tacticId: tactic.id, weekNumber: 1, weekPlanItemId: items[2]!.id,
    }, TODAY);
    expect(executionRepo.listWeekPlanItems(h, plan.id).map((item) => item.done)).toEqual([0, 0, 0]);
    expect(executionRepo.listCompletionsForTacticWeek(h, tactic.id, 1)).toHaveLength(0);
  });

  it("resolves legacy POST to the next incomplete occurrence and legacy DELETE to the latest completion", () => {
    const { tactic, plan, items } = setup();

    scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 1 }, TODAY);
    scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 1 }, TODAY);
    expect(executionRepo.listWeekPlanItems(h, plan.id).map((item) => item.done)).toEqual([1, 1, 0]);
    expect(executionRepo.listCompletionsForTacticWeek(h, tactic.id, 1).map((completion) => completion.weekPlanItemId)).toEqual([
      items[1]!.id, items[0]!.id,
    ]);

    scoringService.unlogCompletion(h, { tacticId: tactic.id, weekNumber: 1 }, TODAY);
    expect(executionRepo.listWeekPlanItems(h, plan.id).map((item) => item.done)).toEqual([1, 0, 0]);
  });

  it("lets an occurrence undo one legacy unlinked completion without linking historical rows", () => {
    const { tactic, plan, items } = setup();
    executionRepo.insertCompletion(h, { tacticId: tactic.id, cycleWeek: 1, date: TODAY, createdAt: TODAY });
    executionRepo.updateWeekPlanItem(h, items[0]!.id, { done: 1 });

    scoringService.unlogCompletion(h, { tacticId: tactic.id, weekNumber: 1, weekPlanItemId: items[0]!.id }, TODAY);

    expect(executionRepo.listWeekPlanItems(h, plan.id).map((item) => item.done)).toEqual([0, 0, 0]);
    expect(executionRepo.listCompletionsForTacticWeek(h, tactic.id, 1)).toHaveLength(0);
  });

  it("rejects a mismatched occurrence or a closed plan without writing", () => {
    const { tactic, plan, items } = setup();
    const otherTactic = planService.addTactic(h, planService.addGoal(h, tactic.goalId, {
      title: "Second goal", why: "Reason", lagMetricName: "Metric", lagUnit: "u", lagStart: 0, lagTarget: 1,
    }, TODAY).id, { text: "Write", duePattern: { type: "EVERY_WEEK", timesPerWeek: 1 } }, TODAY);
    const otherItem = executionRepo.listWeekPlanItems(h, plan.id).find((item) => item.tacticId === otherTactic.id)!;
    let before = snapshot(plan.id, tactic.id);

    expectRuleError(() => scoringService.logCompletion(h, {
      tacticId: tactic.id, weekNumber: 1, weekPlanItemId: otherItem.id,
    }, TODAY), 422);
    expect(snapshot(plan.id, tactic.id)).toEqual(before);

    expectRuleError(() => scoringService.logCompletion(h, {
      tacticId: tactic.id, weekNumber: 1, weekPlanItemId: 99999,
    }, TODAY), 404);
    expect(snapshot(plan.id, tactic.id)).toEqual(before);

    const futurePlan = weekPlanService.generateWeekPlan(h, cycleService.getActiveCycleInfo(h, TODAY)!.cycle.id, 2, TODAY);
    const futureItem = executionRepo.listWeekPlanItems(h, futurePlan.id).find((item) => item.tacticId === tactic.id)!;
    expectRuleError(() => scoringService.logCompletion(h, {
      tacticId: tactic.id, weekNumber: 1, weekPlanItemId: futureItem.id,
    }, TODAY), 422);
    expect(snapshot(plan.id, tactic.id)).toEqual(before);

    expectRuleError(() => scoringService.unlogCompletion(h, {
      tacticId: tactic.id, weekNumber: 1, weekPlanItemId: items[0]!.id,
    }, TODAY), 404);
    expect(snapshot(plan.id, tactic.id)).toEqual(before);

    scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 1, weekPlanItemId: items[0]!.id }, TODAY);
    before = snapshot(plan.id, tactic.id);
    expectRuleError(() => scoringService.logCompletion(h, {
      tacticId: tactic.id, weekNumber: 1, weekPlanItemId: items[0]!.id,
    }, TODAY), 409);
    expect(snapshot(plan.id, tactic.id)).toEqual(before);

    weekPlanService.closeWeek(h, plan.id, {}, TODAY);
    before = snapshot(plan.id, tactic.id);
    expectRuleError(() => scoringService.logCompletion(h, {
      tacticId: tactic.id, weekNumber: 1, weekPlanItemId: items[0]!.id,
    }, TODAY), 409);
    expect(snapshot(plan.id, tactic.id)).toEqual(before);
  });
});
