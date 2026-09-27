import { eq } from "drizzle-orm";
import { todayIso } from "../cycleMath";
import type { DbHandles } from "../db/index";
import { cycleReviews, cycles as cyclesTable } from "../db/schema";
import * as executionRepo from "../db/repositories/execution";
import * as planRepo from "../db/repositories/plan";
import { lagProgress } from "../measuresRules";
import { DISCIPLINES, QOL_AREAS, buildCelebration, goalGrade } from "../reviewRules";
import { conflict, invalid, notFound } from "../ruleError";
import * as cycleService from "./cycleService";
import * as scoringService from "./scoringService";

export type CycleReviewRow = typeof cycleReviews.$inferSelect;

export interface ResultEntry {
  goalId: number;
  title: string;
  percentComplete: number | null;
  avgScore: number | null;
  grade?: number;
  note?: string;
}

export interface QolEntry {
  area: string;
  rating: number;
  anchor1?: string;
  anchor10?: string;
}

export interface DisciplineEntry {
  name: string;
  rating: number;
}

export interface ReviewInput {
  results?: ResultEntry[];
  qol?: QolEntry[];
  disciplines?: DisciplineEntry[];
  breakthroughs?: string;
  nextCycleNotes?: string;
}

function requireCycle(h: DbHandles, cycleId: number) {
  const cycle = h.db.select().from(cyclesTable).where(eq(cyclesTable.id, cycleId)).get();
  if (!cycle) throw notFound("Cycle");
  return cycle;
}

/** The week-13 opener: wins first. Works any time; designed for week 13. */
export function getCelebration(h: DbHandles, cycleId: number) {
  const cycle = requireCycle(h, cycleId);
  const scores = scoringService.getCycleScores(h, cycleId);
  const goals = planRepo.listGoals(h, cycleId);
  const celebration = buildCelebration(scores.weeks, goals);
  return { cycleId, cycleName: cycle.name, ...celebration };
}

/** Auto-suggested results rows: completion from lag progress, grade from the pure rule. */
function autoResults(h: DbHandles, cycleId: number): ResultEntry[] {
  const scores = scoringService.getCycleScores(h, cycleId);
  const lagLogs = executionRepo.listLagLogs(h, cycleId);
  return scores.goals.map((g) => {
    const goal = planRepo.getGoal(h, g.goalId)!;
    const latest = lagLogs
      .filter((l) => l.goalId === g.goalId)
      .sort((a, b) => a.weekNumber - b.weekNumber)
      .at(-1)?.value ?? null;
    const progress = lagProgress(goal.lagStart, goal.lagTarget, latest);
    const percentComplete = progress === null ? null : Math.round(progress * 100);
    return {
      goalId: g.goalId,
      title: g.title,
      percentComplete,
      avgScore: scores.averageScore,
      grade: goalGrade(percentComplete, scores.averageScore),
    };
  });
}

export function getReview(h: DbHandles, cycleId: number) {
  requireCycle(h, cycleId);
  const review = h.db.select().from(cycleReviews).where(eq(cycleReviews.cycleId, cycleId)).get();
  return { review: review ? toDto(review) : null };
}

export function saveReview(h: DbHandles, cycleId: number, patch: ReviewInput, today = todayIso()) {
  requireCycle(h, cycleId);
  validateReview(patch);
  const auto = autoResults(h, cycleId);
  const results = (patch.results ?? auto).map((r) => {
    const suggestion = auto.find((a) => a.goalId === r.goalId);
    return {
      ...r,
      percentComplete: r.percentComplete ?? suggestion?.percentComplete ?? null,
      avgScore: r.avgScore ?? suggestion?.avgScore ?? null,
      grade: r.grade ?? suggestion?.grade ?? 1,
    };
  });
  const existing = h.db.select().from(cycleReviews).where(eq(cycleReviews.cycleId, cycleId)).get();
  const values = {
    resultsJson: JSON.stringify(results),
    qolJson: JSON.stringify(patch.qol ?? []),
    disciplinesJson: JSON.stringify(patch.disciplines ?? []),
    breakthroughs: patch.breakthroughs ?? existing?.breakthroughs ?? null,
    nextCycleNotes: patch.nextCycleNotes ?? existing?.nextCycleNotes ?? null,
    updatedAt: today,
  };
  if (existing) {
    return toDto(h.db.update(cycleReviews).set(values).where(eq(cycleReviews.id, existing.id)).returning().get()!);
  }
  return toDto(h.db.insert(cycleReviews).values({ ...values, cycleId, createdAt: today }).returning().get()!);
}

