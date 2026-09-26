import { and, asc, eq } from "drizzle-orm";
import type { DbHandles } from "../index";
import { goals, tactics } from "../schema";

export type GoalRow = typeof goals.$inferSelect;
export type TacticRow = typeof tactics.$inferSelect;

export function listGoals({ db }: DbHandles, cycleId: number): GoalRow[] {
  return db.select().from(goals).where(eq(goals.cycleId, cycleId)).orderBy(asc(goals.sortOrder), asc(goals.id)).all();
}

export function countActiveGoals({ db }: DbHandles, cycleId: number): number {
  return db.select({ id: goals.id }).from(goals).where(and(eq(goals.cycleId, cycleId), eq(goals.status, "active"))).all().length;
}

export function getGoal({ db }: DbHandles, id: number): GoalRow | undefined {
  return db.select().from(goals).where(eq(goals.id, id)).get();
}

export function createGoal({ db }: DbHandles, values: typeof goals.$inferInsert): GoalRow {
  return db.insert(goals).values(values).returning().get()!;
}

export function updateGoal({ db }: DbHandles, id: number, values: Partial<typeof goals.$inferInsert>): GoalRow {
  return db.update(goals).set(values).where(eq(goals.id, id)).returning().get()!;
}

export function listTacticsByCycle({ db }: DbHandles, cycleId: number): TacticRow[] {
  const rows = db
    .select({ tactic: tactics })
    .from(tactics)
    .innerJoin(goals, eq(tactics.goalId, goals.id))
    .where(eq(goals.cycleId, cycleId))
    .orderBy(asc(tactics.id))
    .all();
  return rows.map((r) => r.tactic);
}

export function listTacticsByGoal({ db }: DbHandles, goalId: number): TacticRow[] {
  return db.select().from(tactics).where(eq(tactics.goalId, goalId)).orderBy(asc(tactics.id)).all();
}

export function getTactic({ db }: DbHandles, id: number): TacticRow | undefined {
  return db.select().from(tactics).where(eq(tactics.id, id)).get();
}

export function createTactic({ db }: DbHandles, values: typeof tactics.$inferInsert): TacticRow {
  return db.insert(tactics).values(values).returning().get()!;
}

export function updateTactic({ db }: DbHandles, id: number, values: Partial<typeof tactics.$inferInsert>): TacticRow {
  return db.update(tactics).set(values).where(eq(tactics.id, id)).returning().get()!;
}
