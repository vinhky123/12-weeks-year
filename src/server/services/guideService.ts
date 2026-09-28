// Guide journey service — assembles the JourneySnapshot from real data and
// applies the pure rules. The focus cycle mirrors buildDashboard: active
// cycle first, then settings.currentCycleId, then the most recent
// non-archived cycle (e.g. freshly created, still planning). When only
// archived cycles remain (just archived, successor not yet created) the
// journey stays on the archived cycle so completion can offer
// start_next_cycle — buildDashboard has no equivalent state (it shows
// no_cycle there), so this terminal fallback is journey-specific.
import { and, eq, isNull, or } from "drizzle-orm";
import { cycleWeekNumber, diffDays, todayIso, weekEnd, WEEKS_IN_CYCLE } from "../cycleMath";
import type { DbHandles } from "../db/index";
import * as cyclesRepo from "../db/repositories/cycles";
import * as executionRepo from "../db/repositories/execution";
import * as planRepo from "../db/repositories/plan";
import { blockTemplates, commitments, cycleReviews, settings as settingsTable, wamReports } from "../db/schema";
import { journeyState, type JourneySnapshot } from "../journeyRules";
import { getVision } from "./visionService";

const EMPTY_SNAPSHOT: JourneySnapshot = {
  hasLivingVision: false,
  cycleStatus: "none",
  goalCount: 0,
  goalsWithoutTactics: 0,
  hasStrategicBlock: false,
  hasCommitment: false,
  currentWeek: 0,
  currentWeekPlanStatus: "none",
  unclosedWeek: null,
  hasWamForLastClosedWeek: false,
  hasReview: false,
  hasArchivedHistory: false,
};

export function getJourney(h: DbHandles, today = todayIso()) {
  let cycle = cyclesRepo.findActiveCycle(h);
  if (!cycle) {
    const settingsRow = h.db.select().from(settingsTable).where(eq(settingsTable.id, 1)).get();
    if (settingsRow?.currentCycleId) cycle = cyclesRepo.getCycle(h, settingsRow.currentCycleId) ?? undefined;
  }
  if (!cycle) {
    const all = cyclesRepo.listCycles(h);
    const open = all.filter((c) => c.status !== "archived");
    cycle = open[open.length - 1] ?? all[all.length - 1];
  }

  if (!cycle) {
    const r = journeyState(EMPTY_SNAPSHOT);
    return toDto(r, { cycleName: null, weekNumber: 0, unclosedWeek: null });
  }

  const vision = getVision(h);
  const goals = planRepo.listGoals(h, cycle.id);
  const tacticCount = new Map<number, number>();
  for (const tactic of planRepo.listTacticsByCycle(h, cycle.id)) {
    tacticCount.set(tactic.goalId, (tacticCount.get(tactic.goalId) ?? 0) + 1);
  }

  const currentWeek = cycleWeekNumber(today, cycle.startDate);
  const plan = executionRepo.findWeekPlan(h, cycle.id, Math.min(Math.max(currentWeek, 1), WEEKS_IN_CYCLE));

  let unclosedWeek: number | null = null;
  if (currentWeek >= 2) {
    const prior = executionRepo.findWeekPlan(h, cycle.id, currentWeek - 1);
    if (prior && prior.status !== "closed") unclosedWeek = currentWeek - 1;
  }
  if (
    unclosedWeek === null &&
    currentWeek >= 1 && currentWeek <= WEEKS_IN_CYCLE &&
    plan && plan.status !== "closed" &&
    // Closing becomes due once the week has ended (its last day counts);
    // an open current week mid-week is not a gap.
    diffDays(weekEnd(cycle.startDate, currentWeek), today) >= 0
  ) {
    unclosedWeek = currentWeek;
  }

  const closedWeeks = executionRepo.listWeekPlans(h, cycle.id).filter((p) => p.status === "closed");
  const lastClosedWeek = closedWeeks.length ? Math.max(...closedWeeks.map((p) => p.weekNumber)) : null;

  const snapshot: JourneySnapshot = {
    hasLivingVision:
      !!vision &&
      [vision.longTerm, vision.threeYear, vision.cycleConnection].some((t) => t.trim().length > 0),
    cycleStatus: cycle.status as JourneySnapshot["cycleStatus"],
    goalCount: goals.length,
    goalsWithoutTactics: goals.filter((g) => (tacticCount.get(g.id) ?? 0) === 0).length,
    hasStrategicBlock: !!h.db
      .select()
      .from(blockTemplates)
      .where(and(eq(blockTemplates.type, "STRATEGIC"), or(isNull(blockTemplates.cycleId), eq(blockTemplates.cycleId, cycle.id))))
      .get(),
    hasCommitment: !!h.db.select().from(commitments).where(eq(commitments.cycleId, cycle.id)).get(),
    currentWeek,
    currentWeekPlanStatus: (plan?.status ?? "none") as JourneySnapshot["currentWeekPlanStatus"],
    unclosedWeek,
    hasWamForLastClosedWeek:
      lastClosedWeek !== null &&
      !!h.db
        .select()
        .from(wamReports)
        .where(and(eq(wamReports.cycleId, cycle.id), eq(wamReports.weekNumber, lastClosedWeek)))
        .get(),
    hasReview: !!h.db.select().from(cycleReviews).where(eq(cycleReviews.cycleId, cycle.id)).get(),
    hasArchivedHistory: cyclesRepo.listCycles(h).some((c) => c.status === "archived"),
  };

  return toDto(journeyState(snapshot), { cycleName: cycle.name, weekNumber: currentWeek, unclosedWeek });
}

function toDto(
  r: ReturnType<typeof journeyState>,
  context: { cycleName: string | null; weekNumber: number; unclosedWeek: number | null },
) {
  return {
    ...r,
    nextAction: r.nextAction ? { id: r.nextAction } : null,
    context,
  };
}
