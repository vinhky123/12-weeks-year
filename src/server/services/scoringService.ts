import { eq } from "drizzle-orm";
import { cycleWeekNumber, diffDays, REVIEW_WEEK, todayIso, toUtcMs, weekAndDayLabel, weekEnd, weekStart, WEEKS_IN_CYCLE } from "../cycleMath";
import type { DbHandles } from "../db/index";
import { settings as settingsTable } from "../db/schema";
import * as cyclesRepo from "../db/repositories/cycles";
import * as executionRepo from "../db/repositories/execution";
import * as planRepo from "../db/repositories/plan";
import { nextRitual } from "../planRules";
import { valleyGuidance } from "../reviewRules";
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
export function logCompletion(h: DbHandles, input: CompletionRequest, today = todayIso()) {
  const { tactic, cycle, currentWeek } = requireCompletionContext(h, input, today);
  const date = completionDate(input.date, today, cycle.startDate, input.weekNumber, currentWeek, "log");
  const existing = executionRepo.listCompletionsForTacticWeek(h, tactic.id, input.weekNumber);
  const due = weekScore([toTacticLike(tactic)], new Map(), input.weekNumber);
  const dueCount = due?.due ?? 0;
  if (existing.length >= dueCount) {
    throw conflict(`Already complete for week ${input.weekNumber} (${existing.length}/${dueCount}) — over-completion earns no extra credit.`);
  }
  const target = completionOccurrence(h, cycle.id, input.weekNumber, tactic.id, input.weekPlanItemId, "complete");
  h.sqlite.transaction(() => {
    executionRepo.insertCompletion(h, {
      tacticId: tactic.id,
      weekPlanItemId: target?.id ?? null,
      cycleWeek: input.weekNumber,
      date,
      createdAt: today,
    });
    if (target) executionRepo.updateWeekPlanItem(h, target.id, { done: target.done + 1 });
  })();
  return resultFor(h, cycle.id, tactic.id, input.weekNumber, today);
}

/** Remove the most recent completion for a tactic-week (the honest undo). */
export function unlogCompletion(h: DbHandles, input: CompletionRequest, today = todayIso()) {
  const { tactic, cycle, currentWeek } = requireCompletionContext(h, input, today);
  const existing = executionRepo.listCompletionsForTacticWeek(h, tactic.id, input.weekNumber);
  if (existing.length === 0) throw notFound("Completion to remove");
  const target = input.weekPlanItemId === undefined
    ? undefined
    : completionOccurrence(h, cycle.id, input.weekNumber, tactic.id, input.weekPlanItemId, "undo");
  const completion = input.weekPlanItemId !== undefined
    ? executionRepo.listCompletionsForOccurrence(h, input.weekPlanItemId)[0] ?? existing.find((item) => item.weekPlanItemId === null)
    : existing[0]!;
  if (!completion || (input.weekPlanItemId !== undefined && !target)) throw notFound("Completion to remove");
  completionDate(input.date, today, cycle.startDate, input.weekNumber, currentWeek, "undo", completion.date);
  h.sqlite.transaction(() => {
    executionRepo.deleteCompletion(h, completion.id);
    const completedItem = completion.weekPlanItemId !== null
      ? executionRepo.getWeekPlanItem(h, completion.weekPlanItemId)
      : target ?? latestUnlinkedCompletedOccurrence(h, cycle.id, input.weekNumber, tactic.id);
    if (completedItem) executionRepo.updateWeekPlanItem(h, completedItem.id, { done: Math.max(0, completedItem.done - 1) });
  })();
  return resultFor(h, cycle.id, tactic.id, input.weekNumber, today);
}

type CompletionRequest = { tacticId: number; weekNumber: number; date?: string; weekPlanItemId?: number };

function requireCompletionContext(h: DbHandles, input: { tacticId: number; weekNumber: number }, today: string) {
  if (!Number.isInteger(input.weekNumber) || input.weekNumber < 1 || input.weekNumber > WEEKS_IN_CYCLE) {
    throw invalid("weekNumber must be 1-12 — week 13 is review, never scored.");
  }
  const tactic = planRepo.getTactic(h, input.tacticId);
  if (!tactic) throw notFound("Tactic");
  const goal = planRepo.getGoal(h, tactic.goalId);
  if (!goal) throw notFound("Goal");
  const cycle = cyclesRepo.getCycle(h, goal.cycleId);
  if (!cycle) throw notFound("Cycle");
  const plan = executionRepo.findWeekPlan(h, cycle.id, input.weekNumber);
  if (cycle.status === "archived") throw conflict("This cycle is archived — archived cycles are immutable.");
  if (plan?.status === "closed") throw conflict(`Week ${input.weekNumber} is closed — closed weeks are immutable.`);
  const currentWeek = cycleWeekNumber(today, cycle.startDate);
  if (currentWeek >= 1 && currentWeek <= WEEKS_IN_CYCLE) {
    if (cycle.status !== "active") throw conflict("Completions only count in an active cycle during execution weeks.");
    if (input.weekNumber > currentWeek) throw conflict("You can't log completions for a future week.");
    return { tactic, cycle, currentWeek };
  }
  if (currentWeek === REVIEW_WEEK) {
    if (cycle.status !== "active" && cycle.status !== "review") {
      throw conflict("Week 13 catch-up requires an active or review cycle.");
    }
    if (input.weekNumber !== WEEKS_IN_CYCLE) throw conflict("Week 13 catch-up is allowed only for week 12.");
    if (!plan || plan.status !== "draft") throw conflict("Week 13 catch-up requires an actual draft week 12 plan.");
    return { tactic, cycle, currentWeek };
  }
  throw conflict("Today is outside this cycle's execution and week 13 catch-up window.");
}

