import { eq } from "drizzle-orm";
import type { CycleReviewDto, ReviewFinalizeIssue } from "../../lib/contracts";
import { todayIso } from "../cycleMath";
import type { DbHandles } from "../db/index";
import { cycleReviews, cycles as cyclesTable } from "../db/schema";
import * as executionRepo from "../db/repositories/execution";
import * as planRepo from "../db/repositories/plan";
import { lagProgress } from "../measuresRules";
import { DISCIPLINES, QOL_AREAS, buildCelebration, goalGrade } from "../reviewRules";
import { conflict, invalid, notFound } from "../ruleError";
import * as cycleService from "./cycleService";
import { requireMutableCycle } from "./cycleMutationPolicy";
import * as scoringService from "./scoringService";

export type CycleReviewRow = typeof cycleReviews.$inferSelect;

export interface ResultEntry {
  goalId: number;
  title?: string;
  percentComplete?: number | null;
  avgScore?: number | null;
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
export function getCelebration(h: DbHandles, cycleId: number, today = todayIso()) {
  const cycle = requireCycle(h, cycleId);
  const scores = scoringService.getCycleScores(h, cycleId, today);
  const goals = planRepo.listGoals(h, cycleId);
  // Only closed weeks are final results; an open week is projected progress, never a win to celebrate.
  const closedWeeks = scores.weeks.map((week) => (week?.closed ? week : null));
  const celebration = buildCelebration(closedWeeks, goals);
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

function findReview(h: DbHandles, cycleId: number) {
  return h.db.select().from(cycleReviews).where(eq(cycleReviews.cycleId, cycleId)).get();
}

export function getReview(h: DbHandles, cycleId: number) {
  requireCycle(h, cycleId);
  const review = findReview(h, cycleId);
  return { review: review ? toDto(review) : null };
}

/**
 * Save answers. Partial saves merge into what is stored (omitted sections are kept, deliberate empty values
 * are kept). A save only ever starts a draft or reopens a finalized review as a draft — completing a review is
 * the explicit job of finalizeReview. Archived cycles are immutable.
 */
export function saveReview(h: DbHandles, cycleId: number, patch: ReviewInput, today = todayIso()): CycleReviewDto {
  requireMutableCycle(h, cycleId);
  validateReview(patch);
  const existing = findReview(h, cycleId);
  let resultsJson = existing?.resultsJson;
  if (patch.results !== undefined || !existing) {
    const auto = autoResults(h, cycleId);
    const results = (patch.results ?? auto).map((r) => {
      const suggestion = auto.find((a) => a.goalId === r.goalId);
      return {
        ...r,
        title: r.title ?? suggestion?.title ?? planRepo.getGoal(h, r.goalId)?.title ?? `Goal ${r.goalId}`,
        percentComplete: r.percentComplete ?? suggestion?.percentComplete ?? null,
        avgScore: r.avgScore ?? suggestion?.avgScore ?? null,
        grade: r.grade ?? suggestion?.grade ?? 1,
      };
    });
    resultsJson = JSON.stringify(results);
  }
  const values = {
    resultsJson: resultsJson!,
    qolJson: patch.qol === undefined && existing ? existing.qolJson : JSON.stringify(patch.qol ?? []),
    disciplinesJson:
      patch.disciplines === undefined && existing ? existing.disciplinesJson : JSON.stringify(patch.disciplines ?? []),
    breakthroughs: patch.breakthroughs ?? existing?.breakthroughs ?? null,
    nextCycleNotes: patch.nextCycleNotes ?? existing?.nextCycleNotes ?? null,
    status: "draft" as const,
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
 * Explicitly finish a review — the only way a review becomes complete. Every cycle goal needs exactly one
 * graded results row, all six quality-of-life areas and all five disciplines need a rating; breakthroughs and
 * next-cycle notes may deliberately stay empty. Nothing is written unless the review is ready, and no answer
 * is ever changed or filled in here. Idempotent: finalizing a complete review returns it untouched. There is
 * no date gate — an early, deliberate review is allowed. Archived cycles are immutable.
 */
export function finalizeReview(h: DbHandles, cycleId: number, today = todayIso()): CycleReviewDto {
  requireMutableCycle(h, cycleId);
  const existing = findReview(h, cycleId);
  if (!existing) {
    throw conflict("No review has been saved for this cycle yet — answer the review questions before finalizing.");
  }
  if (existing.status === "complete") return toDto(existing);

  const issues = finalizationIssues(existing, planRepo.listGoals(h, cycleId));
  if (issues.length > 0) {
    const sections = [...new Set(issues.map((issue) => issue.section))].join(", ");
    throw invalid(`Review is not ready to finalize — finish ${sections} first.`, { issues });
  }
  return toDto(
    h.db.update(cycleReviews).set({ status: "complete", updatedAt: today }).where(eq(cycleReviews.id, existing.id)).returning().get()!,
  );
}

const isRating = (value: unknown) => Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 10;

/** Everything that keeps a stored review from being finalized, results first. Stored JSON is not trusted. */
function finalizationIssues(row: CycleReviewRow, goals: planRepo.GoalRow[]): ReviewFinalizeIssue[] {
  return [
    ...resultIssues(JSON.parse(row.resultsJson) as Partial<ResultEntry>[], goals),
    ...ratingIssues(
      "qol",
      JSON.parse(row.qolJson) as Record<string, unknown>[],
      "area",
      QOL_AREAS,
      { one: "quality-of-life area", many: "quality-of-life areas" },
    ),
    ...ratingIssues(
      "disciplines",
      JSON.parse(row.disciplinesJson) as Record<string, unknown>[],
      "name",
      DISCIPLINES,
      { one: "discipline", many: "disciplines" },
    ),
  ];
}

/** Each cycle goal needs exactly one results row with a 1-10 grade; rows for other goals are not allowed. */
function resultIssues(results: Partial<ResultEntry>[], goals: planRepo.GoalRow[]): ReviewFinalizeIssue[] {
  const issues: ReviewFinalizeIssue[] = [];
  const goalIds = new Set(goals.map((goal) => goal.id));
  const rowsByGoal = new Map<number, Partial<ResultEntry>[]>();
  for (const row of results) {
    if (typeof row?.goalId !== "number" || !goalIds.has(row.goalId)) {
      issues.push({ section: "results", message: `A results row for goal ${String(row?.goalId)} does not belong to this cycle.` });
      continue;
    }
    rowsByGoal.set(row.goalId, [...(rowsByGoal.get(row.goalId) ?? []), row]);
  }
  for (const goal of goals) {
    const rows = rowsByGoal.get(goal.id) ?? [];
    if (rows.length === 0) {
      issues.push({ section: "results", message: `Goal "${goal.title}" has no results row.` });
    } else if (rows.length > 1) {
      issues.push({ section: "results", message: `Goal "${goal.title}" has ${rows.length} results rows — keep exactly one.` });
    }
    if (rows.some((row) => !isRating(row.grade))) {
      issues.push({ section: "results", message: `Goal "${goal.title}" needs a grade from 1 to 10.` });
    }
  }
  return issues;
}

/** The section must hold exactly the catalog's entries once each, every one rated 1-10. */
function ratingIssues(
  section: "qol" | "disciplines",
  rows: Record<string, unknown>[],
  keyField: "area" | "name",
  catalog: readonly string[],
  noun: { one: string; many: string },
): ReviewFinalizeIssue[] {
  const counts = new Map<string, number>();
  const unrated = new Set<string>();
  for (const row of rows) {
    const key = String(row?.[keyField]);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (catalog.includes(key) && !isRating(row?.rating)) unrated.add(key);
  }
  const keys = [...counts.keys()];
  const missing = catalog.filter((entry) => !counts.has(entry));
  return [
    ...keys.filter((key) => !catalog.includes(key)).map((key) => `Unknown ${noun.one}: ${key}.`),
    ...keys.filter((key) => (counts.get(key) ?? 0) > 1).map((key) => `The ${noun.one} "${key}" is listed more than once.`),
    ...(missing.length > 0 ? [`Missing ${noun.many}: ${missing.join(", ")}.`] : []),
    ...[...unrated].map((key) => `Rating for ${key} must be a whole number from 1 to 10.`),
  ].map((message) => ({ section, message }));
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

function toDto(row: CycleReviewRow): CycleReviewDto {
  return {
    id: row.id,
    cycleId: row.cycleId,
    status: row.status,
    results: JSON.parse(row.resultsJson) as CycleReviewDto["results"],
    qol: JSON.parse(row.qolJson) as CycleReviewDto["qol"],
    disciplines: JSON.parse(row.disciplinesJson) as CycleReviewDto["disciplines"],
    breakthroughs: row.breakthroughs,
    nextCycleNotes: row.nextCycleNotes,
    updatedAt: row.updatedAt,
  };
}
