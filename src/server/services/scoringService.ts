import { eq } from "drizzle-orm";
import { cycleWeekNumber, diffDays, todayIso, weekAndDayLabel, weekStart, WEEKS_IN_CYCLE } from "../cycleMath";
import type { DbHandles } from "../db/index";
import { settings as settingsTable } from "../db/schema";
import * as cyclesRepo from "../db/repositories/cycles";
import * as executionRepo from "../db/repositories/execution";
import * as planRepo from "../db/repositories/plan";
import { nextRitual } from "../planRules";
import { conflict, invalid, notFound } from "../ruleError";
import { cycleAverageScore, goalScore, weekScore, type TacticLike } from "../scoring";
import { getActiveCycleInfo, phaseFor } from "./cycleService";
import { toTacticLike } from "./planService";
import { weekScoreFor } from "./weekPlanService";

const DAILY_PRINCIPLES = [
  "The one thing that moves the universe is action.",
  "Results are not the attainment of greatness, but simply confirmation of it.",
  "The score measures achievements, not effort or intentions.",
  "Learning to do the things you need to do, regardless of how you feel, is a core discipline for success.",
  "In our efforts to not miss anything, we unwittingly miss everything.",
  "Every day is important. Every week is important.",
  "A vision without a plan is a pipe dream.",
];

/** Log one honest completion. Caps at due — no extra credit. */
export function logCompletion(h: DbHandles, input: { tacticId: number; weekNumber: number; date?: string }, today = todayIso()) {
  const { tactic, cycle } = requireLoggable(h, input, today);
  const existing = executionRepo.listCompletionsForTacticWeek(h, tactic.id, input.weekNumber);
  const due = weekScore([toTacticLike(tactic)], new Map(), input.weekNumber);
  const dueCount = due?.due ?? 0;
  if (existing.length >= dueCount) {
    throw conflict(`Already complete for week ${input.weekNumber} (${existing.length}/${dueCount}) — over-completion earns no extra credit.`);
  }
  const completion = executionRepo.insertCompletion(h, {
    tacticId: tactic.id,
    cycleWeek: input.weekNumber,
    date: input.date ?? today,
    createdAt: today,
  });
  syncItemDone(h, cycle.id, input.weekNumber, tactic.id, existing.length + 1);
  return resultFor(h, cycle.id, tactic.id, input.weekNumber, today);
}

/** Remove the most recent completion for a tactic-week (the honest undo). */
export function unlogCompletion(h: DbHandles, input: { tacticId: number; weekNumber: number }, today = todayIso()) {
  const { tactic, cycle } = requireLoggable(h, input, today);
  const existing = executionRepo.listCompletionsForTacticWeek(h, tactic.id, input.weekNumber);
  if (existing.length === 0) throw notFound("Completion to remove");
  executionRepo.deleteCompletion(h, existing[0]!.id);
  syncItemDone(h, cycle.id, input.weekNumber, tactic.id, existing.length - 1);
  return resultFor(h, cycle.id, tactic.id, input.weekNumber, today);
}

function requireLoggable(h: DbHandles, input: { tacticId: number; weekNumber: number }, today: string) {
  if (!Number.isInteger(input.weekNumber) || input.weekNumber < 1 || input.weekNumber > WEEKS_IN_CYCLE) {
    throw invalid("weekNumber must be 1-12 — week 13 is review, never scored.");
  }
  const tactic = planRepo.getTactic(h, input.tacticId);
  if (!tactic) throw notFound("Tactic");
  const goal = planRepo.getGoal(h, tactic.goalId);
  if (!goal) throw notFound("Goal");
  const cycle = cyclesRepo.getCycle(h, goal.cycleId);
  if (!cycle) throw notFound("Cycle");
  if (cycle.status !== "active") throw conflict("Completions only count in an active cycle.");
  const currentWeek = cycleWeekNumber(today, cycle.startDate);
  if (currentWeek < 1 || currentWeek > WEEKS_IN_CYCLE) {
    throw conflict("Today is outside this cycle's execution weeks.");
  }
  if (input.weekNumber > currentWeek) throw conflict("You can't log completions for a future week.");
  const plan = executionRepo.findWeekPlan(h, cycle.id, input.weekNumber);
  if (plan?.status === "closed") throw conflict(`Week ${input.weekNumber} is closed — closed weeks are immutable.`);
  return { tactic, cycle };
}

