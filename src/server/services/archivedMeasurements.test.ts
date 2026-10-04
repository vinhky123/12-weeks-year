import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as postLagLog } from "../../app/api/lag-logs/route";
import { closeDb, getDb, type DbHandles } from "../db/index";
import { blockTemplates, commitments, lagLogs, leadLogs, leadMeasures } from "../db/schema";
import * as executionRepo from "../db/repositories/execution";
import { RuleError } from "../ruleError";
import * as cycleService from "./cycleService";
import * as historyService from "./historyService";
import * as measuresService from "./measuresService";
import * as modelWeekService from "./modelWeekService";
import * as planService from "./planService";

const TODAY = "2026-10-05";
const ARCHIVED_AT = "2026-12-28";

let tmpDir: string;
let dbPath: string;
let previousDbPath: string | undefined;
let h: DbHandles;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "twy-archived-measurements-"));
  dbPath = path.join(tmpDir, "app.db");
  previousDbPath = process.env.TWY_DB_PATH;
  process.env.TWY_DB_PATH = dbPath;
  h = getDb(dbPath);
});

afterEach(() => {
  closeDb(dbPath);
  if (previousDbPath === undefined) delete process.env.TWY_DB_PATH;
  else process.env.TWY_DB_PATH = previousDbPath;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function setupCycle(name: string) {
  const cycle = cycleService.createCycle(h, { name, startDate: TODAY }, TODAY);
  cycleService.startCycle(h, cycle.id);
  const goal = planService.addGoal(
    h,
    cycle.id,
    { title: `${name} goal`, why: "Keep history honest", lagMetricName: "Result", lagUnit: "units", lagStart: 0, lagTarget: 10 },
    TODAY,
  );
  const measure = measuresService.addLeadMeasure(h, goal.id, { name: "Calls", weeklyTarget: 5 }, TODAY);
  measuresService.logLead(h, { leadMeasureId: measure.id, weekNumber: 1, value: 3 }, TODAY);
  executionRepo.upsertLagLog(h, { goalId: goal.id, weekNumber: 1, value: 2, loggedAt: TODAY });
  historyService.setCommitment(h, cycle.id, { costs: "Comfort", statement: "I choose to finish." }, TODAY);
  const cycleBlock = h.db
    .insert(blockTemplates)
    .values({ cycleId: cycle.id, type: "STRATEGIC", dayOfWeek: 1, startMinute: 540, durationMinutes: 90, label: "Snapshot", createdAt: TODAY })
    .returning()
    .get()!;
  return { cycle, goal, measure, cycleBlock };
}

function expectStatus(action: () => unknown, status: number) {
  let thrown: unknown;
  try {
    action();
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeInstanceOf(RuleError);
  expect((thrown as RuleError).status).toBe(status);
}

function mutationSnapshot() {
  return {
    measures: h.db.select().from(leadMeasures).all(),
    leadLogs: h.db.select().from(leadLogs).all(),
    lagLogs: h.db.select().from(lagLogs).all(),
    commitments: h.db.select().from(commitments).all(),
    blocks: h.db.select().from(blockTemplates).all(),
  };
}

function lagRequest(goalId: number, value: number) {
  return new Request("http://local.test/api/lag-logs", {
    method: "POST",
    headers: { "content-type": "application/json", "x-twy-today": ARCHIVED_AT },
    body: JSON.stringify({ goalId, weekNumber: 1, value }),
  });
}

describe("archived measurement, commitment, and model-week guards", () => {
  it("rejects every archived write with 409, preserves all rows, and leaves reads available", async () => {
    const { cycle, goal, measure, cycleBlock } = setupCycle("Archived");
    cycleService.archiveCycle(h, cycle.id, ARCHIVED_AT);
    const before = mutationSnapshot();

    const serviceWrites = [
      () => measuresService.addLeadMeasure(h, goal.id, { name: "New", weeklyTarget: 1 }, ARCHIVED_AT),
      () => measuresService.updateLeadMeasure(h, measure.id, { name: "Changed" }),
      () => measuresService.removeLeadMeasure(h, measure.id),
      () => measuresService.logLead(h, { leadMeasureId: measure.id, weekNumber: 1, value: 9 }, ARCHIVED_AT),
      () => historyService.setCommitment(h, cycle.id, { costs: "Changed", statement: "Changed" }, ARCHIVED_AT),
      () => modelWeekService.updateBlock(h, cycleBlock.id, { label: "Changed" }),
      () => modelWeekService.removeBlock(h, cycleBlock.id),
    ];

    for (const write of serviceWrites) {
      expectStatus(write, 409);
      expect(mutationSnapshot()).toEqual(before);
    }

    const response = await postLagLog(lagRequest(goal.id, 9));
    expect(response.status).toBe(409);
    expect(mutationSnapshot()).toEqual(before);

    expect(measuresService.getMeasuresOverview(h, cycle.id, ARCHIVED_AT).goals[0]).toMatchObject({
      goal: { id: goal.id },
      latestLag: 2,
      leadMeasures: [{ id: measure.id, series: [{ week: 1, value: 3 }] }],
    });
    expect(historyService.getCycleDetail(h, cycle.id, ARCHIVED_AT).cycle.status).toBe("archived");
    expect(historyService.getCommitment(h, cycle.id)?.statement).toBe("I choose to finish.");
    expect(modelWeekService.getModelState(h, cycle.id).blocks).toContainEqual(expect.objectContaining({ id: cycleBlock.id, label: "Snapshot" }));
  });

  it("allows the same writes for a live cycle and keeps global blocks editable after archival", async () => {
    const { cycle, goal, measure, cycleBlock } = setupCycle("Live");
    const removable = measuresService.addLeadMeasure(h, goal.id, { name: "Removable", weeklyTarget: 2 }, TODAY);
    const globalBlock = modelWeekService.addBlock(h, { type: "BUFFER", dayOfWeek: 2, startMinute: 600, durationMinutes: 30, label: "Global" }, TODAY);
    const removableCycleBlock = h.db
      .insert(blockTemplates)
      .values({ cycleId: cycle.id, type: "WAM", dayOfWeek: 0, startMinute: 1020, durationMinutes: 30, label: "Remove", createdAt: TODAY })
      .returning()
      .get()!;

    expect(measuresService.updateLeadMeasure(h, measure.id, { weeklyTarget: 7 }).weeklyTarget).toBe(7);
    expect(measuresService.logLead(h, { leadMeasureId: measure.id, weekNumber: 1, value: 6 }, TODAY).value).toBe(6);
    measuresService.removeLeadMeasure(h, removable.id);
    expect(() => measuresService.getLeadMeasure(h, removable.id)).toThrow(/not found/i);
    expect(historyService.setCommitment(h, cycle.id, { costs: "Time", statement: "I choose to ship." }, TODAY).statement).toBe("I choose to ship.");
    expect(modelWeekService.updateBlock(h, cycleBlock.id, { label: "Live changed" }).label).toBe("Live changed");
    modelWeekService.removeBlock(h, removableCycleBlock.id);
    expect(modelWeekService.listBlocks(h, cycle.id).some((block) => block.id === removableCycleBlock.id)).toBe(false);

    const lagResponse = await postLagLog(lagRequest(goal.id, 8));
    expect(lagResponse.status).toBe(200);
    expect(executionRepo.listLagLogs(h, cycle.id)[0]?.value).toBe(8);

    cycleService.archiveCycle(h, cycle.id, ARCHIVED_AT);
    expect(modelWeekService.updateBlock(h, globalBlock.id, { label: "Still global" }).label).toBe("Still global");
    modelWeekService.removeBlock(h, globalBlock.id);
    expect(modelWeekService.listBlocks(h).some((block) => block.id === globalBlock.id)).toBe(false);
  });

  it("keeps missing IDs at 404 and performs no writes", async () => {
    const { cycle } = setupCycle("Missing IDs");
    const before = mutationSnapshot();

    const serviceWrites = [
      () => measuresService.updateLeadMeasure(h, 999_991, { name: "Missing" }),
      () => measuresService.removeLeadMeasure(h, 999_992),
      () => measuresService.logLead(h, { leadMeasureId: 999_993, weekNumber: 1, value: 1 }, TODAY),
      () => historyService.setCommitment(h, 999_994, { costs: "Cost", statement: "Statement" }, TODAY),
      () => modelWeekService.updateBlock(h, 999_995, { label: "Missing" }),
      () => modelWeekService.removeBlock(h, 999_996),
    ];
    for (const write of serviceWrites) {
      expectStatus(write, 404);
      expect(mutationSnapshot()).toEqual(before);
    }

    const response = await postLagLog(lagRequest(999_997, 1));
    expect(response.status).toBe(404);
    expect(mutationSnapshot()).toEqual(before);
    expect(historyService.getCycleDetail(h, cycle.id, TODAY).cycle.id).toBe(cycle.id);
  });
});
