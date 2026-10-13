import { and, asc, desc, eq } from "drizzle-orm";
import type { DbHandles } from "../index";
import { completions, goals, lagLogs, tactics, weekPlanItems, weekPlans } from "../schema";

export type WeekPlanRow = typeof weekPlans.$inferSelect;
export type WeekPlanItemRow = typeof weekPlanItems.$inferSelect;
export type CompletionRow = typeof completions.$inferSelect;
export type LagLogRow = typeof lagLogs.$inferSelect;

// --- week plans ---

export function findWeekPlan({ db }: DbHandles, cycleId: number, weekNumber: number): WeekPlanRow | undefined {
  return db.select().from(weekPlans).where(and(eq(weekPlans.cycleId, cycleId), eq(weekPlans.weekNumber, weekNumber))).get();
}

export function createWeekPlan({ db }: DbHandles, values: typeof weekPlans.$inferInsert): WeekPlanRow {
  return db.insert(weekPlans).values(values).returning().get()!;
}

export function getWeekPlan({ db }: DbHandles, id: number): WeekPlanRow | undefined {
  return db.select().from(weekPlans).where(eq(weekPlans.id, id)).get();
}

export function closeWeekPlan({ db }: DbHandles, id: number, closedAt: string, reflection: string | null): WeekPlanRow {
  return db.update(weekPlans).set({ status: "closed", closedAt, reflection }).where(eq(weekPlans.id, id)).returning().get()!;
}

export function listWeekPlans({ db }: DbHandles, cycleId: number): WeekPlanRow[] {
  return db.select().from(weekPlans).where(eq(weekPlans.cycleId, cycleId)).orderBy(asc(weekPlans.weekNumber)).all();
}

// --- week plan items ---

export function listWeekPlanItems({ db }: DbHandles, weekPlanId: number): WeekPlanItemRow[] {
  return db.select().from(weekPlanItems).where(eq(weekPlanItems.weekPlanId, weekPlanId)).orderBy(asc(weekPlanItems.sortOrder), asc(weekPlanItems.id)).all();
}

export function getWeekPlanItem({ db }: DbHandles, id: number): WeekPlanItemRow | undefined {
  return db.select().from(weekPlanItems).where(eq(weekPlanItems.id, id)).get();
}

export function insertWeekPlanItem({ db }: DbHandles, values: typeof weekPlanItems.$inferInsert): WeekPlanItemRow {
  return db.insert(weekPlanItems).values(values).returning().get()!;
}

export function updateWeekPlanItem({ db }: DbHandles, id: number, values: Partial<typeof weekPlanItems.$inferInsert>): WeekPlanItemRow {
  return db.update(weekPlanItems).set(values).where(eq(weekPlanItems.id, id)).returning().get()!;
}

export function deleteWeekPlanItem({ db }: DbHandles, id: number): void {
  db.delete(weekPlanItems).where(eq(weekPlanItems.id, id)).run();
}

// --- completions ---

/** All completions of a cycle, joined through tactic -> goal. */
export function listCycleCompletions({ db }: DbHandles, cycleId: number): CompletionRow[] {
  const rows = db
    .select({ completion: completions })
    .from(completions)
    .innerJoin(tactics, eq(completions.tacticId, tactics.id))
    .innerJoin(goals, eq(tactics.goalId, goals.id))
    .where(eq(goals.cycleId, cycleId))
    .all();
  return rows.map((r) => r.completion);
}

export function listCompletionsForTacticWeek({ db }: DbHandles, tacticId: number, cycleWeek: number): CompletionRow[] {
  return db
    .select()
    .from(completions)
    .where(and(eq(completions.tacticId, tacticId), eq(completions.cycleWeek, cycleWeek)))
    .orderBy(desc(completions.id))
    .all();
}

export function listCompletionsForOccurrence({ db }: DbHandles, weekPlanItemId: number): CompletionRow[] {
  return db
    .select()
    .from(completions)
    .where(eq(completions.weekPlanItemId, weekPlanItemId))
    .orderBy(desc(completions.id))
    .all();
}

export function insertCompletion({ db }: DbHandles, values: typeof completions.$inferInsert): CompletionRow {
  return db.insert(completions).values(values).returning().get()!;
}

export function deleteCompletion({ db }: DbHandles, id: number): void {
  db.delete(completions).where(eq(completions.id, id)).run();
}

// --- lag logs ---

export function upsertLagLog({ db }: DbHandles, values: typeof lagLogs.$inferInsert): LagLogRow {
  const existing = db
    .select()
    .from(lagLogs)
    .where(and(eq(lagLogs.goalId, values.goalId), eq(lagLogs.weekNumber, values.weekNumber)))
    .get();
  if (existing) {
    return db.update(lagLogs).set({ value: values.value, loggedAt: values.loggedAt }).where(eq(lagLogs.id, existing.id)).returning().get()!;
  }
  return db.insert(lagLogs).values(values).returning().get()!;
}

export function listLagLogs({ db }: DbHandles, cycleId: number): LagLogRow[] {
  const rows = db
    .select({ log: lagLogs })
    .from(lagLogs)
    .innerJoin(goals, eq(lagLogs.goalId, goals.id))
    .where(eq(goals.cycleId, cycleId))
    .all();
  return rows.map((r) => r.log);
}
