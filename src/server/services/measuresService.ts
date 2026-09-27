import { and, eq } from "drizzle-orm";
import { WEEKS_IN_CYCLE, cycleWeekNumber, todayIso } from "../cycleMath";
import type { DbHandles } from "../db/index";
import { cycles as cyclesTable, leadLogs as leadLogsTable, leadMeasures as leadMeasuresTable } from "../db/schema";
import * as executionRepo from "../db/repositories/execution";
import * as planRepo from "../db/repositories/plan";
import { diagnosisFor, lagProgress } from "../measuresRules";
import { RuleError, invalid, notFound } from "../ruleError";
import { getCycleScores } from "./scoringService";

export type LeadMeasureRow = typeof import("../db/schema").leadMeasures.$inferSelect;
export type LeadLogRow = typeof import("../db/schema").leadLogs.$inferSelect;

export function addLeadMeasure(h: DbHandles, goalId: number, input: { name: string; weeklyTarget: number }, today = todayIso()) {
  const goal = planRepo.getGoal(h, goalId);
  if (!goal) throw notFound("Goal");
  if (!input.name?.trim()) throw invalid("Lead measure name is required.");
  if (!Number.isInteger(input.weeklyTarget) || input.weeklyTarget < 1) throw invalid("weeklyTarget must be a whole number ≥ 1.");
  return h.db.insert(leadMeasuresTable).values({ goalId, name: input.name.trim(), weeklyTarget: input.weeklyTarget, createdAt: today }).returning().get()!;
}

export function updateLeadMeasure(h: DbHandles, id: number, patch: { name?: string; weeklyTarget?: number }) {
  const measure = getLeadMeasure(h, id);
  const updates: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    if (!patch.name.trim()) throw invalid("Lead measure name is required.");
    updates.name = patch.name.trim();
  }
  if (patch.weeklyTarget !== undefined) {
    if (!Number.isInteger(patch.weeklyTarget) || patch.weeklyTarget < 1) throw invalid("weeklyTarget must be a whole number ≥ 1.");
    updates.weeklyTarget = patch.weeklyTarget;
  }
  if (Object.keys(updates).length === 0) return measure;
  return h.db.update(leadMeasuresTable).set(updates).where(eq(leadMeasuresTable.id, id)).returning().get()!;
}

export function removeLeadMeasure(h: DbHandles, id: number): void {
  h.db.delete(leadLogsTable).where(eq(leadLogsTable.leadMeasureId, id)).run();
  const result = h.db.delete(leadMeasuresTable).where(eq(leadMeasuresTable.id, id)).run();
  if (result.changes === 0) throw new RuleError(404, "Lead measure not found.");
}

export function getLeadMeasure(h: DbHandles, id: number) {
  const measure = h.db.select().from(leadMeasuresTable).where(eq(leadMeasuresTable.id, id)).get();
  if (!measure) throw notFound("Lead measure");
  return measure;
}

/** Upsert one weekly lead value. */
export function logLead(h: DbHandles, input: { leadMeasureId: number; weekNumber: number; value: number }, today = todayIso()) {
  const measure = getLeadMeasure(h, input.leadMeasureId);
  if (!Number.isInteger(input.weekNumber) || input.weekNumber < 1 || input.weekNumber > WEEKS_IN_CYCLE) {
    throw invalid("weekNumber must be 1-12.");
  }
  if (!Number.isFinite(input.value) || input.value < 0) throw invalid("value must be a number ≥ 0.");
  const existing = h.db
    .select()
    .from(leadLogsTable)
    .where(and(eq(leadLogsTable.leadMeasureId, measure.id), eq(leadLogsTable.weekNumber, input.weekNumber)))
    .get();
  if (existing) {
    return h.db.update(leadLogsTable).set({ value: input.value, loggedAt: today }).where(eq(leadLogsTable.id, existing.id)).returning().get()!;
  }
  return h.db.insert(leadLogsTable).values({ leadMeasureId: measure.id, weekNumber: input.weekNumber, value: input.value, loggedAt: today }).returning().get()!;
}

function requireCycle(h: DbHandles, cycleId: number) {
  const cycle = h.db.select().from(cyclesTable).where(eq(cyclesTable.id, cycleId)).get();
  if (!cycle) throw notFound("Cycle");
  return cycle;
}

/**
 * Everything the Measures screen needs: per-goal lag series + progress,
 * lead measures with weekly series, and the book's diagnosis per goal.
 */
export function getMeasuresOverview(h: DbHandles, cycleId: number, today = todayIso()) {
  const cycle = requireCycle(h, cycleId);
  const currentWeek = cycleWeekNumber(today, cycle.startDate);
  const scores = getCycleScores(h, cycleId, today);
  const lagLogs = executionRepo.listLagLogs(h, cycleId);

  const goals = planRepo.listGoals(h, cycleId).map((goal) => {
    const lagSeries = Array.from({ length: WEEKS_IN_CYCLE }, (_, i) => {
      const log = lagLogs.find((l) => l.goalId === goal.id && l.weekNumber === i + 1);
      return log ? { week: i + 1, value: log.value } : null;
    });
    const latestLag = [...lagSeries].reverse().find((point) => point !== null)?.value ?? null;
    const progress = latestLag === null ? null : lagProgress(goal.lagStart, goal.lagTarget, latestLag);
    const measures = h.db.select().from(leadMeasuresTable).where(eq(leadMeasuresTable.goalId, goal.id)).all();
    const leadSeries = new Map<number, { week: number; value: number }[]>();
    for (const measure of measures) {
      const logs = h.db.select().from(leadLogsTable).where(eq(leadLogsTable.leadMeasureId, measure.id)).all();
      leadSeries.set(
        measure.id,
        Array.from({ length: WEEKS_IN_CYCLE }, (_, i) => {
          const log = logs.find((l) => l.weekNumber === i + 1);
          return log ? { week: i + 1, value: log.value } : null;
        }).filter((p): p is { week: number; value: number } => p !== null),
      );
    }
    const goalScore = scores.goals.find((g) => g.goalId === goal.id)?.currentWeekScore ?? null;
    return {
      goal: {
        id: goal.id,
        title: goal.title,
        lagMetricName: goal.lagMetricName,
        lagUnit: goal.lagUnit,
        lagStart: goal.lagStart,
        lagTarget: goal.lagTarget,
      },
      lagSeries,
      lagProgress: progress,
      latestLag,
      leadMeasures: measures.map((m) => ({
        id: m.id,
        name: m.name,
        weeklyTarget: m.weeklyTarget,
        series: leadSeries.get(m.id) ?? [],
        thisWeek: leadSeries.get(m.id)?.find((p) => p.week === Math.min(Math.max(currentWeek, 1), WEEKS_IN_CYCLE))?.value ?? null,
      })),
      currentWeekScore: goalScore,
      diagnosis: diagnosisFor(goalScore?.scorePct ?? scores.averageScore, progress),
    };
  });

  return {
    cycleId,
    currentWeek: Math.min(Math.max(currentWeek, 1), WEEKS_IN_CYCLE),
    averageScore: scores.averageScore,
    weeks: scores.weeks,
    goals,
  };
}
