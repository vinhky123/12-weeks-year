import { eq } from "drizzle-orm";
import { cycleWeekNumber, todayIso } from "../cycleMath";
import type { DbHandles } from "../db/index";
import { cycles as cyclesTable } from "../db/schema";
import * as executionRepo from "../db/repositories/execution";
import * as planRepo from "../db/repositories/plan";
import { validateNewGoal, validateNewTactic, type GoalInput, type TacticInput } from "../planRules";
import { RuleError, invalid, notFound } from "../ruleError";
import { parseDuePattern } from "./cycleService";

export function toTacticLike(row: planRepo.TacticRow) {
  return {
    id: row.id,
    goalId: row.goalId,
    duePattern: parseDuePattern(row.duePattern),
    activeFromWeek: row.activeFromWeek,
    deactivatedAtWeek: row.deactivatedAtWeek,
  };
}

export function listTacticLikes(h: DbHandles, cycleId: number) {
  return planRepo.listTacticsByCycle(h, cycleId).map((row) => toTacticLike(row));
}

export function addGoal(h: DbHandles, cycleId: number, input: GoalInput, today = todayIso()) {
  const errors = validateNewGoal(planRepo.countActiveGoals(h, cycleId), input);
  if (errors.length > 0) throw invalid(errors.map((e) => e.message).join(" "), { errors });
  const order = planRepo.listGoals(h, cycleId).length;
  return planRepo.createGoal(h, {
    ...input,
    cycleId,
    deadlineWeek: input.deadlineWeek ?? 12,
    status: "active",
    sortOrder: order,
    createdAt: today,
  });
}

export function updateGoal(h: DbHandles, id: number, patch: Partial<GoalInput> & { status?: string }) {
  const goal = planRepo.getGoal(h, id);
  if (!goal) throw notFound("Goal");
  const merged = { ...goal, ...cleanUndefined(patch) };
  const othersActive = planRepo.countActiveGoals(h, goal.cycleId) - (goal.status === "active" ? 1 : 0);
  const errors = validateNewGoal(othersActive, {
    title: merged.title,
    why: merged.why,
    lagMetricName: merged.lagMetricName,
    lagUnit: merged.lagUnit,
    lagStart: merged.lagStart,
    lagTarget: merged.lagTarget,
    deadlineWeek: merged.deadlineWeek,
  });
  if (errors.length > 0) throw invalid(errors.map((e) => e.message).join(" "), { errors });
  return planRepo.updateGoal(h, id, { ...cleanUndefined(patch), deadlineWeek: merged.deadlineWeek });
}

/** Dropping is soft: the goal stops counting toward the vital few; its tactics freeze. */
export function dropGoal(h: DbHandles, id: number, today = todayIso()) {
  const goal = planRepo.getGoal(h, id);
  if (!goal) throw notFound("Goal");
  const dropped = planRepo.updateGoal(h, id, { status: "dropped" });
  const currentWeek = currentWeekOfCycle(h, goal.cycleId, today);
  for (const tactic of planRepo.listTacticsByGoal(h, id)) {
    if (tactic.deactivatedAtWeek === null) {
      planRepo.updateTactic(h, tactic.id, { deactivatedAtWeek: currentWeek });
    }
  }
  return dropped;
}

export function addTactic(h: DbHandles, goalId: number, input: TacticInput, today = todayIso()) {
  const goal = planRepo.getGoal(h, goalId);
  if (!goal) throw notFound("Goal");
  const errors = validateNewTactic(input);
  if (errors.length > 0) throw invalid(errors.map((e) => e.message).join(" "), { errors });
  const row = planRepo.createTactic(h, {
    goalId,
    text: input.text.trim(),
    duePattern: JSON.stringify(input.duePattern),
    keystone: 0,
    activeFromWeek: currentWeekOfCycle(h, goal.cycleId, today),
    deactivatedAtWeek: null,
    createdAt: today,
  });
  return toTacticDto(row);
}

/** DB row (JSON-string pattern, int keystone) -> contract DTO (parsed, boolean). */
export function toTacticDto(row: planRepo.TacticRow) {
  return { ...row, keystone: !!row.keystone, duePattern: parseDuePattern(row.duePattern) };
}

export function updateTactic(h: DbHandles, id: number, patch: { text?: string; duePattern?: TacticInput["duePattern"]; keystone?: boolean }) {
  const tactic = planRepo.getTactic(h, id);
  if (!tactic) throw notFound("Tactic");
  const updates: Record<string, unknown> = {};
  if (patch.text !== undefined) {
    const errors = validateNewTactic({ text: patch.text, duePattern: parseDuePattern(tactic.duePattern) });
    if (errors.length > 0) throw invalid("The tactic text doesn't meet the book's rules.", { errors });
    updates.text = patch.text.trim();
  }
  if (patch.keystone !== undefined) updates.keystone = patch.keystone ? 1 : 0;
  if (patch.duePattern !== undefined) {
    // Historical scores are immutable: once any week is closed, pattern changes
    // go through plan revision (deactivate + add a new tactic), not edits.
    if (cycleHasClosedWeeks(h, tactic.goalId)) {
      throw new RuleError(
        409,
        "This cycle has closed weeks — deactivate this tactic and add a new one instead. Plan revision keeps history honest.",
      );
    }
    const errors = validateNewTactic({ text: patch.text ?? tactic.text, duePattern: patch.duePattern });
    if (errors.length > 0) throw invalid("The due pattern doesn't meet the book's rules.", { errors });
    updates.duePattern = JSON.stringify(patch.duePattern);
  }
  if (Object.keys(updates).length === 0) return toTacticDto(tactic);
  return toTacticDto(planRepo.updateTactic(h, id, updates));
}

/** Plan-change integrity: deactivating applies from `fromWeek` (default: current week). */
export function deactivateTactic(h: DbHandles, id: number, fromWeek?: number, today = todayIso()) {
  const tactic = planRepo.getTactic(h, id);
  if (!tactic) throw notFound("Tactic");
  const goal = planRepo.getGoal(h, tactic.goalId);
  const effective = fromWeek ?? currentWeekOfCycle(h, goal!.cycleId, today);
  if (effective < 1 || effective > 12) throw invalid("fromWeek must be between 1 and 12.");
  return toTacticDto(planRepo.updateTactic(h, id, { deactivatedAtWeek: effective }));
}

// --- internals ---

function currentWeekOfCycle(h: DbHandles, cycleId: number, today: string): number {
  const cycle = h.db.select().from(cyclesTable).where(eq(cyclesTable.id, cycleId)).get();
  return cycle ? Math.max(1, Math.min(12, cycleWeekNumber(today, cycle.startDate))) : 1;
}

function cycleHasClosedWeeks(h: DbHandles, goalId: number): boolean {
  const goal = planRepo.getGoal(h, goalId);
  if (!goal) return false;
  return executionRepo.listWeekPlans(h, goal.cycleId).some((p) => p.status === "closed");
}

function cleanUndefined<T extends object>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out as Partial<T>;
}
