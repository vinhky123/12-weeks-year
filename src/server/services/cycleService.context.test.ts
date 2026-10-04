import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ACTIVE_CYCLE_INFO_DTO } from "../../lib/contracts";
import { createDb, type DbHandles } from "../db";
import { RuleError } from "../ruleError";
import * as cycleService from "./cycleService";

const START = "2026-01-05";
let h: DbHandles;
let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "twy-cycle-context-"));
  h = createDb(path.join(tmpDir, "app.db"));
});

afterEach(() => {
  h.sqlite.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("selected-cycle context", () => {
  it("returns the active-cycle info shape for planning, active, and archived cycles", () => {
    const planning = cycleService.createCycle(h, { name: "Planning", startDate: START }, "2026-01-01");
    const planningInfo = cycleService.getCycleInfo(h, planning.id, "2026-01-04");
    expect(planningInfo).toMatchObject({
      cycle: { id: planning.id, status: "planning" },
      weekNumber: 0,
      weekLabel: null,
      daysRemaining: 0,
      phase: "pre",
    });

    cycleService.startCycle(h, planning.id);
    const activeInfo = cycleService.getCycleInfo(h, planning.id, "2026-01-14");
    expect(activeInfo).toMatchObject({
      cycle: { id: planning.id, status: "active" },
      weekNumber: 2,
      weekLabel: "Week 2 · Day 3",
      daysRemaining: 75,
      phase: "execution",
    });

    cycleService.archiveCycle(h, planning.id, "2026-03-30");
    const archivedInfo = cycleService.getCycleInfo(h, planning.id, "2026-03-30");
    expect(archivedInfo).toMatchObject({
      cycle: { id: planning.id, status: "archived" },
      weekNumber: 13,
      weekLabel: null,
      daysRemaining: 0,
      phase: "review",
    });

    expect(() => ACTIVE_CYCLE_INFO_DTO.parse(planningInfo)).not.toThrow();
    expect(() => ACTIVE_CYCLE_INFO_DTO.parse(activeInfo)).not.toThrow();
    expect(() => ACTIVE_CYCLE_INFO_DTO.parse(archivedInfo)).not.toThrow();
  });

  it("throws the existing 404 rule error for a missing selected cycle", () => {
    expect.assertions(2);
    try {
      cycleService.getCycleInfo(h, 999, START);
    } catch (error) {
      expect(error).toBeInstanceOf(RuleError);
      expect((error as RuleError).status).toBe(404);
    }
  });

  it("keeps active-cycle lookup nullable and returns the same derived context", () => {
    expect(cycleService.getActiveCycleInfo(h, START)).toBeNull();
    const cycle = cycleService.createCycle(h, { name: "Active", startDate: START }, START);
    cycleService.startCycle(h, cycle.id);
    expect(cycleService.getActiveCycleInfo(h, "2026-01-14")).toEqual(
      cycleService.getCycleInfo(h, cycle.id, "2026-01-14"),
    );
  });
});
