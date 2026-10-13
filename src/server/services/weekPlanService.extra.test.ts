import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb, type DbHandles } from "../db/index";
import * as cyclesRepo from "../db/repositories/cycles";
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
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "twy-extra-week-item-"));
  h = createDb(path.join(tmpDir, "app.db"));
});

afterEach(() => {
  h.sqlite.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function setupPlan() {
  const cycle = cycleService.createCycle(h, { name: "Extra item cycle", startDate: TODAY }, TODAY);
  cycleService.startCycle(h, cycle.id);
  const goal = planService.addGoal(
    h,
    cycle.id,
    { title: "Ship", why: "Momentum", lagMetricName: "Result", lagUnit: "units", lagStart: 0, lagTarget: 10 },
    TODAY,
  );
  const tactic = planService.addTactic(
    h,
    goal.id,
    { text: "Practice three times", duePattern: { type: "EVERY_WEEK", timesPerWeek: 3 } },
    TODAY,
  );
  const plan = weekPlanService.generateWeekPlan(h, cycle.id, 1, TODAY);
  const scoredItem = executionRepo.listWeekPlanItems(h, plan.id).find((item) => item.tacticId === tactic.id)!;
  const extraItem = weekPlanService.addPlanRevisionItem(h, plan.id, {
    label: "Prepare equipment",
    dayOfWeek: 1,
    confirmPlanRevision: true,
  });
  return { cycle, goal, tactic, plan, scoredItem, extraItem };
}

function expectRuleError(action: () => unknown, status: number, message?: string) {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(RuleError);
    expect((error as RuleError).status).toBe(status);
    if (message !== undefined) expect((error as RuleError).message).toBe(message);
    return;
  }
  throw new Error(`Expected a ${status} RuleError`);
}

function executionSnapshot(cycleId: number, planId: number) {
  return {
    plan: executionRepo.getWeekPlan(h, planId),
    items: executionRepo.listWeekPlanItems(h, planId),
    completions: executionRepo.listCycleCompletions(h, cycleId),
    lagLogs: executionRepo.listLagLogs(h, cycleId),
  };
}

describe("extra week-plan item completion", () => {
  it("rejects deleting a completed tactic occurrence without changing completion history", () => {
    const { cycle, tactic, plan, scoredItem } = setupPlan();
    scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 1 }, TODAY);
    const before = executionSnapshot(cycle.id, plan.id);

    expectRuleError(() => weekPlanService.removeItem(h, plan.id, scoredItem.id), 409);

    expect(executionSnapshot(cycle.id, plan.id)).toEqual(before);
  });

  it.each([-1, 0.5, 2])("rejects done=%s outside the extra item's integer range without writes", (done) => {
    const { cycle, plan, extraItem } = setupPlan();
    const before = executionSnapshot(cycle.id, plan.id);

    expectRuleError(() => weekPlanService.setExtraItemDone(h, plan.id, extraItem.id, done), 422);

    expect(executionSnapshot(cycle.id, plan.id)).toEqual(before);
  });

  it("rejects scored items, items from another plan, and closed plans without writes", () => {
    const { cycle, plan, scoredItem, extraItem } = setupPlan();

    let before = executionSnapshot(cycle.id, plan.id);
    expectRuleError(() => weekPlanService.setExtraItemDone(h, plan.id, scoredItem.id, 1), 422);
    expect(executionSnapshot(cycle.id, plan.id)).toEqual(before);

    const secondPlan = weekPlanService.generateWeekPlan(h, cycle.id, 2, TODAY);
    before = executionSnapshot(cycle.id, plan.id);
    expectRuleError(() => weekPlanService.setExtraItemDone(h, secondPlan.id, extraItem.id, 1), 404);
    expect(executionSnapshot(cycle.id, plan.id)).toEqual(before);

    weekPlanService.closeWeek(h, plan.id, {}, TODAY);
    before = executionSnapshot(cycle.id, plan.id);
    expectRuleError(() => weekPlanService.setExtraItemDone(h, plan.id, extraItem.id, 1), 409);
    expect(executionSnapshot(cycle.id, plan.id)).toEqual(before);
  });
});

describe("archived week-plan mutation policy", () => {
  it("rejects generate, move, add, remove, close, and extra completion with no execution writes", () => {
    const { cycle, goal, tactic, plan, scoredItem, extraItem } = setupPlan();
    scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 1 }, TODAY);
    executionRepo.upsertLagLog(h, { goalId: goal.id, weekNumber: 1, value: 4, loggedAt: TODAY });
    cycleService.archiveCycle(h, cycle.id, TODAY);
    const before = executionSnapshot(cycle.id, plan.id);
    const archivedMessage = "This cycle is archived — archived cycles are immutable.";
    const actions = [
      () => weekPlanService.generateWeekPlan(h, cycle.id, 1, TODAY),
      () => weekPlanService.moveItem(h, plan.id, scoredItem.id, { dayOfWeek: 4, label: "Changed" }),
      () => weekPlanService.addPlanRevisionItem(h, plan.id, { label: "Changed", dayOfWeek: 2, confirmPlanRevision: true }),
      () => weekPlanService.removeItem(h, plan.id, extraItem.id),
      () => weekPlanService.closeWeek(h, plan.id, { reflection: "Changed", lagValues: [{ goalId: goal.id, value: 99 }] }, TODAY),
      () => weekPlanService.setExtraItemDone(h, plan.id, extraItem.id, 1),
    ];

    for (const action of actions) {
      expectRuleError(action, 409, archivedMessage);
      expect(executionSnapshot(cycle.id, plan.id)).toEqual(before);
    }

    expect(cyclesRepo.getCycle(h, cycle.id)?.status).toBe("archived");
  });
});
