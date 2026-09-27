import { eq } from "drizzle-orm";
import { cycleWeekNumber, daysRemainingInExecution, nextMonday, todayIso, weekAndDayLabel } from "../cycleMath";
import type { DbHandles } from "../db/index";
import { settings as settingsTable } from "../db/schema";
import * as cyclesRepo from "../db/repositories/cycles";
import * as planRepo from "../db/repositories/plan";
import { RuleError, invalid, notFound } from "../ruleError";
import type { DuePattern } from "../scoring";
import { snapshotVisionForArchive } from "./visionService";

export type CyclePhase = "pre" | "execution" | "review" | "post";

export function listCycles(h: DbHandles) {
  return cyclesRepo.listCycles(h);
}

export function getCycle(h: DbHandles, id: number) {
  const cycle = cyclesRepo.getCycle(h, id);
  if (!cycle) throw notFound("Cycle");
  return cycle;
}

export function createCycle(h: DbHandles, input: { name: string; startDate?: string }, today = todayIso()) {
  if (!input.name?.trim()) throw invalid("Cycle name is required.");
  const startDate = input.startDate ?? nextMonday(today);
  // cycleMath validates the ISO format and calendar rollover
  cycleWeekNumber(startDate, startDate);
  return cyclesRepo.createCycle(h, { name: input.name.trim(), startDate, status: "planning", createdAt: today });
}

/** One active cycle at a time — archive the old year before starting a new one. */
export function startCycle(h: DbHandles, id: number) {
  const cycle = getCycle(h, id);
  if (cycle.status === "archived") throw new RuleError(409, "An archived cycle cannot be restarted — create a new one.");
  const active = cyclesRepo.findActiveCycle(h);
  if (active && active.id !== id) {
    throw new RuleError(409, `Cycle "${active.name}" is still active. Archive it first — one year at a time.`);
  }
  const started = cyclesRepo.updateCycle(h, id, { status: "active" });
  h.db.update(settingsTable).set({ currentCycleId: id }).where(eq(settingsTable.id, 1)).run();
  return started;
}

export function archiveCycle(h: DbHandles, id: number, today = todayIso()) {
  const cycle = getCycle(h, id);
  const archived = cyclesRepo.updateCycle(h, id, { status: "archived", archivedAt: cycle.archivedAt ?? today });
  snapshotVisionForArchive(h, id, today);
  const settingsRow = h.db.select().from(settingsTable).where(eq(settingsTable.id, 1)).get();
  if (settingsRow?.currentCycleId === id) {
    h.db.update(settingsTable).set({ currentCycleId: null }).where(eq(settingsTable.id, 1)).run();
  }
  return archived;
}

export function phaseFor(today: string, startDate: string): CyclePhase {
  const week = cycleWeekNumber(today, startDate);
  if (week === 0) return "pre";
  if (week >= 1 && week <= 12) return "execution";
  if (week === 13) return "review";
  return "post";
}

export function getActiveCycleInfo(h: DbHandles, today = todayIso()) {
  const cycle = cyclesRepo.findActiveCycle(h);
  if (!cycle) return null;
  const weekNumber = cycleWeekNumber(today, cycle.startDate);
  return {
    cycle,
    weekNumber,
    weekLabel: weekAndDayLabel(today, cycle.startDate),
    daysRemaining: daysRemainingInExecution(today, cycle.startDate),
    phase: phaseFor(today, cycle.startDate),
  };
}

export function getCycleDetail(h: DbHandles, id: number) {
  const cycle = getCycle(h, id);
  const goals = planRepo.listGoals(h, id).map((goal) => ({
    ...goal,
    tactics: planRepo.listTacticsByGoal(h, goal.id).map((t) => ({
      ...t,
      keystone: !!t.keystone,
      duePattern: parseDuePattern(t.duePattern),
    })),
  }));
  return { cycle, goals };
}

export function parseDuePattern(json: string): DuePattern {
  try {
    const parsed = JSON.parse(json) as DuePattern;
    if (parsed && (parsed.type === "EVERY_WEEK" || parsed.type === "SPECIFIC_WEEKS")) return parsed;
  } catch {
    // fall through
  }
  throw new RuleError(500, "Corrupted due pattern in database — re-create the tactic.");
}
