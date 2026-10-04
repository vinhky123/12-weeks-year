import { eq } from "drizzle-orm";
import { todayIso } from "../cycleMath";
import type { DbHandles } from "../db/index";
import { commitments as commitmentsTable, cycleReviews } from "../db/schema";
import * as cyclesRepo from "../db/repositories/cycles";
import * as executionRepo from "../db/repositories/execution";
import * as planRepo from "../db/repositories/plan";
import { invalid, notFound } from "../ruleError";
import * as cycleService from "./cycleService";
import { requireMutableCycle } from "./cycleMutationPolicy";
import * as scoringService from "./scoringService";

export function listCycles(h: DbHandles, today = todayIso()) {
  return cyclesRepo.listCycles(h).map((cycle) => {
    const scores = scoringService.getCycleScores(h, cycle.id, today);
    const goals = planRepo.listGoals(h, cycle.id);
    const review = h.db.select().from(cycleReviews).where(eq(cycleReviews.cycleId, cycle.id)).get();
    return {
      id: cycle.id,
      name: cycle.name,
      status: cycle.status,
      startDate: cycle.startDate,
      archivedAt: cycle.archivedAt,
      averageScore: scores.averageScore,
      // Only closed weeks are final scores; open weeks are projected progress.
      scoredWeeks: scores.weeks.filter((w) => w?.closed).length,
      goalsCompleted: goals.filter((g) => g.status === "achieved").length,
      goalsTotal: goals.length,
      // A saved draft is not a finished review; only an explicitly finalized one counts.
      hasReview: review?.status === "complete",
    };
  });
}

export function getCycleDetail(h: DbHandles, cycleId: number, today = todayIso()) {
  const cycle = cyclesRepo.getCycle(h, cycleId);
  if (!cycle) throw notFound("Cycle");
  const detail = cycleService.getCycleDetail(h, cycleId);
  const scores = scoringService.getCycleScores(h, cycleId, today);
  const review = h.db.select().from(cycleReviews).where(eq(cycleReviews.cycleId, cycleId)).get();
  const wams = executionRepo.listWeekPlans(h, cycleId).map((plan) => ({
    weekNumber: plan.weekNumber,
    status: plan.status,
    reflection: plan.reflection,
  }));
  return {
    cycle,
    goals: detail.goals,
    scores,
    review: review ? reviewToJson(review) : null,
    weeks: wams,
  };
}

export function getInsights(h: DbHandles, today = todayIso()) {
  const cycles = cyclesRepo.listCycles(h);
  const perCycle = cycles.map((cycle) => {
    const scores = scoringService.getCycleScores(h, cycle.id, today);
    const goals = planRepo.listGoals(h, cycle.id);
    return {
      cycleId: cycle.id,
      name: cycle.name,
      status: cycle.status,
      averageScore: scores.averageScore,
      goalsCompleted: goals.filter((g) => g.status === "achieved").length,
      goalsTotal: goals.length,
    };
  });
  const scored = perCycle.filter((c) => c.averageScore !== null);
  const best = scored.reduce<(typeof perCycle)[number] | null>(
    (bestSoFar, c) => (bestSoFar === null || (c.averageScore ?? 0) > (bestSoFar.averageScore ?? 0) ? c : bestSoFar),
    null,
  );
  // Quality-of-life movement compares finalized reviews only; drafts are not final answers.
  const reviews = cycles
    .map((cycle) => h.db.select().from(cycleReviews).where(eq(cycleReviews.cycleId, cycle.id)).get())
    .filter((r): r is NonNullable<typeof r> => r !== undefined && r.status === "complete")
    .map((r) => JSON.parse(r.qolJson) as { area: string; rating: number }[]);
  const qolAverage = (entries: { area: string; rating: number }[]) =>
    entries.length === 0 ? null : Math.round(entries.reduce((s, e) => s + e.rating, 0) / entries.length);
  return {
    cycles: perCycle,
    bestCycle: best,
    totalGoalsAchieved: perCycle.reduce((s, c) => s + c.goalsCompleted, 0),
    qualityOfLifeMovement:
      reviews.length >= 2
        ? { first: qolAverage(reviews[0]!), latest: qolAverage(reviews[reviews.length - 1]!) }
        : null,
  };
}

function reviewToJson(row: typeof cycleReviews.$inferSelect) {
  return {
    status: row.status,
    results: JSON.parse(row.resultsJson) as unknown,
    qol: JSON.parse(row.qolJson) as unknown,
    disciplines: JSON.parse(row.disciplinesJson) as unknown,
    breakthroughs: row.breakthroughs,
    nextCycleNotes: row.nextCycleNotes,
    updatedAt: row.updatedAt,
  };
}

// --- commitment (F12) ---

function requireCycle(h: DbHandles, cycleId: number) {
  const cycle = cyclesRepo.getCycle(h, cycleId);
  if (!cycle) throw notFound("Cycle");
  return cycle;
}

export function getCommitment(h: DbHandles, cycleId: number) {
  requireCycle(h, cycleId);
  return h.db.select().from(commitmentsTable).where(eq(commitmentsTable.cycleId, cycleId)).get() ?? null;
}

export function setCommitment(h: DbHandles, cycleId: number, input: { costs: string; statement: string }, today = todayIso()) {
  requireMutableCycle(h, cycleId);
  if (!input.costs?.trim()) throw invalid("Count the costs — what will this commitment cost you in comfort and pleasure?");
  if (!input.statement?.trim()) throw invalid('Write your commitment: "I choose to…".');
  const values = { costs: input.costs.trim(), statement: input.statement.trim() };
  const existing = h.db.select().from(commitmentsTable).where(eq(commitmentsTable.cycleId, cycleId)).get();
  if (existing) {
    return h.db.update(commitmentsTable).set(values).where(eq(commitmentsTable.id, existing.id)).returning().get()!;
  }
  return h.db.insert(commitmentsTable).values({ cycleId, ...values, createdAt: today }).returning().get()!;
}
