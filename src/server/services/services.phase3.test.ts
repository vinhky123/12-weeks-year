import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb, type DbHandles } from "../db/index";
import { addDays } from "../cycleMath";
import * as cycleService from "./cycleService";
import * as historyService from "./historyService";
import * as planService from "./planService";
import * as reviewService from "./reviewService";
import * as scoringService from "./scoringService";
import * as wamService from "./wamService";
import * as weekPlanService from "./weekPlanService";

const TODAY = "2026-10-05";
let tmpPath: string;
let h: DbHandles;

beforeEach(() => {
  tmpPath = path.join(os.tmpdir(), `twy-p3-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  h = createDb(tmpPath);
});

afterEach(() => {
  h.sqlite.close();
  for (const suffix of ["", "-wal", "-shm"]) fs.rmSync(tmpPath + suffix, { force: true });
});

const AREAS = ["Spiritual", "Spouse/Key Relationship", "Family", "Business", "Personal", "Physical"];
const DISCIPLINES = ["Vision", "12-Week Planning", "Weekly Routine (Score · Plan · WAM)", "Performance Time (Blocks)", "Key Measures"];

/** A review only counts as finished once every section is defined and the owner finalizes it, before archiving. */
function finishReview(cycleId: number, ratings: Record<string, number>) {
  reviewService.saveReview(
    h,
    cycleId,
    { qol: AREAS.map((area) => ({ area, rating: ratings[area]! })), disciplines: DISCIPLINES.map((name) => ({ name, rating: 7 })) },
    TODAY,
  );
  return reviewService.finalizeReview(h, cycleId, TODAY);
}

function setup(today = TODAY) {
  const cycle = cycleService.createCycle(h, { name: "Q4", startDate: today }, today);
  cycleService.startCycle(h, cycle.id);
  const goal = planService.addGoal(
    h,
    cycle.id,
    { title: "Lose 10 lbs", why: "Energy", lagMetricName: "Weight", lagUnit: "lbs", lagStart: 180, lagTarget: 170 },
    today,
  );
  const tactic = planService.addTactic(h, goal.id, { text: "Perform 30-min strength training", duePattern: { type: "EVERY_WEEK", timesPerWeek: 1 } }, today);
  return { cycle, goal, tactic };
}

describe("WAM reports (F10)", () => {
  it("get returns live auto data; save freezes a snapshot and round-trips", () => {
    const { cycle } = setup();
    const before = wamService.getWam(h, cycle.id, 1);
    expect(before.report).toBeNull();
    expect(before.auto.cycleName).toBe("Q4");
    expect(before.auto.nextWeekCommitments).toContain("Perform 30-min strength training"); // week 2 dues

    const saved = wamService.saveWam(h, cycle.id, 1, { blockers: "Outreach slips on Fridays", whatWorked: "Morning workouts" }, TODAY);
    expect(saved.auto).toBeDefined();
    expect(saved.blockers).toBe("Outreach slips on Fridays");

    const after = wamService.getWam(h, cycle.id, 1);
    expect(after.report?.whatWorked).toBe("Morning workouts");
    // re-save updates in place (upsert, not duplicate)
    wamService.saveWam(h, cycle.id, 1, { encouragement: "Keep going" }, TODAY);
    const rows = h.sqlite.prepare("SELECT count(*) c FROM wam_reports").get() as { c: number };
    expect(rows.c).toBe(1);
  });

  it("exports a standalone markdown report", () => {
    const { cycle, goal } = setup();
    wamService.saveWam(h, cycle.id, 1, { blockers: "None", whatWorked: "Planning Sunday night", encouragement: "Trust the plan" }, TODAY);
    const md = wamService.exportWamMarkdown(h, cycle.id, 1);
    expect(md).toContain("# WAM Report — Q4, Week 1");
    expect(md).toContain("## Results to date");
    expect(md).toContain("Lose 10 lbs");
    expect(md).toContain("Perform 30-min strength training"); // next week's commitment
    expect(md).toContain("Planning Sunday night");
    void goal;
  });

  it("rejects week 13 and oversized free text", () => {
    const { cycle } = setup();
    expect(() => wamService.getWam(h, cycle.id, 13)).toThrow(/1-12/);
    expect(() => wamService.saveWam(h, cycle.id, 1, { blockers: "x".repeat(2001) }, TODAY)).toThrow(/2000/);
  });
});

describe("week-13 review (F11)", () => {
  it("celebration puts wins first and handles empty weeks", () => {
    const { cycle } = setup();
    const celebration = reviewService.getCelebration(h, cycle.id);
    expect(celebration.goalsTotal).toBe(1);
    expect(celebration.bestWeek).toBeNull(); // nothing scored yet
    expect(celebration.averageScore).toBeNull();
  });

  it("saves a review with auto-graded results and validates ratings", () => {
    const { cycle } = setup();
    expect(() =>
      reviewService.saveReview(h, cycle.id, { qol: [{ area: "Health", rating: 5 }] }, TODAY),
    ).toThrow(/Unknown quality-of-life area/);
    expect(() =>
      reviewService.saveReview(h, cycle.id, { qol: [{ area: "Physical", rating: 11 }] }, TODAY),
    ).toThrow(/1-10/);

    const review = reviewService.saveReview(h, cycle.id, {
      qol: [
        { area: "Physical", rating: 7, anchor1: "Sick", anchor10: "Athlete" },
        { area: "Business", rating: 5 },
      ],
      disciplines: [{ name: "Vision", rating: 8 }],
      breakthroughs: "Work ON the system every Sunday.",
    }, TODAY);
    expect(review.results).toHaveLength(1); // auto results for the 1 goal
    expect(review.results[0]!.grade).toBeGreaterThan(0);
    expect(review.breakthroughs).toContain("Work ON");
    expect(review.status).toBe("draft"); // saved answers stay a draft until finalized
  });

  it("startNextCycle requires archive, carries goals, enforces max 3", () => {
    const { cycle, goal } = setup();
    expect(() => reviewService.startNextCycle(h, cycle.id, { carryoverGoalIds: [goal.id] }, TODAY)).toThrow(/Archive this cycle first/);
    cycleService.archiveCycle(h, cycle.id, TODAY);
    const next = reviewService.startNextCycle(h, cycle.id, { name: "Q1 2027", carryoverGoalIds: [goal.id] }, TODAY);
    expect(next.status).toBe("planning");
    expect(next.name).toBe("Q1 2027");
    const detail = cycleService.getCycleDetail(h, next.id);
    expect(detail.goals).toHaveLength(1);
    expect(detail.goals[0]!.title).toBe("Lose 10 lbs"); // carried
    expect(detail.goals[0]!.tactics).toHaveLength(0); // tactics NOT carried — re-derived
    expect(() => reviewService.startNextCycle(h, cycle.id, { carryoverGoalIds: [1, 2, 3, 4] }, TODAY)).toThrow(/Max 3 goals/);
  });
});

describe("history & insights (F13)", () => {
  it("lists cycles with scores and review flags", () => {
    const { cycle } = setup();
    const list = historyService.listCycles(h, TODAY);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: cycle.id, status: "active", hasReview: false, goalsTotal: 1 });
  });

  it("insights compute best cycle and QoL movement across finalized reviews", () => {
    const { cycle } = setup();
    // The first year's review is finalized before the cycle is archived (archived cycles are immutable).
    finishReview(cycle.id, { Spiritual: 5, "Spouse/Key Relationship": 5, Family: 6, Business: 5, Personal: 5, Physical: 4 });
    cycleService.archiveCycle(h, cycle.id, TODAY);
    const second = reviewService.startNextCycle(h, cycle.id, { name: "Q1", startDate: "2027-01-04" }, TODAY);
    cycleService.startCycle(h, second.id);
    const g2 = planService.addGoal(h, second.id, { title: "G2", why: "Why", lagMetricName: "M", lagUnit: "u", lagStart: 0, lagTarget: 10 }, TODAY);
    void g2;
    finishReview(second.id, { Spiritual: 8, "Spouse/Key Relationship": 8, Family: 8, Business: 8, Personal: 9, Physical: 7 });

    const insights = historyService.getInsights(h, TODAY);
    expect(insights.cycles).toHaveLength(2);
    expect(insights.totalGoalsAchieved).toBe(0);
    expect(insights.qualityOfLifeMovement).toEqual({ first: 5, latest: 8 }); // avg of six areas: 5 -> 8
  });

  it("commitment upserts and validates (F12)", () => {
    const { cycle } = setup();
    expect(historyService.getCommitment(h, cycle.id)).toBeNull();
    expect(() => historyService.setCommitment(h, cycle.id, { costs: "  ", statement: "I choose to" }, TODAY)).toThrow(/Count the costs/);
    historyService.setCommitment(h, cycle.id, { costs: "Early mornings, weekend comfort", statement: "I choose to train 3x per week." }, TODAY);
    const updated = historyService.setCommitment(h, cycle.id, { costs: "Early mornings", statement: "I choose to train and do outreach weekly." }, TODAY);
    expect(updated.statement).toContain("outreach");
    const rows = h.sqlite.prepare("SELECT count(*) c FROM commitments").get() as { c: number };
    expect(rows.c).toBe(1);
  });
});

describe("valley guardrail on the dashboard (F12)", () => {
  it("appears in weeks 3-6 with a low average and nowhere else", () => {
    const { cycle, tactic } = setup();
    const week1 = weekPlanService.generateWeekPlan(h, cycle.id, 1, TODAY);
    weekPlanService.closeWeek(h, week1.id, {}, TODAY);
    const midCycle = addDays(TODAY, 21); // week 4, day 1
    const dash = scoringService.buildDashboard(h, midCycle);
    expect(dash.valleyGuidance).not.toBeNull();
    expect(dash.valleyGuidance!.headline).toMatch(/valley/i);
    void cycle;
    void tactic;
  });
  it("stays quiet when executing well", () => {
    const { cycle, tactic } = setup();
    scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 1 }, TODAY);
    const dash = scoringService.buildDashboard(h, TODAY);
    void cycle;
    expect(dash.valleyGuidance).toBeNull(); // week 1 is outside the valley window anyway
  });
});
