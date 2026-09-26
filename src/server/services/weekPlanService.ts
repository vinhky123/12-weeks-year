import { eq } from "drizzle-orm";
import { cycleWeekNumber, todayIso, weekEnd, weekStart, WEEKS_IN_CYCLE } from "../cycleMath";
import type { DbHandles } from "../db/index";
import { cycles as cyclesTable } from "../db/schema";
import * as executionRepo from "../db/repositories/execution";
import * as planRepo from "../db/repositories/plan";
import { generateWeekPlanItems } from "../planRules";
import { conflict, invalid, notFound } from "../ruleError";
import * as scoringModule from "../scoring";
import { toTacticLike } from "./planService";

/** The weekly plan is generated fresh from the 12-Week Plan — never copy-pasted. */
export function generateWeekPlan(h: DbHandles, cycleId: number, week: number, today = todayIso()) {
  if (!Number.isInteger(week) || week < 1 || week > WEEKS_IN_CYCLE) throw invalid("Week must be 1-12.");
  const cycle = h.db.select().from(cyclesTable).where(eq(cyclesTable.id, cycleId)).get();
  if (!cycle) throw notFound("Cycle");
  const currentWeek = cycleWeekNumber(today, cycle.startDate);
  if (week > currentWeek + 1) throw conflict(`Week ${week} is too far ahead — you can plan at most one week ahead (current: week ${Math.max(currentWeek, 0)}).`);

  const existing = executionRepo.findWeekPlan(h, cycleId, week);
  if (existing) {
    if (existing.status === "closed") throw conflict(`Week ${week} is closed — closed weeks are immutable. Regenerating is forbidden.`);
    return existing;
  }

  const plan = executionRepo.createWeekPlan(h, { cycleId, weekNumber: week, status: "draft", createdAt: today });
  const tacticRows = planRepo.listTacticsByCycle(h, cycleId);
  const textById = new Map(tacticRows.map((t) => [t.id, t.text] as const));
  const items = generateWeekPlanItems(
    tacticRows.map((row) => toTacticLike(row)),
    week,
    textById,
  );
  for (const item of items) {
    executionRepo.insertWeekPlanItem(h, {
      weekPlanId: plan.id,
      label: item.label,
      tacticId: item.tacticId as number, // DB tactic ids are integers
      dayOfWeek: item.dayOfWeek,
      done: 0,
      plannedCount: item.plannedCount,
      sortOrder: item.sortOrder,
    });
  }
  return plan;
}

export function getWeekPlanDetail(h: DbHandles, cycleId: number, week: number, today = todayIso()) {
  const plan = executionRepo.findWeekPlan(h, cycleId, week);
  if (!plan) throw notFound(`Week ${week} plan`);
  const cycle = h.db.select().from(cyclesTable).where(eq(cyclesTable.id, cycleId)).get();
  if (!cycle) throw notFound("Cycle");
  const items = executionRepo.listWeekPlanItems(h, plan.id).map((item) => ({
    ...item,
    goal: item.tacticId ? goalContext(h, item.tacticId) : null,
  }));
  const score = weekScoreFor(h, cycleId, week, today);
  return {
    plan,
    weekStart: weekStart(cycle.startDate, week),
    weekEnd: weekEnd(cycle.startDate, week),
    items,
    score,
  };
}

function goalContext(h: DbHandles, tacticId: number) {
  const tactic = planRepo.getTactic(h, tacticId);
  if (!tactic) return null;
  const goal = planRepo.getGoal(h, tactic.goalId);
  if (!goal) return null;
  return { id: goal.id, title: goal.title, why: goal.why };
}

