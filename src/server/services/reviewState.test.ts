import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb, type DbHandles } from "../db/index";
import * as cycleService from "./cycleService";
import * as guideService from "./guideService";
import * as historyService from "./historyService";
import * as planService from "./planService";
import * as reviewService from "./reviewService";
import * as scoringService from "./scoringService";
import * as weekPlanService from "./weekPlanService";

// Cycle start 2026-07-13: week 1 starts 07-13, week 2 07-20, week 3 07-27, week 13 starts 10-05.
const START = "2026-07-13";
const WEEK_1 = "2026-07-13";
const WEEK_2 = "2026-07-20";
const WEEK_3 = "2026-07-27";
const WEEK_13 = "2026-10-05";

const AREAS = ["Spiritual", "Spouse/Key Relationship", "Family", "Business", "Personal", "Physical"];
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
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "twy-review-state-"));
  h = createDb(path.join(tmpDir, "state.db"));
});

afterEach(() => {
  h.sqlite.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/** All six areas rated the same, so the cycle's quality-of-life average is exactly `rating`. */
function qol(rating: number) {
  return AREAS.map((area) => ({ area, rating }));
}

function makeCycle(duePattern: { type: "EVERY_WEEK"; timesPerWeek: number } | { type: "SPECIFIC_WEEKS"; weeks: number[] } = { type: "EVERY_WEEK", timesPerWeek: 1 }) {
  const cycle = cycleService.createCycle(h, { name: "Readers", startDate: START }, START);
  cycleService.startCycle(h, cycle.id);
  const goal = planService.addGoal(
    h,
    cycle.id,
    { title: "Ship", why: "Finish well", lagMetricName: "Result", lagUnit: "%", lagStart: 0, lagTarget: 100 },
    START,
  );
  const tactic = planService.addTactic(h, goal.id, { text: "Do the work", duePattern }, START);
  return { cycle, goal, tactic };
}

/** A review with every section defined, still a draft. */
function saveDraft(cycleId: number, qolRating = 7, today = WEEK_13) {
  return reviewService.saveReview(
    h,
    cycleId,
    { qol: qol(qolRating), disciplines: DISCIPLINES, breakthroughs: "Protect the first hour." },
    today,
  );
}

function finishReview(cycleId: number, qolRating = 7, today = WEEK_13) {
  saveDraft(cycleId, qolRating, today);
  return reviewService.finalizeReview(h, cycleId, today);
}

function writeReviewStep(today: string) {
  const journey = guideService.getJourney(h, today);
  return { status: journey.steps.find((step) => step.id === "write_review")!.status, next: journey.nextAction?.id ?? null };
}

function closeWeekWithCompletion(cycleId: number, tacticId: number, week: number, today: string) {
  const plan = weekPlanService.generateWeekPlan(h, cycleId, week, today);
  scoringService.logCompletion(h, { tacticId, weekNumber: week }, today);
  weekPlanService.closeWeek(h, plan.id, {}, today);
}

describe("Journey", () => {
  it("keeps write_review open while the review is only a draft and completes it on finalization", () => {
    const { cycle } = makeCycle();
    expect(writeReviewStep(WEEK_13)).toEqual({ status: "current", next: "write_review" });

    saveDraft(cycle.id);
    expect(writeReviewStep(WEEK_13)).toEqual({ status: "current", next: "write_review" });

    reviewService.finalizeReview(h, cycle.id, WEEK_13);
    expect(writeReviewStep(WEEK_13)).toEqual({ status: "done", next: "archive_cycle" });

    cycleService.archiveCycle(h, cycle.id, WEEK_13);
    expect(writeReviewStep(WEEK_13)).toEqual({ status: "done", next: "start_next_cycle" });
  });

  it("does not finish write_review for a review that only has some answers", () => {
    const { cycle } = makeCycle();
    reviewService.saveReview(h, cycle.id, { qol: qol(7).slice(0, 2), breakthroughs: "A start" }, WEEK_13);

    expect(writeReviewStep(WEEK_13)).toEqual({ status: "current", next: "write_review" });
  });

  it("returns to write_review when a finalized review is edited, until it is finalized again", () => {
    const { cycle } = makeCycle();
    finishReview(cycle.id);
    expect(writeReviewStep(WEEK_13).status).toBe("done");

    reviewService.saveReview(h, cycle.id, { breakthroughs: "A second thought." }, "2026-10-06");
    expect(writeReviewStep("2026-10-06")).toEqual({ status: "current", next: "write_review" });

    reviewService.finalizeReview(h, cycle.id, "2026-10-07");
    expect(writeReviewStep("2026-10-07")).toEqual({ status: "done", next: "archive_cycle" });
  });
});

describe("History", () => {
  it("counts a review as finished only once it is finalized, while a draft stays readable in detail", () => {
    const { cycle } = makeCycle();
    const hasReview = () => historyService.listCycles(h, WEEK_13).find((entry) => entry.id === cycle.id)!.hasReview;
    expect(hasReview()).toBe(false);
    expect(historyService.getCycleDetail(h, cycle.id, WEEK_13).review).toBeNull();

    saveDraft(cycle.id);
    expect(hasReview()).toBe(false);
    expect(historyService.getCycleDetail(h, cycle.id, WEEK_13).review).toMatchObject({
      status: "draft",
      qol: qol(7),
      disciplines: DISCIPLINES,
      breakthroughs: "Protect the first hour.",
      updatedAt: WEEK_13,
    });

    reviewService.finalizeReview(h, cycle.id, WEEK_13);
    expect(hasReview()).toBe(true);
    expect(historyService.getCycleDetail(h, cycle.id, WEEK_13).review).toMatchObject({ status: "complete" });

    reviewService.saveReview(h, cycle.id, { breakthroughs: "Edited." }, "2026-10-06");
    expect(hasReview()).toBe(false);
    expect(historyService.getCycleDetail(h, cycle.id, "2026-10-06").review).toMatchObject({ status: "draft", breakthroughs: "Edited." });
  });

  it("keeps the draft of an archived cycle readable in detail without counting it as a finished review", () => {
    const { cycle } = makeCycle();
    saveDraft(cycle.id);
    cycleService.archiveCycle(h, cycle.id, WEEK_13); // an unfinished review never blocks archiving

    expect(historyService.listCycles(h, WEEK_13).find((entry) => entry.id === cycle.id)).toMatchObject({
      status: "archived",
      hasReview: false,
    });
    expect(historyService.getCycleDetail(h, cycle.id, WEEK_13).review).toMatchObject({
      status: "draft",
      qol: qol(7),
      breakthroughs: "Protect the first hour.",
    });
  });

  it("counts only closed weeks as scored weeks; open past, open current and unreached weeks are not", () => {
    const { cycle, tactic } = makeCycle();
    closeWeekWithCompletion(cycle.id, tactic.id, 1, WEEK_1);
    weekPlanService.generateWeekPlan(h, cycle.id, 2, WEEK_2); // generated but never closed
    // week 3 is the current week with no plan yet; weeks 4-12 have not been reached

    const scores = scoringService.getCycleScores(h, cycle.id, WEEK_3);
    expect(scores.weeks[1]).toMatchObject({ closed: false, projected: true });
    expect(scores.weeks[2]).toMatchObject({ closed: false, projected: true });

    expect(historyService.listCycles(h, WEEK_3)[0]).toMatchObject({ scoredWeeks: 1, averageScore: 100 });
  });

  it("does not count a closed week with nothing due as a scored week", () => {
    const { cycle, tactic } = makeCycle({ type: "SPECIFIC_WEEKS", weeks: [2] });
    const week1 = weekPlanService.generateWeekPlan(h, cycle.id, 1, WEEK_1);
    weekPlanService.closeWeek(h, week1.id, {}, WEEK_1); // nothing due in week 1: no score
    closeWeekWithCompletion(cycle.id, tactic.id, 2, WEEK_2);

    expect(historyService.listCycles(h, WEEK_2)[0]).toMatchObject({ scoredWeeks: 1, averageScore: 100 });
  });
});

describe("Insights", () => {
  it("compares quality of life across finalized reviews only, ignoring drafts at either end", () => {
    const cycles = ["First draft", "First final", "Latest final", "Latest draft"].map((name) =>
      cycleService.createCycle(h, { name, startDate: START }, START),
    );
    saveDraft(cycles[0]!.id, 2);
    finishReview(cycles[1]!.id, 5);
    finishReview(cycles[2]!.id, 8);
    saveDraft(cycles[3]!.id, 9);

    expect(historyService.getInsights(h, WEEK_13).qualityOfLifeMovement).toEqual({ first: 5, latest: 8 });
  });

  it("shows no movement while fewer than two reviews are finalized", () => {
    const [done, draftA, draftB] = ["Done", "Draft A", "Draft B"].map((name) => cycleService.createCycle(h, { name, startDate: START }, START));
    finishReview(done!.id, 5);
    saveDraft(draftA!.id, 9);
    saveDraft(draftB!.id, 1);

    expect(historyService.getInsights(h, WEEK_13).qualityOfLifeMovement).toBeNull();
  });

  it("moves a review out of the comparison when it is reopened by an edit", () => {
    const [first, second] = ["First", "Second"].map((name) => cycleService.createCycle(h, { name, startDate: START }, START));
    finishReview(first!.id, 4);
    finishReview(second!.id, 8);
    expect(historyService.getInsights(h, WEEK_13).qualityOfLifeMovement).toEqual({ first: 4, latest: 8 });

    reviewService.saveReview(h, second!.id, { breakthroughs: "Reopened" }, "2026-10-06");

    expect(historyService.getInsights(h, "2026-10-06").qualityOfLifeMovement).toBeNull();
  });
});

describe("Celebration", () => {
  it("celebrates closed weeks only: an open week is projected progress, not a result", () => {
    const { cycle, tactic } = makeCycle();
    closeWeekWithCompletion(cycle.id, tactic.id, 1, WEEK_1);
    weekPlanService.generateWeekPlan(h, cycle.id, 2, WEEK_2); // open, 0% so far

    expect(reviewService.getCelebration(h, cycle.id, WEEK_2)).toMatchObject({
      bestWeek: { week: 1, scorePct: 100 },
      scoredWeeks: 1,
      averageScore: 100,
      goalsTotal: 1,
    });
  });

  it("never picks an open week as the best week, even when it is projected higher than every closed week", () => {
    const { cycle, tactic } = makeCycle();
    const week1 = weekPlanService.generateWeekPlan(h, cycle.id, 1, WEEK_1);
    weekPlanService.closeWeek(h, week1.id, {}, WEEK_1); // closed at 0%
    weekPlanService.generateWeekPlan(h, cycle.id, 2, WEEK_2);
    scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 2 }, WEEK_2); // open at a projected 100%

    expect(reviewService.getCelebration(h, cycle.id, WEEK_2)).toMatchObject({
      bestWeek: { week: 1, scorePct: 0 },
      scoredWeeks: 1,
      averageScore: 0,
    });
  });

  it("has nothing to celebrate yet while every reached week is still open", () => {
    const { cycle, tactic } = makeCycle();
    weekPlanService.generateWeekPlan(h, cycle.id, 1, WEEK_1);
    scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 1 }, WEEK_1);

    expect(reviewService.getCelebration(h, cycle.id, WEEK_1)).toMatchObject({ bestWeek: null, scoredWeeks: 0, averageScore: null });
  });
});
