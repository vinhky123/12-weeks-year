import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb, type DbHandles } from "../db/index";
import * as cycleService from "./cycleService";
import * as planService from "./planService";
import * as reviewService from "./reviewService";

let h: DbHandles;
let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "twy-review-persistence-"));
  h = createDb(path.join(tmpDir, "review.db"));
});

afterEach(() => {
  h.sqlite.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function setupCycle() {
  const cycle = cycleService.createCycle(h, { name: "Q4", startDate: "2026-10-05" }, "2026-10-01");
  const goal = planService.addGoal(
    h,
    cycle.id,
    {
      title: "Ship the product",
      why: "Serve customers",
      lagMetricName: "Milestones",
      lagUnit: "count",
      lagStart: 0,
      lagTarget: 4,
    },
    "2026-10-01",
  );
  return { cycle, goal };
}

function persistedTimestamps(cycleId: number) {
  return h.sqlite
    .prepare("SELECT created_at AS createdAt, updated_at AS updatedAt FROM cycle_reviews WHERE cycle_id = ?")
    .get(cycleId) as { createdAt: string; updatedAt: string };
}

describe("cycle review partial-save persistence", () => {
  it("preserves every previously saved section and custom result value across partial saves", () => {
    const { cycle, goal } = setupCycle();
    const customResults = [
      {
        goalId: goal.id,
        title: "Custom result title",
        percentComplete: 42,
        avgScore: 73,
        grade: 6,
        note: "Keep this exact assessment",
      },
    ];

    reviewService.saveReview(h, cycle.id, { results: customResults }, "2026-10-10");
    expect(persistedTimestamps(cycle.id)).toEqual({ createdAt: "2026-10-10", updatedAt: "2026-10-10" });

    reviewService.saveReview(
      h,
      cycle.id,
      { qol: [{ area: "Physical", rating: 8, anchor1: "Exhausted", anchor10: "Strong and rested" }] },
      "2026-10-11",
    );
    reviewService.saveReview(h, cycle.id, { disciplines: [{ name: "Vision", rating: 9 }] }, "2026-10-12");
    reviewService.saveReview(
      h,
      cycle.id,
      { breakthroughs: "Protect the first hour.", nextCycleNotes: "Keep one launch goal." },
      "2026-10-13",
    );

    expect(reviewService.getReview(h, cycle.id).review).toMatchObject({
      results: customResults,
      qol: [{ area: "Physical", rating: 8, anchor1: "Exhausted", anchor10: "Strong and rested" }],
      disciplines: [{ name: "Vision", rating: 9 }],
      breakthroughs: "Protect the first hour.",
      nextCycleNotes: "Keep one launch goal.",
      updatedAt: "2026-10-13",
    });
    expect(persistedTimestamps(cycle.id)).toEqual({ createdAt: "2026-10-10", updatedAt: "2026-10-13" });
  });

  it("uses first-save defaults while explicit empty arrays clear only their own section", () => {
    const { cycle } = setupCycle();

    const first = reviewService.saveReview(h, cycle.id, { breakthroughs: "First note" }, "2026-10-10");
    expect(first.results).toHaveLength(1);
    expect(first.qol).toEqual([]);
    expect(first.disciplines).toEqual([]);

    reviewService.saveReview(
      h,
      cycle.id,
      {
        qol: [{ area: "Physical", rating: 7 }],
        disciplines: [{ name: "Vision", rating: 8 }],
      },
      "2026-10-11",
    );
    reviewService.saveReview(h, cycle.id, { qol: [] }, "2026-10-12");
    reviewService.saveReview(h, cycle.id, { breakthroughs: "Unrelated save" }, "2026-10-13");

    let review = reviewService.getReview(h, cycle.id).review!;
    expect(review.qol).toEqual([]);
    expect(review.disciplines).toEqual([{ name: "Vision", rating: 8 }]);
    expect(review.results).toHaveLength(1);

    reviewService.saveReview(h, cycle.id, { results: [] }, "2026-10-14");
    reviewService.saveReview(h, cycle.id, { nextCycleNotes: "Still unrelated" }, "2026-10-15");

    review = reviewService.getReview(h, cycle.id).review!;
    expect(review.results).toEqual([]);
    expect(review.qol).toEqual([]);
    expect(review.disciplines).toEqual([{ name: "Vision", rating: 8 }]);
  });

  it("leaves every persisted section unchanged when a submitted rating is invalid", () => {
    const { cycle, goal } = setupCycle();
    reviewService.saveReview(
      h,
      cycle.id,
      {
        results: [{ goalId: goal.id, percentComplete: 50, grade: 7, note: "Baseline" }],
        qol: [{ area: "Physical", rating: 6 }],
        disciplines: [{ name: "Vision", rating: 7 }],
        breakthroughs: "Baseline breakthrough",
        nextCycleNotes: "Baseline notes",
      },
      "2026-10-10",
    );
    const before = reviewService.getReview(h, cycle.id).review;

    expect(() =>
      reviewService.saveReview(
        h,
        cycle.id,
        { qol: [{ area: "Physical", rating: 11 }], breakthroughs: "Must not persist" },
        "2026-10-11",
      ),
    ).toThrow(/1-10/);
    expect(() =>
      reviewService.saveReview(
        h,
        cycle.id,
        { disciplines: [{ name: "Vision", rating: 0 }], nextCycleNotes: "Must not persist" },
        "2026-10-12",
      ),
    ).toThrow(/1-10/);

    expect(reviewService.getReview(h, cycle.id).review).toEqual(before);
  });
});
