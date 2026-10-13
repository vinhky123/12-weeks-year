import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createDb, type DbHandles } from "../db";
import { completions, cycles, weekPlanItems, weekPlans } from "../db/schema";
import * as executionRepo from "../db/repositories/execution";
import * as cycleService from "./cycleService";
import * as planService from "./planService";
import * as scoringService from "./scoringService";
import * as weekPlanService from "./weekPlanService";
import { normalizeDraftPlanOccurrences } from "./occurrenceMigration";

const WEEK_1 = "2026-10-05";

let tmpDir: string;
let h: DbHandles;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "twy-occurrence-migration-"));
  h = createDb(path.join(tmpDir, "app.db"));
});

afterEach(() => {
  h.sqlite.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function createPlan(status: "draft" | "closed", weekNumber: number) {
  const cycle = h.db.insert(cycles).values({ name: `Cycle ${weekNumber}`, startDate: "2026-10-05", status: "active", createdAt: "2026-10-01" }).returning().get()!;
  return h.db.insert(weekPlans).values({ cycleId: cycle.id, weekNumber, status, createdAt: "2026-10-01" }).returning().get()!;
}

function createItem(weekPlanId: number, values: Partial<typeof weekPlanItems.$inferInsert> = {}) {
  return h.db.insert(weekPlanItems).values({
    weekPlanId,
    tacticId: 9,
    label: "Read",
    dayOfWeek: 3,
    done: 0,
    plannedCount: 1,
    sortOrder: 0,
    ...values,
  }).returning().get()!;
}

describe("draft plan occurrence normalization", () => {
  it("splits bundled counts while preserving row identity, placement, label and completed count", () => {
    const plan = createPlan("draft", 1);
    const source = createItem(plan.id, { label: "Custom reading", dayOfWeek: 4, done: 2, plannedCount: 3, sortOrder: 7 });
    const manualA = createItem(plan.id, { tacticId: null, label: "Manual A", sortOrder: 8 });
    const manualB = createItem(plan.id, { tacticId: null, label: "Manual B", sortOrder: 9 });

    const result = normalizeDraftPlanOccurrences(h);
    const items = executionRepo.listWeekPlanItems(h, plan.id).filter((item) => item.tacticId === 9);

    expect(result).toEqual({ plansChanged: 1, itemsAdded: 2 });
    expect(items).toHaveLength(3);
    expect(items.map(({ id, done, plannedCount, dayOfWeek, label }) => ({ id, done, plannedCount, dayOfWeek, label }))).toEqual([
      { id: source.id, done: 1, plannedCount: 1, dayOfWeek: 4, label: "Custom reading" },
      { id: expect.any(Number), done: 1, plannedCount: 1, dayOfWeek: 4, label: "Custom reading" },
      { id: expect.any(Number), done: 0, plannedCount: 1, dayOfWeek: 4, label: "Custom reading" },
    ]);
    const orderedIds = executionRepo.listWeekPlanItems(h, plan.id).map((item) => item.id);
    expect(orderedIds[0]).toBe(source.id);
    expect(orderedIds.indexOf(manualA.id)).toBeLessThan(orderedIds.indexOf(manualB.id));
    expect(orderedIds.indexOf(manualA.id)).toBeGreaterThan(orderedIds.indexOf(items[2]!.id));
    const normalizedItems = executionRepo.listWeekPlanItems(h, plan.id);
    expect(normalizeDraftPlanOccurrences(h)).toEqual({ plansChanged: 0, itemsAdded: 0 });
    expect(executionRepo.listWeekPlanItems(h, plan.id)).toEqual(normalizedItems);
  });

  it("leaves manual items and closed-plan rows unchanged", () => {
    const draft = createPlan("draft", 1);
    const closed = createPlan("closed", 2);
    const manual = createItem(draft.id, { tacticId: null, label: "Manual", plannedCount: 4, done: 2 });
    const historical = createItem(closed.id, { plannedCount: 3, done: 2 });

    normalizeDraftPlanOccurrences(h);

    expect(h.db.select().from(weekPlanItems).where(eq(weekPlanItems.id, manual.id)).get()).toMatchObject({ plannedCount: 4, done: 2 });
    expect(h.db.select().from(weekPlanItems).where(eq(weekPlanItems.id, historical.id)).get()).toMatchObject({ plannedCount: 3, done: 2 });
  });

  it("is idempotent and rejects invalid bundled counts without partial writes to that plan", () => {
    const plan = createPlan("draft", 1);
    const valid = createItem(plan.id, { plannedCount: 2 });
    createItem(plan.id, { tacticId: 10, plannedCount: 2, done: 3, sortOrder: 1 });

    expect(() => normalizeDraftPlanOccurrences(h)).toThrow(/invalid.*count/i);
    expect(h.db.select().from(weekPlanItems).where(eq(weekPlanItems.id, valid.id)).get()).toMatchObject({ plannedCount: 2 });
  });

  it("rejects aggregate overflow unsupported by tactic-week history and rolls back earlier splits", () => {
    const cycle = cycleService.createCycle(h, { name: "Aggregate overflow", startDate: WEEK_1 }, WEEK_1);
    cycleService.startCycle(h, cycle.id);
    const goal = planService.addGoal(h, cycle.id, {
      title: "Ship", why: "Momentum", lagMetricName: "Result", lagUnit: "units", lagStart: 0, lagTarget: 10,
    }, WEEK_1);
    const first = planService.addTactic(h, goal.id, {
      text: "Practice first", duePattern: { type: "EVERY_WEEK", timesPerWeek: 2 },
    }, WEEK_1);
    const second = planService.addTactic(h, goal.id, {
      text: "Practice second", duePattern: { type: "EVERY_WEEK", timesPerWeek: 2 },
    }, WEEK_1);
    const plan = weekPlanService.generateWeekPlan(h, cycle.id, 1, WEEK_1);
    const firstRows = executionRepo.listWeekPlanItems(h, plan.id).filter((item) => item.tacticId === first.id);
    const secondRows = executionRepo.listWeekPlanItems(h, plan.id).filter((item) => item.tacticId === second.id);
    executionRepo.deleteWeekPlanItem(h, firstRows[1]!.id);
    executionRepo.updateWeekPlanItem(h, firstRows[0]!.id, { plannedCount: 2, done: 1 });
    for (const item of secondRows) {
      scoringService.logCompletion(h, { tacticId: second.id, weekNumber: 1, weekPlanItemId: item.id }, WEEK_1);
      executionRepo.updateWeekPlanItem(h, item.id, { done: 2 });
    }
    const before = executionRepo.listWeekPlanItems(h, plan.id);

    expect(() => normalizeDraftPlanOccurrences(h)).toThrow(/invalid.*count/i);

    expect(executionRepo.listWeekPlanItems(h, plan.id)).toEqual(before);
    expect(executionRepo.getWeekPlanItem(h, firstRows[0]!.id)).toMatchObject({ plannedCount: 2, done: 1 });
  });

  it("restores unlinked legacy work for already-split rows and keeps it explicitly undoable", () => {
    const cycle = cycleService.createCycle(h, { name: "Legacy", startDate: WEEK_1 }, WEEK_1);
    cycleService.startCycle(h, cycle.id);
    const goal = planService.addGoal(h, cycle.id, {
      title: "Ship", why: "Momentum", lagMetricName: "Result", lagUnit: "units", lagStart: 0, lagTarget: 10,
    }, WEEK_1);
    const tactic = planService.addTactic(h, goal.id, {
      text: "Practice", duePattern: { type: "EVERY_WEEK", timesPerWeek: 3 },
    }, WEEK_1);

    scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 1 }, WEEK_1);
    scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 1 }, WEEK_1);
    const plan = weekPlanService.generateWeekPlan(h, cycle.id, 1, WEEK_1);
    const originals = executionRepo.listWeekPlanItems(h, plan.id);
    originals.forEach((item) => executionRepo.updateWeekPlanItem(h, item.id, { done: 0 }));

    normalizeDraftPlanOccurrences(h);

    const restored = executionRepo.listWeekPlanItems(h, plan.id).filter((item) => item.tacticId === tactic.id);
    expect(restored.map((item) => [item.done, item.plannedCount])).toEqual([[1, 1], [1, 1], [0, 1]]);
    expect(executionRepo.listCompletionsForTacticWeek(h, tactic.id, 1).map((row) => row.weekPlanItemId)).toEqual([null, null]);

    scoringService.unlogCompletion(h, {
      tacticId: tactic.id, weekNumber: 1, weekPlanItemId: restored[0]!.id,
    }, WEEK_1);
    expect(executionRepo.listWeekPlanItems(h, plan.id).filter((item) => item.tacticId === tactic.id).map((item) => item.done)).toEqual([0, 1, 0]);
    expect(executionRepo.listCompletionsForTacticWeek(h, tactic.id, 1)).toHaveLength(1);
  });

  it("recreates a missing draft source from unlinked history and the tactic due count", () => {
    const cycle = cycleService.createCycle(h, { name: "Missing source", startDate: WEEK_1 }, WEEK_1);
    cycleService.startCycle(h, cycle.id);
    const goal = planService.addGoal(h, cycle.id, {
      title: "Ship", why: "Momentum", lagMetricName: "Result", lagUnit: "units", lagStart: 0, lagTarget: 10,
    }, WEEK_1);
    const tactic = planService.addTactic(h, goal.id, {
      text: "Practice", duePattern: { type: "EVERY_WEEK", timesPerWeek: 3 },
    }, WEEK_1);
    scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 1 }, WEEK_1);
    scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 1 }, WEEK_1);
    const plan = weekPlanService.generateWeekPlan(h, cycle.id, 1, WEEK_1);
    executionRepo.listWeekPlanItems(h, plan.id).forEach((item) => executionRepo.deleteWeekPlanItem(h, item.id));

    normalizeDraftPlanOccurrences(h);

    expect(executionRepo.listWeekPlanItems(h, plan.id).map((item) => [item.done, item.plannedCount])).toEqual([
      [1, 1], [1, 1], [0, 1],
    ]);
    expect(executionRepo.listCompletionsForTacticWeek(h, tactic.id, 1).every((row) => row.weekPlanItemId === null)).toBe(true);
  });

  it("opens a legitimate old bundled overflow when completion history backs done beyond plannedCount", () => {
    const cycle = cycleService.createCycle(h, { name: "Legacy overflow", startDate: WEEK_1 }, WEEK_1);
    cycleService.startCycle(h, cycle.id);
    const goal = planService.addGoal(h, cycle.id, {
      title: "Ship", why: "Momentum", lagMetricName: "Result", lagUnit: "units", lagStart: 0, lagTarget: 10,
    }, WEEK_1);
    const tactic = planService.addTactic(h, goal.id, {
      text: "Practice", duePattern: { type: "EVERY_WEEK", timesPerWeek: 4 },
    }, WEEK_1);
    const plan = weekPlanService.generateWeekPlan(h, cycle.id, 1, WEEK_1);
    const items = executionRepo.listWeekPlanItems(h, plan.id);
    for (const item of items) scoringService.logCompletion(h, {
      tacticId: tactic.id, weekNumber: 1, weekPlanItemId: item.id,
    }, WEEK_1);
    h.db.update(completions).set({ weekPlanItemId: null }).run();
    for (const item of items.slice(1)) executionRepo.deleteWeekPlanItem(h, item.id);
    executionRepo.updateWeekPlanItem(h, items[0]!.id, { plannedCount: 3, done: 4 });

    h.sqlite.close();
    h = createDb(path.join(tmpDir, "app.db"));

    const reopened = executionRepo.listWeekPlanItems(h, plan.id);
    expect(reopened.map((item) => [item.done, item.plannedCount])).toEqual([[1, 1], [1, 1], [1, 1], [1, 1]]);
    expect(executionRepo.listCompletionsForTacticWeek(h, tactic.id, 1).map((row) => [row.weekPlanItemId, row.date])).toEqual([
      [null, WEEK_1], [null, WEEK_1], [null, WEEK_1], [null, WEEK_1],
    ]);
  });

  it("keeps mixed linked and unlinked completion history unchanged while restoring stale done flags", () => {
    const cycle = cycleService.createCycle(h, { name: "Mixed history", startDate: WEEK_1 }, WEEK_1);
    cycleService.startCycle(h, cycle.id);
    const goal = planService.addGoal(h, cycle.id, {
      title: "Ship", why: "Momentum", lagMetricName: "Result", lagUnit: "units", lagStart: 0, lagTarget: 10,
    }, WEEK_1);
    const tactic = planService.addTactic(h, goal.id, {
      text: "Practice", duePattern: { type: "EVERY_WEEK", timesPerWeek: 3 },
    }, WEEK_1);
    scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 1 }, WEEK_1);
    scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 1 }, WEEK_1);
    const plan = weekPlanService.generateWeekPlan(h, cycle.id, 1, WEEK_1);
    const linkedTarget = executionRepo.listWeekPlanItems(h, plan.id).at(-1)!;
    scoringService.logCompletion(h, {
      tacticId: tactic.id, weekNumber: 1, weekPlanItemId: linkedTarget.id,
    }, WEEK_1);
    executionRepo.listWeekPlanItems(h, plan.id).forEach((item) => executionRepo.updateWeekPlanItem(h, item.id, { done: 0 }));
    const before = executionRepo.listCompletionsForTacticWeek(h, tactic.id, 1).map((row) => [row.id, row.date, row.weekPlanItemId]);

    normalizeDraftPlanOccurrences(h);

    expect(executionRepo.listWeekPlanItems(h, plan.id).filter((item) => item.tacticId === tactic.id).map((item) => item.done)).toEqual([1, 1, 1]);
    expect(executionRepo.listCompletionsForTacticWeek(h, tactic.id, 1).map((row) => [row.id, row.date, row.weekPlanItemId])).toEqual(before);
    expect(executionRepo.listCompletionsForTacticWeek(h, tactic.id, 1).filter((row) => row.weekPlanItemId === linkedTarget.id)).toHaveLength(1);
    expect(normalizeDraftPlanOccurrences(h)).toEqual({ plansChanged: 0, itemsAdded: 0 });
  });
});