function completionDate(
  requested: string | undefined,
  today: string,
  cycleStart: string,
  weekNumber: number,
  currentWeek: number,
  operation: "log" | "undo",
  existingDate?: string,
) {
  let date = requested;
  if (!date) {
    if (currentWeek === REVIEW_WEEK) throw invalid("Week 13 catch-up requires an explicit date within week 12.");
    if (weekNumber === currentWeek) date = today;
    else if (operation === "undo" && existingDate) date = existingDate;
    else throw invalid("Past-week completions require an explicit date within the requested week.");
  }
  let dateMs: number;
  try {
    dateMs = toUtcMs(date);
  } catch {
    throw invalid("date must be a valid YYYY-MM-DD calendar date.");
  }
  if (dateMs > toUtcMs(today)) throw invalid("Completion date cannot be after today.");
  if (dateMs < toUtcMs(weekStart(cycleStart, weekNumber)) || dateMs > toUtcMs(weekEnd(cycleStart, weekNumber))) {
    throw invalid(`Completion date must belong to execution week ${weekNumber}.`);
  }
  return date;
}

function completionOccurrence(
  h: DbHandles,
  cycleId: number,
  weekNumber: number,
  tacticId: number,
  requestedItemId: number | undefined,
  operation: "complete" | "undo",
) {
  const plan = executionRepo.findWeekPlan(h, cycleId, weekNumber);
  if (!plan) {
    if (requestedItemId !== undefined) throw notFound("Occurrence");
    return null;
  }
  const items = executionRepo.listWeekPlanItems(h, plan.id).filter((item) => item.tacticId === tacticId);
  if (requestedItemId === undefined) {
    return operation === "complete"
      ? items.find((item) => item.done < item.plannedCount) ?? null
      : null;
  }

  const item = executionRepo.getWeekPlanItem(h, requestedItemId);
  if (!item) throw notFound("Occurrence");
  if (item.weekPlanId !== plan.id || item.tacticId !== tacticId) {
    throw invalid("weekPlanItemId must identify an occurrence for the requested tactic and week.");
  }
  if (operation === "complete" && item.done >= item.plannedCount) {
    throw conflict("This occurrence is already complete.");
  }
  if (operation === "undo" && item.done <= 0) {
    throw notFound("Completion to remove");
  }
  return item;
}

function latestUnlinkedCompletedOccurrence(h: DbHandles, cycleId: number, weekNumber: number, tacticId: number) {
  const plan = executionRepo.findWeekPlan(h, cycleId, weekNumber);
  if (!plan) return undefined;
  const linkedIds = new Set(
    executionRepo.listCompletionsForTacticWeek(h, tacticId, weekNumber)
      .flatMap((completion) => completion.weekPlanItemId === null ? [] : [completion.weekPlanItemId]),
  );
  return executionRepo.listWeekPlanItems(h, plan.id)
    .filter((item) => item.tacticId === tacticId && item.done > 0 && !linkedIds.has(item.id))
    .at(-1);
}

function resultFor(h: DbHandles, cycleId: number, tacticId: number, weekNumber: number, today: string) {
  const done = executionRepo.listCompletionsForTacticWeek(h, tacticId, weekNumber).length;
  const tactic = planRepo.getTactic(h, tacticId)!;
  const due = weekScore([toTacticLike(tactic)], new Map(), weekNumber)?.due ?? 0;
  return { tacticId, weekNumber, done, due, projectedScore: weekScoreFor(h, cycleId, weekNumber, today) };
}

/** Weeks 1-12 with scores (null when nothing due or week not yet reached), closed flags, average. */
export function getCycleScores(h: DbHandles, cycleId: number, today = todayIso()) {
  const cycle = cyclesRepo.getCycle(h, cycleId);
  if (!cycle) throw notFound("Cycle");
  const tacticLikes: TacticLike[] = planRepo.listTacticsByCycle(h, cycleId).map(toTacticLike);
  const completionsByWeek = new Map<number, Map<number, number>>();
  for (const c of executionRepo.listCycleCompletions(h, cycleId)) {
    const weekMap = completionsByWeek.get(c.cycleWeek) ?? new Map<number, number>();
    weekMap.set(c.tacticId, (weekMap.get(c.tacticId) ?? 0) + 1);
    completionsByWeek.set(c.cycleWeek, weekMap);
  }
  const plans = executionRepo.listWeekPlans(h, cycleId);
  const currentWeek = cycleWeekNumber(today, cycle.startDate);
  const weeks = Array.from({ length: WEEKS_IN_CYCLE }, (_, i) => {
    const week = i + 1;
    if (week > currentWeek) return null; // future weeks never score
    const score = weekScore(tacticLikes, completionsByWeek.get(week) ?? new Map(), week);
    const plan = plans.find((p) => p.weekNumber === week);
    return score
      ? { ...score, closed: plan?.status === "closed", projected: plan?.status !== "closed" }
      : null;
  });
  return {
    currentWeek,
    weeks,
    averageScore: cycleAverageScore(weeks.map((week) => (week?.closed ? week : null))),
    goals: planRepo.listGoals(h, cycleId).map((goal) => ({
      goalId: goal.id,
      title: goal.title,
      currentWeekScore: goalScore(tacticLikes, completionsByWeek.get(Math.min(Math.max(currentWeek, 1), 12)) ?? new Map(), Math.min(Math.max(currentWeek, 1), 12), goal.id),
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
    valleyGuidance: valleyGuidance(weekNumber, scores.averageScore),
    dailyPrinciple: DAILY_PRINCIPLES[Math.abs(diffDays(cycle.startDate, today)) % DAILY_PRINCIPLES.length]!,
  };
}
