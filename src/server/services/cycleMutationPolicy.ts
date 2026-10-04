import type { DbHandles } from "../db/index";
import * as cyclesRepo from "../db/repositories/cycles";
import { conflict, notFound } from "../ruleError";

export function requireMutableCycle(h: DbHandles, cycleId: number) {
  const cycle = cyclesRepo.getCycle(h, cycleId);
  if (!cycle) throw notFound("Cycle");
  if (cycle.status === "archived") {
    throw conflict("This cycle is archived — archived cycles are immutable.");
  }
  return cycle;
}
