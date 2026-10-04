import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CYCLE_REVIEW_DTO, REVIEW_FINALIZE_ERROR_DETAILS_DTO } from "../../lib/contracts";
import { createDb, type DbHandles } from "../db/index";
import { RuleError } from "../ruleError";
import * as cycleService from "./cycleService";
import * as planService from "./planService";
import * as reviewService from "./reviewService";

const START = "2026-07-13";
const SAVED_ON = "2026-07-20";
const WEEK_13 = "2026-10-05";

// Literals on purpose: the six areas and five disciplines of the book, independent of the code under test.
const QOL = [
  { area: "Spiritual", rating: 6 },
  { area: "Spouse/Key Relationship", rating: 7 },
  { area: "Family", rating: 8 },
  { area: "Business", rating: 5 },
  { area: "Personal", rating: 6 },
  { area: "Physical", rating: 9 },
];
const DISCIPLINES = [
  { name: "Vision", rating: 7 },
  { name: "12-Week Planning", rating: 8 },
  { name: "Weekly Routine (Score · Plan · WAM)", rating: 6 },
  { name: "Performance Time (Blocks)", rating: 5 },
  { name: "Key Measures", rating: 9 },
];

let h: DbHandles;
let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "twy-review-finalization-"));
  h = createDb(path.join(tmpDir, "review.db"));
});

