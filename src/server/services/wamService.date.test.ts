import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDb, type DbHandles } from "../db/index";
import * as cycleService from "./cycleService";
import * as wamService from "./wamService";

let h: DbHandles;
let tmpDir: string;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 5, 0, 30));
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "twy-wam-date-"));
  h = createDb(path.join(tmpDir, "wam.db"));
});

afterEach(() => {
  h.sqlite.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.useRealTimers();
});

describe("WAM report dates", () => {
  it("uses the host-local calendar date when saveWam omits today", () => {
    const cycle = cycleService.createCycle(
      h,
      { name: "Q4", startDate: "2026-10-05" },
      "2026-10-05",
    );

    wamService.saveWam(h, cycle.id, 1, {});

    const timestamps = h.sqlite
      .prepare("SELECT created_at AS createdAt, updated_at AS updatedAt FROM wam_reports WHERE cycle_id = ?")
      .get(cycle.id) as { createdAt: string; updatedAt: string };
    expect(timestamps).toEqual({ createdAt: "2026-10-05", updatedAt: "2026-10-05" });
  });
});
