import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb, type DbHandles } from "../db";
import * as backupService from "./backupService";
import * as cycleService from "./cycleService";
import * as planService from "./planService";
import * as weekPlanService from "./weekPlanService";

const TODAY = "2026-10-05";
let tmpDir: string;
let h: DbHandles;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `twy-p4-`));
  h = createDb(path.join(tmpDir, "app.db"));
});

afterEach(() => {
  h.sqlite.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function seedSomething() {
  const cycle = cycleService.createCycle(h, { name: "Q4", startDate: TODAY }, TODAY);
  cycleService.startCycle(h, cycle.id);
  const goal = planService.addGoal(
    h,
    cycle.id,
    { title: "Lose 10 lbs", why: "Energy", lagMetricName: "Weight", lagUnit: "lbs", lagStart: 180, lagTarget: 170 },
    TODAY,
  );
  planService.addTactic(h, goal.id, { text: "Train 3x", duePattern: { type: "EVERY_WEEK", timesPerWeek: 3 } }, TODAY);
  const plan = weekPlanService.generateWeekPlan(h, cycle.id, 1, TODAY);
  return { cycle, goal, plan };
}

describe("export/import round-trip (full fidelity)", () => {
  it("export → import into a second DB → identical exports, ids preserved", () => {
    seedSomething();
    const original = backupService.exportAll(h);

    const h2 = createDb(path.join(tmpDir, "other.db"));
    backupService.importAll(h2, original, { confirm: true });
    const restored = backupService.exportAll(h2);
    h2.sqlite.close();

    expect(restored.data).toEqual(original.data); // full fidelity of every table, timestamps aside
    expect(restored.data.cycles[0]!.id).toBe(original.data.cycles[0]!.id);
    expect(restored.data.tactics[0]!.text).toBe("Train 3x");
  });

  it("rejects unknown format (422), bad version (422), and missing confirm (409)", () => {
    const envelope = backupService.exportAll(h);
    expect(() => backupService.importAll(h, { ...envelope, format: "nope" }, { confirm: true })).toThrow(/format/);
    expect(() => backupService.importAll(h, { ...envelope, version: 99 }, { confirm: true })).toThrow(/version/);
    expect(() => backupService.importAll(h, envelope, { confirm: false })).toThrow(/confirm/);
  });

  it("import writes a pre-import backup of the state it replaces", () => {
    seedSomething();
    const before = backupService.exportAll(h);
    const changed = { ...before, data: { ...before.data, cycles: before.data.cycles.map((c) => ({ ...c, name: "Changed" })) } };
    backupService.importAll(h, changed, { confirm: true });
    const backups = backupService.listBackups(h);
    expect(backups.length).toBeGreaterThanOrEqual(1);
    const snapshot = JSON.parse(fs.readFileSync(path.join(backupService.backupDirFor(path.join(tmpDir, "app.db")), backups[0]!.file), "utf8"));
    expect(snapshot.data.cycles[0].name).toBe("Q4"); // the replaced state, not the new one
  });
});

describe("auto-backup on week close (rolling retention)", () => {
  it("closeWeek writes an auto-backup next to the db", () => {
    const { plan } = seedSomething();
    weekPlanService.closeWeek(h, plan.id, { reflection: "done" }, TODAY);
    const backups = backupService.listBackups(h);
    expect(backups.some((b) => b.file.includes("week-1-closed"))).toBe(true);
  });

  it("retention keeps the newest 5 auto-backups", () => {
    for (let i = 0; i < 7; i++) {
      backupService.writeAutoBackup(h, `run-${i}`);
    }
    const backups = backupService.listBackups(h);
    expect(backups).toHaveLength(5);
    expect(backups[0]!.file).toContain("run-6");
    expect(backups[4]!.file).toContain("run-2");
  });

  it("writeAutoBackup is best-effort: never throws even on an unusable target dir", () => {
    const blocker = path.join(tmpDir, "blocker");
    fs.writeFileSync(blocker, "not a directory");
    expect(() => backupService.writeAutoBackup(h, "x", blocker)).not.toThrow();
  });
});