function syncItemDone(h: DbHandles, cycleId: number, weekNumber: number, tacticId: number, done: number) {
  const plan = executionRepo.findWeekPlan(h, cycleId, weekNumber);
  if (!plan) return;
  const item = executionRepo
    .listWeekPlanItems(h, plan.id)
    .find((i) => i.tacticId === tacticId);
  if (item) executionRepo.updateWeekPlanItem(h, item.id, { done: Math.max(0, done) });
}

function resultFor(h: DbHandles, cycleId: number, tacticId: number, weekNumber: number, today: string) {
  const done = executionRepo.listCompletionsForTacticWeek(h, tacticId, weekNumber).length;
  const tactic = planRepo.getTactic(h, tacticId)!;
  const due = weekScore([toTacticLike(tactic)], new Map(), weekNumber)?.due ?? 0;
  return { tacticId, weekNumber, done, due, projectedScore: weekScoreFor(h, cycleId, weekNumber, today) };
}

/** Weeks 1-12 with scores (null when nothing due), closed flags, average. */
export function getCycleScores(h: DbHandles, cycleId: number, today = todayIso()) {
  const cycle = cyclesRepo.getCycle(h, cycleId);
  if (!cycle) throw notFound("Cycle");
  const tacticLikes: TacticLike[] = planRepo.listTacticsByCycle(h, cycleId).map(toTacticLike);
  const completions = new Map<number, number>();
  for (const c of executionRepo.listCycleCompletions(h, cycleId)) {
    completions.set(c.tacticId, (completions.get(c.tacticId) ?? 0) + 1);
  }
  const plans = executionRepo.listWeekPlans(h, cycleId);
  const currentWeek = cycleWeekNumber(today, cycle.startDate);
  const weeks = Array.from({ length: WEEKS_IN_CYCLE }, (_, i) => {
    const week = i + 1;
    const score = weekScore(tacticLikes, completions, week);
    const plan = plans.find((p) => p.weekNumber === week);
    return score
      ? { ...score, closed: plan?.status === "closed", projected: week === currentWeek && plan?.status !== "closed" }
      : null;
  });
  return {
    currentWeek,
    weeks,
    averageScore: cycleAverageScore(weeks),
    goals: planRepo.listGoals(h, cycleId).map((goal) => ({
      goalId: goal.id,
      title: goal.title,
      currentWeekScore: goalScore(tacticLikes, completions, Math.min(Math.max(currentWeek, 1), 12), goal.id),
    })),
  };
}

/** The five-minute daily view: day-grouped items with done/planned and context. */
export function getTodayView(h: DbHandles, today = todayIso()) {
  const info = getActiveCycleInfo(h, today);
  if (!info || info.weekNumber < 1 || info.weekNumber > WEEKS_IN_CYCLE) return null;
  const plan = executionRepo.findWeekPlan(h, info.cycle.id, info.weekNumber);
  const dayIndexToday = Math.max(0, Math.min(6, diffDays(info.cycle.startDate, today) % 7));
  const items = plan
    ? executionRepo.listWeekPlanItems(h, plan.id).map((item) => ({
        ...item,
        goal: item.tacticId ? goalContextFor(h, item.tacticId) : null,
      }))
    : [];
  const dayIndexFromStart = diffDays(info.cycle.startDate, today);
  const principle = DAILY_PRINCIPLES[Math.abs(dayIndexFromStart) % DAILY_PRINCIPLES.length]!;
  return {
    date: today,
    weekNumber: info.weekNumber,
    weekLabel: weekAndDayLabel(today, info.cycle.startDate),
    dayIndexToday,
    days: Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i,
      date: addDaysTo(weekStart(info.cycle.startDate, info.weekNumber), i),
      items: items.filter((item) => item.dayOfWeek === i),
    })),
    planStatus: plan?.status ?? "none",
    projectedScore: weekScoreFor(h, info.cycle.id, info.weekNumber, today),
    dailyPrinciple: principle,
  };
}