function validateReview(patch: ReviewInput) {
  if (patch.qol) {
    for (const entry of patch.qol) {
      if (!QOL_AREAS.includes(entry.area as (typeof QOL_AREAS)[number])) {
        throw invalid(`Unknown quality-of-life area: ${entry.area}.`);
      }
      if (!Number.isInteger(entry.rating) || entry.rating < 1 || entry.rating > 10) {
        throw invalid(`Rating for ${entry.area} must be 1-10.`);
      }
    }
  }
  if (patch.disciplines) {
    for (const entry of patch.disciplines) {
      if (!DISCIPLINES.includes(entry.name as (typeof DISCIPLINES)[number])) {
        throw invalid(`Unknown discipline: ${entry.name}.`);
      }
      if (!Number.isInteger(entry.rating) || entry.rating < 1 || entry.rating > 10) {
        throw invalid(`Rating for ${entry.name} must be 1-10.`);
      }
    }
  }
  if (patch.results) {
    for (const r of patch.results) {
      if (r.grade !== undefined && (!Number.isInteger(r.grade) || r.grade < 1 || r.grade > 10)) {
        throw invalid("Grades must be 1-10.");
      }
    }
  }
}

/**
 * Week-13 reload: create the next cycle from an archived one, carrying the
 * selected goals (title/why/lag only — tactics are re-derived, not copied).
 */
export function startNextCycle(
  h: DbHandles,
  sourceCycleId: number,
  input: { name?: string; startDate?: string; carryoverGoalIds?: number[] },
  today = todayIso(),
) {
  const source = requireCycle(h, sourceCycleId);
  if (source.status !== "archived") {
    throw conflict("Archive this cycle first — week 13 is where the year closes before the next one opens.");
  }
  const carryIds = input.carryoverGoalIds ?? [];
  if (carryIds.length > 3) throw invalid("Max 3 goals per cycle — the vital few.");
  const newCycle = cycleService.createCycle(h, { name: input.name ?? "Next 12 Weeks", startDate: input.startDate ?? undefined }, today);
  for (const goalId of carryIds) {
    const goal = planRepo.getGoal(h, goalId);
    if (!goal || goal.cycleId !== sourceCycleId) throw notFound(`Goal ${goalId}`);
    planRepo.createGoal(h, {
      cycleId: newCycle.id,
      title: goal.title,
      why: goal.why,
      lagMetricName: goal.lagMetricName,
      lagUnit: goal.lagUnit,
      lagStart: goal.lagStart,
      lagTarget: goal.lagTarget,
      deadlineWeek: goal.deadlineWeek,
      status: "active",
      sortOrder: planRepo.countActiveGoals(h, newCycle.id),
      createdAt: today,
    });
  }
  return newCycle;
}

function toDto(row: CycleReviewRow) {
  return {
    id: row.id,
    cycleId: row.cycleId,
    results: JSON.parse(row.resultsJson) as ResultEntry[],
    qol: JSON.parse(row.qolJson) as QolEntry[],
    disciplines: JSON.parse(row.disciplinesJson) as DisciplineEntry[],
    breakthroughs: row.breakthroughs,
    nextCycleNotes: row.nextCycleNotes,
    updatedAt: row.updatedAt,
  };
}
