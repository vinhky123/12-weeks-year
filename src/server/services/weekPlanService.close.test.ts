import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb, type DbHandles } from "../db/index";
import * as executionRepo from "../db/repositories/execution";
import * as cycleService from "./cycleService";
import * as planService from "./planService";
import * as weekPlanService from "./weekPlanService";

const TODAY = "2026-10-05";
let tmpDir: string;
let h: DbHandles;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "twy-close-week-"));
  h = createDb(path.join(tmpDir, "app.db"));
});

afterEach(() => {
  h.sqlite.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function addGoal(cycleId: number, title: string) {
  return planService.addGoal(
    h,
    cycleId,
    { title, why: "Measure progress", lagMetricName: "Result", lagUnit: "units", lagStart: 0, lagTarget: 100 },
    TODAY,
  );
}

function makeDraftPlan() {
  const cycle = cycleService.createCycle(h, { name: "Current cycle", startDate: TODAY }, TODAY);
  cycleService.startCycle(h, cycle.id);
  const goal = addGoal(cycle.id, "Primary goal");
  const plan = weekPlanService.generateWeekPlan(h, cycle.id, 1, TODAY);
  return { cycle, goal, plan };
}

function storedPlan(planId: number) {
  return executionRepo.getWeekPlan(h, planId)!;
}

function storedLagValues(cycleId: number) {
  return executionRepo
    .listLagLogs(h, cycleId)
    .map(({ goalId, weekNumber, value, loggedAt }) => ({ goalId, weekNumber, value, loggedAt }))
    .sort((a, b) => a.goalId - b.goalId);
}

describe("closeWeek atomic persistence", () => {
  it("rejects a later non-finite value before changing the plan or existing lag rows", () => {
    const { cycle, goal, plan } = makeDraftPlan();
    const secondGoal = addGoal(cycle.id, "Second goal");
    executionRepo.upsertLagLog(h, { goalId: goal.id, weekNumber: 1, value: 12, loggedAt: "2026-10-04" });
    const before = storedLagValues(cycle.id);

    expect(() =>
      weekPlanService.closeWeek(
        h,
        plan.id,
        {
          reflection: "must not persist",
          lagValues: [
            { goalId: goal.id, value: 25 },
            { goalId: secondGoal.id, value: Number.NaN },
          ],
        },
        TODAY,
      ),
    ).toThrowError(/Lag values must be numbers/);

    expect(storedPlan(plan.id)).toMatchObject({ status: "draft", closedAt: null, reflection: null });
    expect(storedLagValues(cycle.id)).toEqual(before);
  });

  it("rejects a goal from another cycle before saving any close changes", () => {
    const { cycle, goal, plan } = makeDraftPlan();
    const otherCycle = cycleService.createCycle(h, { name: "Other cycle", startDate: TODAY }, TODAY);
    const otherGoal = addGoal(otherCycle.id, "Other-cycle goal");

    expect(() =>
      weekPlanService.closeWeek(
        h,
        plan.id,
        { reflection: "must not persist", lagValues: [{ goalId: goal.id, value: 10 }, { goalId: otherGoal.id, value: 20 }] },
        TODAY,
      ),
    ).toThrow();

    expect(storedPlan(plan.id)).toMatchObject({ status: "draft", closedAt: null, reflection: null });
    expect(storedLagValues(cycle.id)).toEqual([]);
    expect(storedLagValues(otherCycle.id)).toEqual([]);
  });

  it("rejects a nonexistent goal before saving any close changes", () => {
    const { cycle, goal, plan } = makeDraftPlan();

    expect(() =>
      weekPlanService.closeWeek(
        h,
        plan.id,
        { reflection: "must not persist", lagValues: [{ goalId: goal.id, value: 10 }, { goalId: 999_999, value: 20 }] },
        TODAY,
      ),
    ).toThrow();

    expect(storedPlan(plan.id)).toMatchObject({ status: "draft", closedAt: null, reflection: null });
    expect(storedLagValues(cycle.id)).toEqual([]);
  });

  it("rolls back the close and first lag write when SQLite aborts the second insert", () => {
    const { cycle, goal, plan } = makeDraftPlan();
    const secondGoal = addGoal(cycle.id, "Second goal");
    h.sqlite.exec(`
      CREATE TRIGGER abort_second_lag
      BEFORE INSERT ON lag_logs
      WHEN NEW.goal_id = ${secondGoal.id}
      BEGIN
        SELECT RAISE(ABORT, 'abort second lag');
      END;
    `);

    expect(() =>
      weekPlanService.closeWeek(
        h,
        plan.id,
        { reflection: "must roll back", lagValues: [{ goalId: goal.id, value: 10 }, { goalId: secondGoal.id, value: 20 }] },
        TODAY,
      ),
    ).toThrowError(/abort second lag/);

    expect(storedPlan(plan.id)).toMatchObject({ status: "draft", closedAt: null, reflection: null });
    expect(storedLagValues(cycle.id)).toEqual([]);
  });

  it("closes the current week with its reflection and every lag row", () => {
    const { cycle, goal, plan } = makeDraftPlan();
    const secondGoal = addGoal(cycle.id, "Second goal");

    const closed = weekPlanService.closeWeek(
      h,
      plan.id,
      { reflection: "  Finished well  ", lagValues: [{ goalId: goal.id, value: 15 }, { goalId: secondGoal.id, value: 30 }] },
      TODAY,
    );

    expect(closed).toMatchObject({ id: plan.id, status: "closed", closedAt: TODAY, reflection: "Finished well" });
    expect(storedLagValues(cycle.id)).toEqual([
      { goalId: goal.id, weekNumber: 1, value: 15, loggedAt: TODAY },
      { goalId: secondGoal.id, weekNumber: 1, value: 30, loggedAt: TODAY },
    ]);
    expect(fs.readdirSync(path.join(tmpDir, "backups"))).toHaveLength(1);
  });
});