function goalContextFor(h: DbHandles, tacticId: number) {
  const tactic = planRepo.getTactic(h, tacticId);
  if (!tactic) return null;
  const goal = planRepo.getGoal(h, tactic.goalId);
  if (!goal) return null;
  return { id: goal.id, title: goal.title, why: goal.why };
}

function addDaysTo(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Everything the dashboard needs, in one call. */
export function buildDashboard(h: DbHandles, today = todayIso()) {
  const info = getActiveCycleInfo(h, today);
  // Active first; otherwise the cycle the app is focused on (settings), or the
  // most recent non-archived cycle (e.g. freshly created, still planning).
  let cycle = info?.cycle;
  if (!cycle) {
    const settingsRow = h.db.select().from(settingsTable).where(eq(settingsTable.id, 1)).get();
    if (settingsRow?.currentCycleId) {
      cycle = cyclesRepo.getCycle(h, settingsRow.currentCycleId) ?? undefined;
    }
  }
  if (!cycle) {
    const open = cyclesRepo.listCycles(h).filter((c) => c.status !== "archived");
    cycle = open[open.length - 1];
  }
  if (!cycle) {
    return {
      phase: "no_cycle" as const,
      today: { isoDate: today, weekNumber: 0, weekLabel: null, daysRemaining: 0 },
      cycle: null,
      currentWeek: null,
      scoreHistory: [],
      averageScore: null,
      goals: [],
      nextRitual: "create_cycle" as const,
      dailyPrinciple: DAILY_PRINCIPLES[new Date(`${today}T00:00:00Z`).getUTCDay()]!,
    };
  }
  const scores = getCycleScores(h, cycle.id, today);
  const weekNumber = info?.weekNumber ?? cycleWeekNumber(today, cycle.startDate);
  const plan = executionRepo.findWeekPlan(h, cycle.id, Math.min(Math.max(weekNumber, 1), 12));
  const previousPlan = weekNumber >= 2 ? executionRepo.findWeekPlan(h, cycle.id, weekNumber - 1) : undefined;
  const ritual = nextRitual({
    hasActiveCycle: true,
    cycleStatus: cycle.status as "planning" | "active" | "review" | "archived",
    currentWeek: weekNumber,
    hasCurrentWeekPlan: !!plan,
    lastWeekPlanClosed: previousPlan ? previousPlan.status === "closed" : true,
    reviewWeek: weekNumber === 13,
  });
  return {
    phase: phaseFor(today, cycle.startDate),
    today: {
      isoDate: today,
      weekNumber,
      weekLabel: weekAndDayLabel(today, cycle.startDate),
      daysRemaining: info?.daysRemaining ?? 0,
    },
    cycle,
    currentWeek: {
      number: Math.min(Math.max(weekNumber, 1), 12),
      planStatus: plan?.status ?? ("none" as const),
      score: scores.weeks[Math.min(Math.max(weekNumber, 1), 12) - 1] ?? null,
    },
    scoreHistory: scores.weeks,
    averageScore: scores.averageScore,
    goals: planRepo.listGoals(h, cycle.id).map((goal) => ({
      id: goal.id,
      title: goal.title,
      why: goal.why,
      lagMetricName: goal.lagMetricName,
      lagUnit: goal.lagUnit,
      lagStart: goal.lagStart,
      lagTarget: goal.lagTarget,
      status: goal.status,
      tacticCount: planRepo.listTacticsByGoal(h, goal.id).length,
      currentWeekScore: scores.goals.find((g) => g.goalId === goal.id)?.currentWeekScore ?? null,
    })),
    nextRitual: ritual,
    dailyPrinciple: DAILY_PRINCIPLES[Math.abs(diffDays(cycle.startDate, today)) % DAILY_PRINCIPLES.length]!,
  };
}