export function weekScoreFor(h: DbHandles, cycleId: number, week: number, today = todayIso()) {
  const cycle = h.db.select().from(cyclesTable).where(eq(cyclesTable.id, cycleId)).get();
  if (!cycle) throw notFound("Cycle");
  const { weekScore } = scoringModule;
  const tacticLikes = planRepo.listTacticsByCycle(h, cycleId).map((row) => toTacticLike(row));
  const completions = new Map<number, number>();
  for (const c of executionRepo.listCycleCompletions(h, cycleId)) {
    if (c.cycleWeek === week) completions.set(c.tacticId, (completions.get(c.tacticId) ?? 0) + 1);
  }
  const score = weekScore(tacticLikes, completions, week);
  if (!score) return null;
  const plan = executionRepo.findWeekPlan(h, cycleId, week);
  return {
    ...score,
    closed: plan?.status === "closed",
    projected: week === cycleWeekNumber(today, cycle.startDate) && plan?.status !== "closed",
  };
}

function requireDraftPlan(h: DbHandles, planId: number) {
  const plan = executionRepo.getWeekPlan(h, planId);
  if (!plan) throw notFound("Week plan");
  if (plan.status === "closed") throw conflict("This week is closed — closed weeks are immutable.");
  return plan;
}

export function moveItem(h: DbHandles, planId: number, itemId: number, patch: { dayOfWeek?: number; sortOrder?: number; label?: string }) {
  requireDraftPlan(h, planId);
  const item = executionRepo.getWeekPlanItem(h, itemId);
  if (!item || item.weekPlanId !== planId) throw notFound("Item");
  if (patch.dayOfWeek !== undefined && (patch.dayOfWeek < 0 || patch.dayOfWeek > 6)) throw invalid("dayOfWeek must be 0 (Mon) - 6 (Sun).");
  return executionRepo.updateWeekPlanItem(h, itemId, cleanUndefined(patch));
}

/** Ad-hoc items enter only as explicit plan revisions (process-control discipline). */
export function addPlanRevisionItem(h: DbHandles, planId: number, input: { label: string; dayOfWeek: number; confirmPlanRevision: boolean }) {
  requireDraftPlan(h, planId);
  if (!input.confirmPlanRevision) {
    throw conflict('Adding a non-plan item requires confirmPlanRevision: true — or link it to a goal as a tactic instead. The weekly plan stays strategic.');
  }
  if (!input.label?.trim()) throw invalid("Label is required.");
  if (input.dayOfWeek < 0 || input.dayOfWeek > 6) throw invalid("dayOfWeek must be 0 (Mon) - 6 (Sun).");
  const order = executionRepo.listWeekPlanItems(h, planId).length;
  return executionRepo.insertWeekPlanItem(h, {
    weekPlanId: planId,
    tacticId: null,
    label: input.label.trim(),
    dayOfWeek: input.dayOfWeek,
    done: 0,
    plannedCount: 1,
    sortOrder: order,
  });
}

export function removeItem(h: DbHandles, planId: number, itemId: number) {
  requireDraftPlan(h, planId);
  const item = executionRepo.getWeekPlanItem(h, itemId);
  if (!item || item.weekPlanId !== planId) throw notFound("Item");
  executionRepo.deleteWeekPlanItem(h, itemId);
}

/** Close = freeze. The score for this week becomes final; lag values are logged. */
export function closeWeek(
  h: DbHandles,
  planId: number,
  input: { reflection?: string; lagValues?: { goalId: number; value: number }[] },
  today = todayIso(),
) {
  const plan = requireDraftPlan(h, planId);
  const cycle = h.db.select().from(cyclesTable).where(eq(cyclesTable.id, plan.cycleId)).get();
  if (!cycle) throw notFound("Cycle");
  const currentWeek = cycleWeekNumber(today, cycle.startDate);
  if (plan.weekNumber > currentWeek) throw conflict("You can't close a week that hasn't happened yet.");
  const closed = executionRepo.closeWeekPlan(h, planId, today, input.reflection?.trim() || null);
  for (const lag of input.lagValues ?? []) {
    if (!Number.isFinite(lag.value)) throw invalid("Lag values must be numbers.");
    executionRepo.upsertLagLog(h, { goalId: lag.goalId, weekNumber: plan.weekNumber, value: lag.value, loggedAt: today });
  }
  return closed;
}

function cleanUndefined<T extends object>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out as Partial<T>;
}
