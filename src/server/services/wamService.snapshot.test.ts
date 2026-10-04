import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb, type DbHandles } from "../db/index";
import * as executionRepo from "../db/repositories/execution";
import { RuleError } from "../ruleError";
import * as cycleService from "./cycleService";
import * as measuresService from "./measuresService";
import * as planService from "./planService";
import * as scoringService from "./scoringService";
import * as wamService from "./wamService";
import * as weekPlanService from "./weekPlanService";

const START = "2026-01-05";
const WEEK_1_DATE = "2026-01-05";
const WEEK_2_DATE = "2026-01-12";
let h: DbHandles;
let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "twy-wam-snapshot-"));
  h = createDb(path.join(tmpDir, "app.db"));
});

afterEach(() => {
  h.sqlite.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function setup() {
  const cycle = cycleService.createCycle(h, { name: "Q1", startDate: START }, START);
  cycleService.startCycle(h, cycle.id);
  const goal = planService.addGoal(
    h,
    cycle.id,
    { title: "Reach 100", why: "Focus", lagMetricName: "Result", lagUnit: "units", lagStart: 0, lagTarget: 100 },
    START,
  );
  const tactic = planService.addTactic(
    h,
    goal.id,
    { text: "Call one prospect", duePattern: { type: "EVERY_WEEK", timesPerWeek: 1 } },
    START,
  );
  const lead = measuresService.addLeadMeasure(h, goal.id, { name: "Calls", weeklyTarget: 5 }, START);
  return { cycle, goal, tactic, lead };
}

function logLag(goalId: number, weekNumber: number, value: number, loggedAt: string) {
  executionRepo.upsertLagLog(h, { goalId, weekNumber, value, loggedAt });
}

describe("WAM auto snapshots", () => {
  it("keeps the first saved week's measured facts and exact snapshot bytes after later activity and narrative edits", () => {
    const { cycle, goal, tactic, lead } = setup();
    logLag(goal.id, 1, 10, WEEK_1_DATE);
    measuresService.logLead(h, { leadMeasureId: lead.id, weekNumber: 1, value: 4 }, WEEK_1_DATE);
    scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 1 }, WEEK_1_DATE);
    const week1 = weekPlanService.generateWeekPlan(h, cycle.id, 1, WEEK_1_DATE);
    weekPlanService.closeWeek(h, week1.id, {}, WEEK_1_DATE);
    wamService.saveWam(h, cycle.id, 1, { blockers: "Original blocker", whatWorked: "Original win" }, WEEK_1_DATE);

    const storedBefore = h.sqlite
      .prepare("SELECT auto_json AS autoJson FROM wam_reports WHERE cycle_id = ? AND week_number = 1")
      .get(cycle.id) as { autoJson: string };

    logLag(goal.id, 2, 25, WEEK_2_DATE);
    measuresService.logLead(h, { leadMeasureId: lead.id, weekNumber: 2, value: 9 }, WEEK_2_DATE);
    scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 2 }, WEEK_2_DATE);
    planService.updateTactic(h, tactic.id, { text: "Call three prospects" });
    wamService.saveWam(h, cycle.id, 1, { blockers: "Edited blocker" }, WEEK_2_DATE);

    const storedAfter = h.sqlite
      .prepare("SELECT auto_json AS autoJson FROM wam_reports WHERE cycle_id = ? AND week_number = 1")
      .get(cycle.id) as { autoJson: string };
    const result = wamService.getWam(h, cycle.id, 1);
    const markdown = wamService.exportWamMarkdown(h, cycle.id, 1);

    expect(storedAfter.autoJson).toBe(storedBefore.autoJson);
    expect(result.report?.blockers).toBe("Edited blocker");
    expect(result.report?.whatWorked).toBe("Original win");
    expect(result.report?.updatedAt).toBe(WEEK_2_DATE);
    expect(result.auto).toMatchObject({
      weekScore: { week: 1, completed: 1, due: 1, scorePct: 100 },
      averageScore: 100,
      goals: [{ title: "Reach 100", lagLatest: 10, leadThisWeek: [{ name: "Calls", thisWeek: 4 }] }],
      nextWeekCommitments: ["Call one prospect"],
    });
    expect(markdown).toContain("lag: 10 units");
    expect(markdown).toContain("Calls: 4/5");
    expect(markdown).toContain("Call one prospect");
    expect(markdown).not.toContain("Call three prospects");
  });

  it("builds an unsaved preview using only facts through the selected week", () => {
    const { cycle, goal, tactic, lead } = setup();
    logLag(goal.id, 1, 10, WEEK_1_DATE);
    logLag(goal.id, 2, 25, WEEK_2_DATE);
    measuresService.logLead(h, { leadMeasureId: lead.id, weekNumber: 1, value: 4 }, WEEK_1_DATE);
    measuresService.logLead(h, { leadMeasureId: lead.id, weekNumber: 2, value: 9 }, WEEK_2_DATE);
    scoringService.logCompletion(h, { tacticId: tactic.id, weekNumber: 1 }, WEEK_1_DATE);
    const week1 = weekPlanService.generateWeekPlan(h, cycle.id, 1, WEEK_1_DATE);
    weekPlanService.closeWeek(h, week1.id, {}, WEEK_1_DATE);

    const result = wamService.getWam(h, cycle.id, 1);

    expect(result.report).toBeNull();
    expect(result.auto.weekScore).toMatchObject({ week: 1, completed: 1, due: 1, scorePct: 100 });
    expect(result.auto.averageScore).toBe(100);
    expect(result.auto.goals[0]).toMatchObject({
      lagLatest: 10,
      leadThisWeek: [{ name: "Calls", thisWeek: 4, weeklyTarget: 5 }],
    });
  });

  it("does not repeat week 12 commitments into the review week", () => {
    const { cycle } = setup();

    expect(wamService.getWam(h, cycle.id, 12).auto.nextWeekCommitments).toEqual([]);
  });

  it.each(["{broken", JSON.stringify({ cycleName: "Q1" })])(
    "rejects a malformed stored snapshot with a controlled rule error (%s)",
    (corruptJson) => {
      const { cycle } = setup();
      wamService.saveWam(h, cycle.id, 1, {}, WEEK_1_DATE);
      h.sqlite.prepare("UPDATE wam_reports SET auto_json = ? WHERE cycle_id = ? AND week_number = 1").run(corruptJson, cycle.id);

      let thrown: unknown;
      try {
        wamService.getWam(h, cycle.id, 1);
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(RuleError);
      expect((thrown as RuleError).status).toBe(500);
    },
  );

  it("rejects saves to archived cycles without changing data while keeping saved reads and exports available", () => {
    const { cycle } = setup();
    wamService.saveWam(h, cycle.id, 1, { blockers: "Frozen" }, WEEK_1_DATE);
    const before = h.sqlite.prepare("SELECT * FROM wam_reports WHERE cycle_id = ? AND week_number = 1").get(cycle.id);
    cycleService.archiveCycle(h, cycle.id, WEEK_2_DATE);

    let thrown: unknown;
    try {
      wamService.saveWam(h, cycle.id, 1, { blockers: "Changed" }, WEEK_2_DATE);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(RuleError);
    expect((thrown as RuleError).status).toBe(409);
    expect(h.sqlite.prepare("SELECT * FROM wam_reports WHERE cycle_id = ? AND week_number = 1").get(cycle.id)).toEqual(before);
    expect(wamService.getWam(h, cycle.id, 1).report?.blockers).toBe("Frozen");
    expect(wamService.exportWamMarkdown(h, cycle.id, 1)).toContain("Frozen");
  });
});
