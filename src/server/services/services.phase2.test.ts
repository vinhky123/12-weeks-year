import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb, type DbHandles } from "../db/index";
import * as cycleService from "./cycleService";
import * as planService from "./planService";
import * as measuresService from "./measuresService";
import * as modelWeekService from "./modelWeekService";
import * as visionService from "./visionService";

const TODAY = "2026-10-05";
let tmpPath: string;
let h: DbHandles;

beforeEach(() => {
  tmpPath = path.join(os.tmpdir(), `twy-p2-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  h = createDb(tmpPath);
});

afterEach(() => {
  h.sqlite.close();
  for (const suffix of ["", "-wal", "-shm"]) fs.rmSync(tmpPath + suffix, { force: true });
});

function setup(today = TODAY) {
  const cycle = cycleService.createCycle(h, { name: "Q4", startDate: today }, today);
  cycleService.startCycle(h, cycle.id);
  const goal = planService.addGoal(
    h,
    cycle.id,
    { title: "Lose 10 lbs", why: "Energy", lagMetricName: "Weight", lagUnit: "lbs", lagStart: 180, lagTarget: 170 },
    today,
  );
  return { cycle, goal };
}

describe("vision (F7, D7 editable mid-cycle + archive snapshot)", () => {
  it("starts null, upserts the living row, and updates in place", () => {
    expect(visionService.getVision(h)).toBeUndefined();
    const created = visionService.updateVision(h, { longTerm: "Own my time", threeYear: "Independent income" }, TODAY);
    expect(created.cycleId).toBeNull();
    const updated = visionService.updateVision(h, { threeYear: "Independent income, 20h weeks" }, TODAY);
    expect(updated.id).toBe(created.id);
    expect(updated.threeYear).toBe("Independent income, 20h weeks");
    expect(updated.longTerm).toBe("Own my time"); // untouched fields preserved
    const all = h.db.select().from(visionServiceToRows()).all();
    expect(all).toHaveLength(1); // still the single living row
  });

  it("archives a snapshot that never changes, even if the living vision is edited later", () => {
    visionService.updateVision(h, { longTerm: "v1" }, TODAY);
    const { cycle } = setup();
    cycleService.archiveCycle(h, cycle.id, TODAY);
    const snapshot = visionService.getVisionForCycle(h, cycle.id)!;
    expect(snapshot.cycleId).toBe(cycle.id);
    expect(snapshot.longTerm).toBe("v1");
    // living vision evolves mid-next-cycle
    visionService.updateVision(h, { longTerm: "v2 bigger" }, TODAY);
    expect(visionService.getVisionForCycle(h, cycle.id)!.longTerm).toBe("v1"); // frozen
    // archive again -> idempotent, no duplicate snapshot
    cycleService.archiveCycle(h, cycle.id, TODAY);
    const snapshots = h.db.select().from(visionServiceToRows()).all();
    expect(snapshots).toHaveLength(2); // living + one snapshot
  });

  it("archive without a vision is a silent no-op", () => {
    const { cycle } = setup();
    expect(() => cycleService.archiveCycle(h, cycle.id, TODAY)).not.toThrow();
  });
});

// helper: raw rows access for count assertions
import { visions as visionsTable } from "../db/schema";
function visionServiceToRows() {
  return visionsTable;
}

describe("model week (F9) — nudges, not blocks", () => {
  it("empty week yields all five warnings; book week yields none", () => {
    const empty = modelWeekService.getModelState(h);
    expect(empty.blocks).toHaveLength(0);
    expect(empty.warnings.map((w) => w.field)).toEqual(
      expect.arrayContaining(["STRATEGIC", "BREAKOUT", "BUFFER", "PLANNING", "WAM"]),
    );
    modelWeekService.addBlock(h, { type: "STRATEGIC", dayOfWeek: 2, startMinute: 540, durationMinutes: 180 }, TODAY);
    modelWeekService.addBlock(h, { type: "BUFFER", dayOfWeek: 0, startMinute: 660, durationMinutes: 45 }, TODAY);
    modelWeekService.addBlock(h, { type: "BREAKOUT", dayOfWeek: 5, startMinute: 480, durationMinutes: 240 }, TODAY);
    modelWeekService.addBlock(h, { type: "PLANNING", dayOfWeek: 0, startMinute: 510, durationMinutes: 20 }, TODAY);
    modelWeekService.addBlock(h, { type: "WAM", dayOfWeek: 0, startMinute: 1050, durationMinutes: 30 }, TODAY);
    expect(modelWeekService.getModelState(h).warnings).toEqual([]);
  });

  it("rejects invalid blocks (type, day, minutes, duration)", () => {
    expect(() => modelWeekService.addBlock(h, { type: "NOPE" as never, dayOfWeek: 0, startMinute: 0, durationMinutes: 60 }, TODAY)).toThrow();
    expect(() => modelWeekService.addBlock(h, { type: "BUFFER", dayOfWeek: 7, startMinute: 0, durationMinutes: 60 }, TODAY)).toThrow();
    expect(() => modelWeekService.addBlock(h, { type: "BUFFER", dayOfWeek: 0, startMinute: 1500, durationMinutes: 60 }, TODAY)).toThrow();
    expect(() => modelWeekService.addBlock(h, { type: "BUFFER", dayOfWeek: 0, startMinute: 0, durationMinutes: 10 }, TODAY)).toThrow();
  });

  it("updates and removes blocks", () => {
    const b = modelWeekService.addBlock(h, { type: "WAM", dayOfWeek: 0, startMinute: 1050, durationMinutes: 30 }, TODAY);
    const moved = modelWeekService.updateBlock(h, b.id, { dayOfWeek: 2, label: "WAM with peer" });
    expect(moved.dayOfWeek).toBe(2);
    expect(moved.label).toBe("WAM with peer");
    modelWeekService.removeBlock(h, b.id);
    expect(modelWeekService.listBlocks(h)).toHaveLength(0);
    expect(() => modelWeekService.removeBlock(h, b.id)).toThrow(/not found/i);
  });
});

describe("measures (F8) — lead measures, logs, diagnosis", () => {
  it("lead measure CRUD + weekly log upsert", () => {
    const { goal } = setup();
    const m = measuresService.addLeadMeasure(h, goal.id, { name: "Workouts completed", weeklyTarget: 3 }, TODAY);
    expect(m.weeklyTarget).toBe(3);
    measuresService.logLead(h, { leadMeasureId: m.id, weekNumber: 1, value: 3 }, TODAY);
    const updated = measuresService.logLead(h, { leadMeasureId: m.id, weekNumber: 1, value: 2 }, TODAY);
    expect(updated.value).toBe(2); // upsert, not duplicate
    const rows = h.db.select().from(measuresServiceTables().leadLogs).all();
    expect(rows).toHaveLength(1);
    measuresService.updateLeadMeasure(h, m.id, { weeklyTarget: 4 });
    measuresService.removeLeadMeasure(h, m.id);
    expect(() => measuresService.getLeadMeasure(h, m.id)).toThrow(/not found/i);
  });

  it("overview computes lag progress and the book's diagnosis", () => {
    const { cycle, goal } = setup();
    const m = measuresService.addLeadMeasure(h, goal.id, { name: "Workouts completed", weeklyTarget: 3 }, TODAY);
    measuresService.logLead(h, { leadMeasureId: m.id, weekNumber: 1, value: 3 }, TODAY);
    execution_repo_upsertLag(h, goal.id, 1, 179.5);
    const overview = measuresService.getMeasuresOverview(h, cycle.id, TODAY);
    expect(overview.goals).toHaveLength(1);
    const g = overview.goals[0]!;
    expect(g.latestLag).toBe(179.5);
    expect(g.lagProgress).toBeCloseTo(0.05);
    expect(g.leadMeasures[0]!.series).toEqual([{ week: 1, value: 3 }]);
    // week 1 has no score yet (nothing closed) -> diagnosis falls back to average -> null
    expect(g.diagnosis).toBeNull();
  });

  it("rejects bad lead inputs", () => {
    const { goal } = setup();
    expect(() => measuresService.addLeadMeasure(h, goal.id, { name: "  ", weeklyTarget: 1 }, TODAY)).toThrow(/name is required/);
    const m = measuresService.addLeadMeasure(h, goal.id, { name: "Calls", weeklyTarget: 10 }, TODAY);
    expect(() => measuresService.logLead(h, { leadMeasureId: m.id, weekNumber: 13, value: 1 }, TODAY)).toThrow(/1-12/);
    expect(() => measuresService.logLead(h, { leadMeasureId: m.id, weekNumber: 1, value: -1 }, TODAY)).toThrow(/≥ 0/);
    expect(() => measuresService.addLeadMeasure(h, 99999, { name: "X", weeklyTarget: 1 }, TODAY)).toThrow(/Goal not found/);
  });
});

// helpers
import { leadLogs as leadLogsTable, leadMeasures as leadMeasuresTable } from "../db/schema";
import * as executionRepo from "../db/repositories/execution";
function measuresServiceTables() {
  return { leadLogs: leadLogsTable, leadMeasures: leadMeasuresTable };
}
function execution_repo_upsertLag(h: DbHandles, goalId: number, week: number, value: number) {
  executionRepo.upsertLagLog(h, { goalId, weekNumber: week, value, loggedAt: TODAY });
}
