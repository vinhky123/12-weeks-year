import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb, type DbHandles } from "../db";
import { RuleError } from "../ruleError";
import * as backupService from "./backupService";
import * as cycleService from "./cycleService";
import * as reviewService from "./reviewService";

const TODAY = "2026-10-05";
const AREAS = ["Spiritual", "Spouse/Key Relationship", "Family", "Business", "Personal", "Physical"];
const DISCIPLINES = ["Vision", "12-Week Planning", "Weekly Routine (Score · Plan · WAM)", "Performance Time (Blocks)", "Key Measures"];

let tmpDir: string;
let source: DbHandles;
let target: DbHandles;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "twy-backup-review-status-"));
  source = createDb(path.join(tmpDir, "source.db"));
  target = createDb(path.join(tmpDir, "target.db"));
});

afterEach(() => {
  source.sqlite.close();
  target.sqlite.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function seedReview(h: DbHandles, name: string, finalize: boolean) {
  const cycle = cycleService.createCycle(h, { name, startDate: "2026-07-13" }, "2026-07-13");
  reviewService.saveReview(
    h,
    cycle.id,
    {
      qol: AREAS.map((area) => ({ area, rating: 7 })),
      disciplines: DISCIPLINES.map((name) => ({ name, rating: 8 })),
      breakthroughs: `Notes for ${name}`,
    },
    TODAY,
  );
  if (finalize) reviewService.finalizeReview(h, cycle.id, TODAY);
  return cycle;
}

/** A source database holding one finalized and one draft review. */
function seedSource() {
  const finished = seedReview(source, "Finished", true);
  const drafting = seedReview(source, "Drafting", false);
  return { finished, drafting };
}

type Row = Record<string, unknown>;

function reviewRows(envelope: backupService.BackupEnvelope): Row[] {
  return envelope.data.cycle_reviews!;
}

function withoutStatus(rows: Row[], cycleIds: number[]): Row[] {
  return rows.map((row) => {
    if (!cycleIds.includes(row.cycleId as number)) return row;
    const { status: _status, ...legacy } = row;
    return legacy;
  });
}

function withReviews(envelope: backupService.BackupEnvelope, rows: Row[]): backupService.BackupEnvelope {
  return { ...envelope, data: { ...envelope.data, cycle_reviews: rows } };
}

function dataOf(h: DbHandles) {
  return backupService.exportAll(h).data;
}

function statusByCycle(h: DbHandles): Record<string, unknown> {
  return Object.fromEntries(dataOf(h).cycle_reviews!.map((row) => [String(row.cycleId), row.status]));
}

describe("backup export and import of review status", () => {
  it("exports the status of every review", () => {
    const { finished, drafting } = seedSource();

    expect(statusByCycle(source)).toEqual({ [finished.id]: "complete", [drafting.id]: "draft" });
  });

  it("round-trips explicit draft and complete statuses with full fidelity", () => {
    const { finished, drafting } = seedSource();
    const original = backupService.exportAll(source);

    backupService.importAll(target, original, { confirm: true });

    expect(statusByCycle(target)).toEqual({ [finished.id]: "complete", [drafting.id]: "draft" });
    expect(dataOf(target)).toEqual(original.data);
  });

  it("imports a v1 backup whose reviews have no status as complete and keeps every other column", () => {
    const { finished, drafting } = seedSource();
    const original = backupService.exportAll(source);
    const legacy = withReviews(original, withoutStatus(reviewRows(original), [finished.id, drafting.id]));
    expect(reviewRows(legacy).every((row) => !("status" in row))).toBe(true);

    backupService.importAll(target, legacy, { confirm: true });

    expect(dataOf(target).cycle_reviews).toEqual(reviewRows(original).map((row) => ({ ...row, status: "complete" })));
    expect(reviewRows(legacy).every((row) => !("status" in row))).toBe(true); // the caller's payload is not modified
  });

  it("normalizes each review on its own: a missing status becomes complete while an explicit draft is kept", () => {
    const { finished, drafting } = seedSource();
    const original = backupService.exportAll(source);
    const mixed = withReviews(original, withoutStatus(reviewRows(original), [finished.id]));

    backupService.importAll(target, mixed, { confirm: true });

    expect(statusByCycle(target)).toEqual({ [finished.id]: "complete", [drafting.id]: "draft" });
  });

  it("keeps a backup version of 1 and imports a backup that has no review table at all", () => {
    const original = backupService.exportAll(source);
    const { cycle_reviews: _omitted, ...withoutReviews } = original.data;

    expect(original.version).toBe(1);
    backupService.importAll(target, { ...original, data: withoutReviews }, { confirm: true });

    expect(dataOf(target).cycle_reviews).toEqual([]);
  });

  describe("an unknown status", () => {
    it.each([
      ["an unrecognized word", "published"],
      ["the wrong case", "Complete"],
      ["an empty string", ""],
      ["null", null],
      ["a number", 1],
      ["a boolean", true],
    ])("is rejected with 422 (%s) before anything is written", (_label, status) => {
      const { finished, drafting } = seedSource();
      const original = backupService.exportAll(source);
      const rows = reviewRows(original).map((row) => (row.cycleId === drafting.id ? { ...row, status } : row));
      const bad = withReviews(original, rows);
      expect(rows.find((row) => row.cycleId === finished.id)!.status).toBe("complete");

      const existing = seedReview(target, "Existing", true);
      const before = dataOf(target);

      let error: unknown;
      try {
        backupService.importAll(target, bad, { confirm: true });
      } catch (caught) {
        error = caught;
      }

      expect(error).toBeInstanceOf(RuleError);
      expect((error as RuleError).status).toBe(422);
      expect((error as RuleError).message).toMatch(/status/i);
      expect(dataOf(target)).toEqual(before);
      expect(statusByCycle(target)).toEqual({ [existing.id]: "complete" });
      expect(backupService.listBackups(target)).toEqual([]); // not even a pre-import backup of a refused import
    });
  });
});
