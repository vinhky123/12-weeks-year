import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb, type DbHandles } from "../db";
import * as executionRepo from "../db/repositories/execution";
import * as backupService from "./backupService";
import * as cycleService from "./cycleService";
import * as planService from "./planService";
import * as scoringService from "./scoringService";
import * as weekPlanService from "./weekPlanService";

const WEEK_1 = "2026-10-05";
const WEEK_2 = "2026-10-12";
let tmpDir: string;
let source: DbHandles;
let target: DbHandles;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "twy-occurrence-backup-"));
  source = createDb(path.join(tmpDir, "source.db"));
  target = createDb(path.join(tmpDir, "target.db"));
});

afterEach(() => {
  source.sqlite.close();
  target.sqlite.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function seedSource() {
  const cycle = cycleService.createCycle(source, { name: "Legacy import", startDate: WEEK_1 }, WEEK_1);
  cycleService.startCycle(source, cycle.id);
  const goal = planService.addGoal(source, cycle.id, {
    title: "Ship", why: "Momentum", lagMetricName: "Result", lagUnit: "units", lagStart: 0, lagTarget: 10,
  }, WEEK_1);
  const tactic = planService.addTactic(source, goal.id, {
    text: "Practice", duePattern: { type: "EVERY_WEEK", timesPerWeek: 3 },
  }, WEEK_1);
  const draft = weekPlanService.generateWeekPlan(source, cycle.id, 1, WEEK_2);
  const closed = weekPlanService.generateWeekPlan(source, cycle.id, 2, WEEK_2);
  const draftItems = executionRepo.listWeekPlanItems(source, draft.id);
  const closedItems = executionRepo.listWeekPlanItems(source, closed.id);
  scoringService.logCompletion(source, {
    tacticId: tactic.id, weekNumber: 1, date: WEEK_1, weekPlanItemId: draftItems[0]!.id,
  }, WEEK_2);
  scoringService.logCompletion(source, {
    tacticId: tactic.id, weekNumber: 1, date: "2026-10-06", weekPlanItemId: draftItems[1]!.id,
  }, WEEK_2);
  scoringService.logCompletion(source, { tacticId: tactic.id, weekNumber: 2, weekPlanItemId: closedItems[0]!.id }, WEEK_2);
  weekPlanService.closeWeek(source, closed.id, {}, WEEK_2);
  return { cycle, tactic, draft, closed, draftItems, closedItems };
}

function legacyBundledBackup(envelope: backupService.BackupEnvelope, details: ReturnType<typeof seedSource>) {
  const draftIds = new Set(details.draftItems.slice(1).map((item) => item.id));
  const closedIds = new Set(details.closedItems.slice(1).map((item) => item.id));
  const completionRows = envelope.data.completions.map(({ weekPlanItemId: _link, ...row }) => row);
  const items = envelope.data.week_plan_items
    .filter((item) => !draftIds.has(item.id as number) && !closedIds.has(item.id as number))
    .map((item) => {
      if (item.id === details.draftItems[0]!.id) return { ...item, done: 2, plannedCount: 3 };
      if (item.id === details.closedItems[0]!.id) return { ...item, done: 1, plannedCount: 3 };
      return item;
    });
  return { ...envelope, data: { ...envelope.data, completions: completionRows, week_plan_items: items } };
}

describe("occurrence backup compatibility", () => {
  it("imports a v1 backup without occurrence links and normalizes draft rows, leaving closed rows and scores unchanged", () => {
    const details = seedSource();
    const original = backupService.exportAll(source);
    const legacy = legacyBundledBackup(original, details);
    expect(legacy.version).toBe(1);
    expect(legacy.data.completions.every((row) => !("weekPlanItemId" in row))).toBe(true);

    backupService.importAll(target, legacy, { confirm: true });

    const draftItems = executionRepo.listWeekPlanItems(target, details.draft.id);
    const closedItems = executionRepo.listWeekPlanItems(target, details.closed.id);
    expect(draftItems.map((item) => [item.id === details.draftItems[0]!.id, item.done, item.plannedCount])).toEqual([
      [true, 1, 1], [false, 1, 1], [false, 0, 1],
    ]);
    expect(closedItems).toEqual([expect.objectContaining({ ...details.closedItems[0], done: 1, plannedCount: 3 })]);
    expect(executionRepo.listCompletionsForTacticWeek(target, details.tactic.id, 1).every((row) => row.weekPlanItemId === null)).toBe(true);
    expect(weekPlanService.weekScoreFor(target, details.cycle.id, 1, WEEK_2)).toMatchObject({ due: 3, completed: 2, scorePct: 67 });
    expect(weekPlanService.weekScoreFor(target, details.cycle.id, 2, WEEK_2)).toMatchObject({ due: 3, completed: 1, scorePct: 33, closed: true });
    expect(backupService.exportAll(target).data.completions.every((row) => "weekPlanItemId" in row)).toBe(true);
  });

  it("imports a v1 old-app overflow when four completion records support done=4 on a plannedCount=3 row", () => {
    const details = seedSource();
    const current = backupService.exportAll(source);
    const legacy: backupService.BackupEnvelope = legacyBundledBackup(current, details);
    const sourceCompletions = legacy.data.completions.filter((row) =>
      row.tacticId === details.tactic.id && row.cycleWeek === 1,
    );
    const nextId = Math.max(...legacy.data.completions.map((row) => Number(row.id))) + 1;

    legacy.data.tactics = legacy.data.tactics.map((row) => row.id === details.tactic.id
      ? { ...row, duePattern: JSON.stringify({ type: "EVERY_WEEK", timesPerWeek: 4 }) }
      : row);
    legacy.data.week_plan_items = legacy.data.week_plan_items.map((row) => row.id === details.draftItems[0]!.id
      ? { ...row, done: 4, plannedCount: 3 }
      : row);
    legacy.data.completions.push(
      { ...sourceCompletions[0]!, id: nextId, date: WEEK_1, weekPlanItemId: undefined },
      { ...sourceCompletions[1]!, id: nextId + 1, date: "2026-10-07", weekPlanItemId: undefined },
    );

    backupService.importAll(target, legacy, { confirm: true });

    const imported = executionRepo.listWeekPlanItems(target, details.draft.id);
    expect(imported.map((item) => [item.done, item.plannedCount])).toEqual([
      [1, 1], [1, 1], [1, 1], [1, 1],
    ]);
    const importedCompletions = executionRepo.listCompletionsForTacticWeek(target, details.tactic.id, 1);
    expect(importedCompletions.every((row) => row.weekPlanItemId === null)).toBe(true);
    expect(importedCompletions.map((row) => row.date).sort()).toEqual([
      WEEK_1, WEEK_1, "2026-10-06", "2026-10-07",
    ]);
  });

  it("restores already-split stale done counts from a v1 import and lets an occurrence undo one unlinked record", () => {
    const details = seedSource();
    const legacy = backupService.exportAll(source);
    legacy.data.completions = legacy.data.completions.map(({ weekPlanItemId: _link, ...row }) => row);
    legacy.data.week_plan_items = legacy.data.week_plan_items.map((row) => details.draftItems.some((item) => item.id === row.id)
      ? { ...row, done: 0, plannedCount: 1 }
      : row);

    backupService.importAll(target, legacy, { confirm: true });

    const restored = executionRepo.listWeekPlanItems(target, details.draft.id)
      .filter((item) => item.tacticId === details.tactic.id);
    expect(restored.map((item) => [item.done, item.plannedCount])).toEqual([[1, 1], [1, 1], [0, 1]]);
    expect(executionRepo.listCompletionsForTacticWeek(target, details.tactic.id, 1).every((row) => row.weekPlanItemId === null)).toBe(true);

    scoringService.unlogCompletion(target, {
      tacticId: details.tactic.id, weekNumber: 1, weekPlanItemId: restored[0]!.id,
    }, WEEK_1);

    expect(executionRepo.listWeekPlanItems(target, details.draft.id)
      .filter((item) => item.tacticId === details.tactic.id).map((item) => item.done)).toEqual([0, 1, 0]);
    expect(executionRepo.listCompletionsForTacticWeek(target, details.tactic.id, 1)).toHaveLength(1);
  });

  it("round-trips current-format occurrence links and plan rows without changing version 1", () => {
    seedSource();
    const original = backupService.exportAll(source);

    backupService.importAll(target, original, { confirm: true });

    expect(backupService.exportAll(target).version).toBe(1);
    expect(backupService.exportAll(target).data).toEqual(original.data);
  });

  it("keeps a user's intentionally removed incomplete rows through a current-format import", () => {
    const details = seedSource();
    const initial = executionRepo.listWeekPlanItems(source, details.draft.id)
      .filter((item) => item.tacticId === details.tactic.id);
    scoringService.unlogCompletion(source, {
      tacticId: details.tactic.id, weekNumber: 1, weekPlanItemId: initial[0]!.id,
    }, WEEK_2);
    for (const item of executionRepo.listWeekPlanItems(source, details.draft.id)
      .filter((candidate) => candidate.tacticId === details.tactic.id && candidate.done === 0)) {
      weekPlanService.removeItem(source, details.draft.id, item.id);
    }
    const expected = backupService.exportAll(source).data;

    backupService.importAll(target, backupService.exportAll(source), { confirm: true });

    expect(executionRepo.listWeekPlanItems(target, details.draft.id)
      .filter((item) => item.tacticId === details.tactic.id)).toEqual([
      expect.objectContaining({ id: initial[1]!.id, done: 1, plannedCount: 1 }),
    ]);
    expect(backupService.exportAll(target).data).toEqual(expected);
  });

  it("rolls back the whole import when draft normalization rejects malformed legacy counts", () => {
    const before = backupService.exportAll(target).data;
    const details = seedSource();
    const original = backupService.exportAll(source);
    const malformed = {
      ...legacyBundledBackup(original, details),
      data: {
        ...legacyBundledBackup(original, details).data,
        week_plan_items: legacyBundledBackup(original, details).data.week_plan_items.map((item) =>
          item.id === details.draftItems[0]!.id ? { ...item, done: 4, plannedCount: 3 } : item,
        ),
      },
    };

    expect(() => backupService.importAll(target, malformed, { confirm: true })).toThrow(/invalid occurrence count/i);
    expect(backupService.exportAll(target).data).toEqual(before);
  });
});
