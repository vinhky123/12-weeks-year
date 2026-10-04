import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb, type DbHandles } from "../db/index";
import { cycles, goals, settings } from "../db/schema";
import * as executionRepo from "../db/repositories/execution";
import * as cycleService from "./cycleService";
import * as planService from "./planService";
import * as reviewService from "./reviewService";

const TODAY = "2026-10-04";
let dbPath: string;
let h: DbHandles;

beforeEach(() => {
  dbPath = path.join(os.tmpdir(), `twy-carryover-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  process.env.TWY_DB_PATH = dbPath;
  h = createDb(dbPath);
});

afterEach(() => {
  h.sqlite.close();
  delete process.env.TWY_DB_PATH;
  for (const suffix of ["", "-wal", "-shm"]) fs.rmSync(dbPath + suffix, { force: true });
});

function addGoal(
  cycleId: number,
  title: string,
  lagStart: number,
  lagTarget: number,
  status: "active" | "achieved" | "missed" | "dropped" = "active",
) {
  const goal = planService.addGoal(
    h,
    cycleId,
    { title, why: `${title} matters`, lagMetricName: `${title} measure`, lagUnit: "units", lagStart, lagTarget, deadlineWeek: 11 },
    TODAY,
  );
  if (status !== "active") h.sqlite.prepare("UPDATE goals SET status = ? WHERE id = ?").run(status, goal.id);
  return { ...goal, status };
}

function counts() {
  return {
    cycles: h.db.select().from(cycles).all().length,
    goals: h.db.select().from(goals).all().length,
    settings: h.db.select().from(settings).all(),
  };
}

describe("next-cycle carryover", () => {
  it("previews every source goal from its latest measured value and carries that same baseline without changing the source", () => {
    const source = cycleService.createCycle(h, { name: "Source", startDate: "2026-07-06" }, TODAY);
    cycleService.startCycle(h, source.id);
    const increasing = addGoal(source.id, "Grow", 0, 10, "achieved");
    const decreasing = addGoal(source.id, "Reduce", 100, 60, "dropped");
    const untouched = addGoal(source.id, "No logs", 3, 8);
    const reached = addGoal(source.id, "Reached", 1, 5);

    executionRepo.upsertLagLog(h, { goalId: increasing.id, weekNumber: 1, value: 2, loggedAt: "2026-07-12" });
    executionRepo.upsertLagLog(h, { goalId: increasing.id, weekNumber: 6, value: 5, loggedAt: "2026-08-16" });
    executionRepo.upsertLagLog(h, { goalId: decreasing.id, weekNumber: 2, value: 90, loggedAt: "2026-07-19" });
    executionRepo.upsertLagLog(h, { goalId: decreasing.id, weekNumber: 9, value: 70, loggedAt: "2026-09-06" });
    executionRepo.upsertLagLog(h, { goalId: reached.id, weekNumber: 12, value: 5, loggedAt: "2026-09-27" });

    const activePreview = reviewService.getNextCyclePreview(h, source.id);
    expect(activePreview).toEqual({
      cycleId: source.id,
      goals: [
        { goalId: increasing.id, lagStart: 5, lagTarget: 10, canCarry: true },
        { goalId: decreasing.id, lagStart: 70, lagTarget: 60, canCarry: true },
        { goalId: untouched.id, lagStart: 3, lagTarget: 8, canCarry: true },
        { goalId: reached.id, lagStart: 5, lagTarget: 5, canCarry: false },
      ],
    });

    cycleService.archiveCycle(h, source.id, TODAY);
    const sourceBefore = cycleService.getCycleDetail(h, source.id);
    expect(reviewService.getNextCyclePreview(h, source.id)).toEqual(activePreview);
    const next = reviewService.startNextCycle(
      h,
      source.id,
      { name: "Successor", startDate: "2026-10-05", carryoverGoalIds: [increasing.id, decreasing.id, untouched.id] },
      TODAY,
    );
    const carried = cycleService.getCycleDetail(h, next.id).goals;
    expect(carried.map(({ title, why, lagMetricName, lagUnit, lagStart, lagTarget, deadlineWeek, status, tactics }) => ({
      title, why, lagMetricName, lagUnit, lagStart, lagTarget, deadlineWeek, status, tactics,
    }))).toEqual([
      { title: "Grow", why: "Grow matters", lagMetricName: "Grow measure", lagUnit: "units", lagStart: 5, lagTarget: 10, deadlineWeek: 11, status: "active", tactics: [] },
      { title: "Reduce", why: "Reduce matters", lagMetricName: "Reduce measure", lagUnit: "units", lagStart: 70, lagTarget: 60, deadlineWeek: 11, status: "active", tactics: [] },
      { title: "No logs", why: "No logs matters", lagMetricName: "No logs measure", lagUnit: "units", lagStart: 3, lagTarget: 8, deadlineWeek: 11, status: "active", tactics: [] },
    ]);
    expect(next.status).toBe("planning");
    expect(cycleService.getCycleDetail(h, source.id)).toEqual(sourceBefore);
  });

  it("validates every selection and cycle field before writes, rejects reached targets, and rolls back insert failures", () => {
    const source = cycleService.createCycle(h, { name: "Archived", startDate: "2026-07-06" }, TODAY);
    const first = addGoal(source.id, "First", 0, 10);
    const fail = addGoal(source.id, "Fail insert", 0, 10);
    const reached = addGoal(source.id, "Already there", 0, 10);
    executionRepo.upsertLagLog(h, { goalId: reached.id, weekNumber: 12, value: 10, loggedAt: "2026-09-27" });
    const foreignCycle = cycleService.createCycle(h, { name: "Foreign", startDate: "2026-07-06" }, TODAY);
    const foreign = addGoal(foreignCycle.id, "Foreign goal", 0, 10);
    cycleService.archiveCycle(h, source.id, TODAY);

    const before = counts();
    const invalidInputs: Array<{ input: Parameters<typeof reviewService.startNextCycle>[2]; message: RegExp }> = [
      { input: { carryoverGoalIds: [first.id, first.id] }, message: /unique|more than once/i },
      { input: { carryoverGoalIds: [foreign.id] }, message: /belong/i },
      { input: { carryoverGoalIds: [first.id, fail.id, reached.id, foreign.id] }, message: /Max 3 goals/ },
      { input: { carryoverGoalIds: [first.id, 1.5] }, message: /integer|goal id/i },
      { input: { name: "   ", carryoverGoalIds: [first.id] }, message: /name is required/i },
      { input: { startDate: "2026-02-31", carryoverGoalIds: [first.id] }, message: /date|calendar|valid/i },
    ];
    for (const { input, message } of invalidInputs) {
      expect(() => reviewService.startNextCycle(h, source.id, input, TODAY)).toThrow(message);
      expect(counts()).toEqual(before);
    }

    expect(() => reviewService.startNextCycle(h, source.id, { carryoverGoalIds: [reached.id] }, TODAY)).toThrow(/new target|omitted/i);
    expect(counts()).toEqual(before);

    h.sqlite.exec(`
      CREATE TRIGGER fail_carryover_goal
      BEFORE INSERT ON goals
      WHEN NEW.title = 'Fail insert'
      BEGIN
        SELECT RAISE(ABORT, 'injected goal insert failure');
      END;
    `);
    expect(() => reviewService.startNextCycle(h, source.id, { carryoverGoalIds: [first.id, fail.id] }, TODAY)).toThrow(/injected goal insert failure/);
    expect(counts()).toEqual(before);
  });
});