afterEach(() => {
  h.sqlite.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function addGoal(cycleId: number, title: string) {
  return planService.addGoal(
    h,
    cycleId,
    { title, why: "Because it matters", lagMetricName: "Progress", lagUnit: "pts", lagStart: 0, lagTarget: 10 },
    START,
  );
}

/** An active cycle with two goals, plus a goal that belongs to a different cycle. */
function setup() {
  const cycle = cycleService.createCycle(h, { name: "Q3", startDate: START }, START);
  cycleService.startCycle(h, cycle.id);
  const goalA = addGoal(cycle.id, "Ship the product");
  const goalB = addGoal(cycle.id, "Run a 10K");
  const other = cycleService.createCycle(h, { name: "Other", startDate: "2027-01-04" }, START);
  const foreignGoal = addGoal(other.id, "Someone else's goal");
  return { cycle, goalA, goalB, foreignGoal };
}

/** Every section filled in: results are auto-suggested for both goals on the first save. */
function saveFullDraft(cycleId: number) {
  return reviewService.saveReview(
    h,
    cycleId,
    { qol: QOL, disciplines: DISCIPLINES, breakthroughs: "Protect the first hour.", nextCycleNotes: "Keep one launch goal." },
    SAVED_ON,
  );
}

function reviewRow(cycleId: number) {
  return h.sqlite.prepare("SELECT * FROM cycle_reviews WHERE cycle_id = ?").get(cycleId) as Record<string, unknown> | undefined;
}

type StoredSection = "results_json" | "qol_json" | "disciplines_json";

/** Writes a section exactly as given, bypassing the save-time validation (legacy and imported rows are not validated). */
function overwriteSection(cycleId: number, column: StoredSection, value: unknown) {
  h.sqlite.prepare(`UPDATE cycle_reviews SET ${column} = ? WHERE cycle_id = ?`).run(JSON.stringify(value), cycleId);
}

function failure(action: () => unknown): RuleError {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(RuleError);
    return error as RuleError;
  }
  throw new Error("expected the action to throw a RuleError");
}

type ExpectedIssue = { section: "results" | "qol" | "disciplines"; includes: string[] };

function expectRejectedWith(error: RuleError, expected: ExpectedIssue[]) {
  expect(error.status).toBe(422);
  const details = REVIEW_FINALIZE_ERROR_DETAILS_DTO.parse(error.details);
  expect(details.issues).toHaveLength(expected.length);
  expected.forEach((want, index) => {
    const issue = details.issues[index]!;
    expect(issue.section).toBe(want.section);
    for (const text of want.includes) expect(issue.message).toContain(text);
  });
}

function sections(review: NonNullable<ReturnType<typeof reviewService.getReview>["review"]>) {
  const { id, cycleId, results, qol, disciplines, breakthroughs, nextCycleNotes } = review;
  return { id, cycleId, results, qol, disciplines, breakthroughs, nextCycleNotes };
}

describe("saving a review", () => {
  it("starts a new review as a draft and reports the status through every read", () => {
    const { cycle } = setup();

    const saved = reviewService.saveReview(h, cycle.id, { breakthroughs: "First note" }, SAVED_ON);

    expect(saved.status).toBe("draft");
    expect(CYCLE_REVIEW_DTO.parse(saved)).toEqual(saved);
    expect(reviewService.getReview(h, cycle.id).review).toEqual(saved);
    expect(reviewRow(cycle.id)).toMatchObject({ status: "draft" });
  });

  it("keeps every earlier answer and stays a draft across later partial saves", () => {
    const { cycle } = setup();
    reviewService.saveReview(h, cycle.id, { qol: QOL }, SAVED_ON);

    const second = reviewService.saveReview(h, cycle.id, { disciplines: DISCIPLINES }, "2026-07-21");

    expect(second).toMatchObject({ status: "draft", qol: QOL, disciplines: DISCIPLINES, updatedAt: "2026-07-21" });
    expect(reviewRow(cycle.id)).toMatchObject({ status: "draft" });
  });

  it("can never complete a review, even when the patch asks for it", () => {
    const { cycle } = setup();

    const saved = reviewService.saveReview(h, cycle.id, { breakthroughs: "x", status: "complete" } as never, SAVED_ON);

    expect(saved.status).toBe("draft");
    expect(reviewRow(cycle.id)).toMatchObject({ status: "draft" });
  });

  it("reopens a finalized review as a draft on the next edit and keeps its other answers", () => {
    const { cycle } = setup();
    const draft = saveFullDraft(cycle.id);
    reviewService.finalizeReview(h, cycle.id, "2026-07-21");

    const edited = reviewService.saveReview(h, cycle.id, { breakthroughs: "Edited after finalizing." }, "2026-07-22");

    expect(edited.status).toBe("draft");
    expect(edited.updatedAt).toBe("2026-07-22");
    expect({ ...sections(edited), breakthroughs: draft.breakthroughs }).toEqual(sections(draft));
    expect(edited.breakthroughs).toBe("Edited after finalizing.");
    expect(reviewRow(cycle.id)).toMatchObject({ status: "draft" });
  });

  it("requires a fresh finalization after an edit, and an edit that breaks the review cannot be re-finalized", () => {
    const { cycle } = setup();
    saveFullDraft(cycle.id);
    reviewService.finalizeReview(h, cycle.id, "2026-07-21");
    reviewService.saveReview(h, cycle.id, { breakthroughs: "Second thoughts." }, "2026-07-22");

    const refinalized = reviewService.finalizeReview(h, cycle.id, "2026-07-23");
    expect(refinalized).toMatchObject({ status: "complete", breakthroughs: "Second thoughts.", updatedAt: "2026-07-23" });

    reviewService.saveReview(h, cycle.id, { qol: [] }, "2026-07-24");
    const rejected = failure(() => reviewService.finalizeReview(h, cycle.id, "2026-07-25"));

    expectRejectedWith(rejected, [{ section: "qol", includes: ["Spiritual", "Physical"] }]);
    expect(reviewService.getReview(h, cycle.id).review).toMatchObject({ status: "draft", qol: [], updatedAt: "2026-07-24" });
  });
});

describe("finalizing a review", () => {
  it("answers 409 when no review has been saved and creates nothing", () => {
    const { cycle } = setup();

    const error = failure(() => reviewService.finalizeReview(h, cycle.id, SAVED_ON));

    expect(error.status).toBe(409);
    expect(error.message).toMatch(/no review/i);
    expect(reviewRow(cycle.id)).toBeUndefined();
  });

  it("answers 404 for a cycle that does not exist", () => {
    expect(failure(() => reviewService.finalizeReview(h, 424242, SAVED_ON)).status).toBe(404);
    expect(failure(() => reviewService.saveReview(h, 424242, {}, SAVED_ON)).status).toBe(404);
  });

  it("completes a fully defined draft without touching any answer, long before week 13", () => {
    const { cycle } = setup();
    const draft = saveFullDraft(cycle.id);
    const before = reviewRow(cycle.id)!;

    const finalized = reviewService.finalizeReview(h, cycle.id, "2026-07-14"); // week 1: a deliberate early review

    expect(finalized.status).toBe("complete");
    expect(finalized.updatedAt).toBe("2026-07-14");
    expect(sections(finalized)).toEqual(sections(draft));
    expect(CYCLE_REVIEW_DTO.parse(finalized)).toEqual(finalized);
    expect(reviewService.getReview(h, cycle.id).review).toEqual(finalized);
    expect(reviewRow(cycle.id)).toEqual({ ...before, status: "complete", updated_at: "2026-07-14" });
  });

  it.each([
    ["never answered", {}, null],
    ["deliberately left empty", { breakthroughs: "", nextCycleNotes: "" }, ""],
  ] as const)("accepts breakthroughs and next-cycle notes that are %s", (_label, patch, stored) => {
    const { cycle } = setup();
    reviewService.saveReview(h, cycle.id, { qol: QOL, disciplines: DISCIPLINES, ...patch }, SAVED_ON);

    const finalized = reviewService.finalizeReview(h, cycle.id, WEEK_13);

    expect(finalized).toMatchObject({ status: "complete", breakthroughs: stored, nextCycleNotes: stored });
  });

  it("finalizes a cycle without goals once the other sections are defined", () => {
    const cycle = cycleService.createCycle(h, { name: "Goalless", startDate: START }, START);
    reviewService.saveReview(h, cycle.id, { qol: QOL, disciplines: DISCIPLINES }, SAVED_ON);

    expect(reviewService.finalizeReview(h, cycle.id, WEEK_13)).toMatchObject({ status: "complete", results: [] });
  });

  it("is idempotent: finalizing again returns the same review and writes nothing", () => {
    const { cycle } = setup();
    saveFullDraft(cycle.id);
    const first = reviewService.finalizeReview(h, cycle.id, "2026-07-21");
    const before = reviewRow(cycle.id);

    const again = reviewService.finalizeReview(h, cycle.id, "2026-12-01");

    expect(again).toEqual(first);
    expect(again.updatedAt).toBe("2026-07-21");
    expect(reviewRow(cycle.id)).toEqual(before);
  });

  describe("rejects an unfinished review with 422, useful details and no writes", () => {
    type Context = ReturnType<typeof setup>;
    type Case = [label: string, makeDefective: (c: Context) => void, expected: (c: Context) => ExpectedIssue[]];

    const resultRows = (grade: unknown, c: Context) => [
      { goalId: c.goalA.id, title: c.goalA.title, grade },
      { goalId: c.goalB.id, title: c.goalB.title, grade: 5 },
    ];

    const cases: Case[] = [
      [
        "a goal without a results row",
        (c) => reviewService.saveReview(h, c.cycle.id, { results: [{ goalId: c.goalA.id, grade: 7 }] }, SAVED_ON),
        () => [{ section: "results", includes: ["Run a 10K"] }],
      ],
      [
        "two results rows for one goal",
        (c) =>
          reviewService.saveReview(
            h,
            c.cycle.id,
            { results: [{ goalId: c.goalA.id, grade: 7 }, { goalId: c.goalA.id, grade: 6 }, { goalId: c.goalB.id, grade: 5 }] },
            SAVED_ON,
          ),
        () => [{ section: "results", includes: ["Ship the product", "2 results rows"] }],
      ],
      [
        "a results row for a goal of another cycle",
        (c) =>
          reviewService.saveReview(
            h,
            c.cycle.id,
            { results: [{ goalId: c.goalA.id, grade: 7 }, { goalId: c.goalB.id, grade: 5 }, { goalId: c.foreignGoal.id, grade: 4 }] },
            SAVED_ON,
          ),
        (c) => [{ section: "results", includes: [`goal ${c.foreignGoal.id}`] }],
      ],
      [
        "a results row for an unknown goal",
        (c) =>
          reviewService.saveReview(
            h,
            c.cycle.id,
            { results: [{ goalId: c.goalA.id, grade: 7 }, { goalId: c.goalB.id, grade: 5 }, { goalId: 999999, grade: 4 }] },
            SAVED_ON,
          ),
        () => [{ section: "results", includes: ["goal 999999"] }],
      ],
      [
        "a foreign goal standing in for a real one",
        (c) =>
          reviewService.saveReview(
            h,
            c.cycle.id,
            { results: [{ goalId: c.goalA.id, grade: 7 }, { goalId: c.foreignGoal.id, grade: 4 }] },
            SAVED_ON,
          ),
        (c) => [
          { section: "results", includes: [`goal ${c.foreignGoal.id}`] },
          { section: "results", includes: ["Run a 10K"] },
        ],
      ],
      ...([0, 11, 5.5, null, "7", undefined] as unknown[]).map(
        (grade): Case => [
          `a stored grade of ${String(grade)}`,
          (c) => overwriteSection(c.cycle.id, "results_json", resultRows(grade, c)),
          () => [{ section: "results", includes: ["Ship the product", "grade"] }],
        ],
      ),
      [
        "only some quality-of-life areas",
        (c) => reviewService.saveReview(h, c.cycle.id, { qol: QOL.slice(0, 4) }, SAVED_ON),
        () => [{ section: "qol", includes: ["Personal", "Physical"] }],
      ],
      [
        "six quality-of-life rows with one area twice",
        (c) => reviewService.saveReview(h, c.cycle.id, { qol: [...QOL.slice(0, 5), QOL[0]!] }, SAVED_ON),
        () => [
          { section: "qol", includes: ["Spiritual"] },
          { section: "qol", includes: ["Physical"] },
        ],
      ],
      [
        "an unknown quality-of-life area",
        (c) => overwriteSection(c.cycle.id, "qol_json", [...QOL.slice(0, 5), { area: "Money", rating: 5 }]),
        () => [
          { section: "qol", includes: ["Money"] },
          { section: "qol", includes: ["Physical"] },
        ],
      ],
      ...([0, 11, 7.5, null, "8"] as unknown[]).map(
        (rating): Case => [
          `a stored quality-of-life rating of ${String(rating)}`,
          (c) => overwriteSection(c.cycle.id, "qol_json", QOL.map((entry) => (entry.area === "Family" ? { ...entry, rating } : entry))),
          () => [{ section: "qol", includes: ["Family", "1 to 10"] }],
        ],
      ),
      [
        "no quality-of-life areas at all",
        (c) => reviewService.saveReview(h, c.cycle.id, { qol: [] }, SAVED_ON),
        () => [{ section: "qol", includes: QOL.map((entry) => entry.area) }],
      ],
      [
        "only some disciplines",
        (c) => reviewService.saveReview(h, c.cycle.id, { disciplines: DISCIPLINES.slice(0, 3) }, SAVED_ON),
        () => [{ section: "disciplines", includes: ["Performance Time (Blocks)", "Key Measures"] }],
      ],
      [
        "five discipline rows with one discipline twice",
        (c) => reviewService.saveReview(h, c.cycle.id, { disciplines: [...DISCIPLINES.slice(0, 4), DISCIPLINES[0]!] }, SAVED_ON),
        () => [
          { section: "disciplines", includes: ["Vision"] },
          { section: "disciplines", includes: ["Key Measures"] },
        ],
      ],
      [
        "an unknown discipline",
        (c) => overwriteSection(c.cycle.id, "disciplines_json", [...DISCIPLINES.slice(0, 4), { name: "Cooking", rating: 5 }]),
        () => [
          { section: "disciplines", includes: ["Cooking"] },
          { section: "disciplines", includes: ["Key Measures"] },
        ],
      ],
      ...([0, 11, 7.5, null, "8"] as unknown[]).map(
        (rating): Case => [
          `a stored discipline rating of ${String(rating)}`,
          (c) =>
            overwriteSection(
              c.cycle.id,
              "disciplines_json",
              DISCIPLINES.map((entry) => (entry.name === "Vision" ? { ...entry, rating } : entry)),
            ),
          () => [{ section: "disciplines", includes: ["Vision", "1 to 10"] }],
        ],
      ),
      [
        "no disciplines at all",
        (c) => reviewService.saveReview(h, c.cycle.id, { disciplines: [] }, SAVED_ON),
        () => [{ section: "disciplines", includes: DISCIPLINES.map((entry) => entry.name) }],
      ],
      [
        "every section unfinished at once",
        (c) => reviewService.saveReview(h, c.cycle.id, { results: [], qol: [], disciplines: [] }, SAVED_ON),
        () => [
          { section: "results", includes: ["Ship the product"] },
          { section: "results", includes: ["Run a 10K"] },
          { section: "qol", includes: ["Spiritual"] },
          { section: "disciplines", includes: ["Vision"] },
        ],
      ],
    ];

    it.each(cases)("%s", (_label, makeDefective, expected) => {
      const context = setup();
      saveFullDraft(context.cycle.id);
      makeDefective(context);
      const before = reviewRow(context.cycle.id);
      const readBefore = reviewService.getReview(h, context.cycle.id);

      const error = failure(() => reviewService.finalizeReview(h, context.cycle.id, WEEK_13));

      expectRejectedWith(error, expected(context));
      expect(error.message).toMatch(/finalize/i);
      expect(reviewRow(context.cycle.id)).toEqual(before);
      expect(reviewService.getReview(h, context.cycle.id)).toEqual(readBefore);
      expect(reviewRow(context.cycle.id)).toMatchObject({ status: "draft" });
    });

    it("a draft with only some sections answered lists exactly the unanswered sections", () => {
      const { cycle } = setup();
      reviewService.saveReview(h, cycle.id, { breakthroughs: "Only a note" }, SAVED_ON); // results are auto-suggested, nothing else

      const error = failure(() => reviewService.finalizeReview(h, cycle.id, WEEK_13));

      expect(REVIEW_FINALIZE_ERROR_DETAILS_DTO.parse(error.details).issues.map((issue) => issue.section)).toEqual(["qol", "disciplines"]);
      expect(reviewRow(cycle.id)).toMatchObject({ status: "draft", updated_at: SAVED_ON });
    });
  });
});

describe("archived cycles", () => {
  it.each(["draft", "complete"] as const)("reject saving and finalizing a %s review and keep it readable", (state) => {
    const { cycle } = setup();
    saveFullDraft(cycle.id);
    if (state === "complete") reviewService.finalizeReview(h, cycle.id, WEEK_13);
    cycleService.archiveCycle(h, cycle.id, WEEK_13);
    const before = reviewRow(cycle.id);
    const readBefore = reviewService.getReview(h, cycle.id);

    const save = failure(() => reviewService.saveReview(h, cycle.id, { breakthroughs: "A late edit" }, "2026-10-06"));
    const finalize = failure(() => reviewService.finalizeReview(h, cycle.id, "2026-10-06"));

    expect(save.status).toBe(409);
    expect(save.message).toMatch(/archived/i);
    expect(finalize.status).toBe(409);
    expect(finalize.message).toMatch(/archived/i);
    expect(reviewRow(cycle.id)).toEqual(before);
    expect(reviewService.getReview(h, cycle.id)).toEqual(readBefore);
    expect(readBefore.review).toMatchObject({ status: state });
  });

  it("refuse to start a review for a cycle that never had one", () => {
    const { cycle } = setup();
    cycleService.archiveCycle(h, cycle.id, WEEK_13);

    const save = failure(() => reviewService.saveReview(h, cycle.id, { breakthroughs: "Too late" }, "2026-10-06"));
    const finalize = failure(() => reviewService.finalizeReview(h, cycle.id, "2026-10-06"));

    expect(save.status).toBe(409);
    expect(save.message).toMatch(/archived/i);
    expect(finalize.status).toBe(409);
    expect(finalize.message).toMatch(/archived/i);
    expect(reviewRow(cycle.id)).toBeUndefined();
    expect(reviewService.getReview(h, cycle.id).review).toBeNull();
  });

  it("can still be archived without any review, so an abandoned cycle can be shelved", () => {
    const { cycle } = setup();

    expect(cycleService.archiveCycle(h, cycle.id, WEEK_13).status).toBe("archived");
  });
});
