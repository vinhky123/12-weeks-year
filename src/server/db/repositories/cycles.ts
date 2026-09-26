import { eq } from "drizzle-orm";
import type { DbHandles } from "../index";
import { cycles } from "../schema";

export type CycleRow = typeof cycles.$inferSelect;

export function listCycles({ db }: DbHandles): CycleRow[] {
  return db.select().from(cycles).all();
}

export function getCycle({ db }: DbHandles, id: number): CycleRow | undefined {
  return db.select().from(cycles).where(eq(cycles.id, id)).get();
}

export function findActiveCycle({ db }: DbHandles): CycleRow | undefined {
  return db.select().from(cycles).where(eq(cycles.status, "active")).get();
}

export function createCycle({ db }: DbHandles, values: typeof cycles.$inferInsert): CycleRow {
  return db.insert(cycles).values(values).returning().get()!;
}

export function updateCycle({ db }: DbHandles, id: number, values: Partial<typeof cycles.$inferInsert>): CycleRow {
  return db.update(cycles).set(values).where(eq(cycles.id, id)).returning().get()!;
}
