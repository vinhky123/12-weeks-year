import { eq, isNull } from "drizzle-orm";
import { todayIso } from "../cycleMath";
import type { DbHandles } from "../db/index";
import { visions } from "../db/schema";
import { RuleError } from "../ruleError";

export interface LifeDomain {
  area: string;
  note: string;
}

export interface VisionInput {
  longTerm?: string;
  threeYear?: string;
  cycleConnection?: string;
  lifeDomains?: LifeDomain[];
}

export type VisionRow = typeof visions.$inferSelect;

function parseDomains(json: string): LifeDomain[] {
  try {
    const parsed = JSON.parse(json) as LifeDomain[];
    return Array.isArray(parsed) ? parsed.filter((d) => d && typeof d.area === "string") : [];
  } catch {
    return [];
  }
}

export function toVisionDto(row: VisionRow) {
  return {
    id: row.id,
    longTerm: row.longTerm,
    threeYear: row.threeYear,
    cycleConnection: row.cycleConnection,
    lifeDomains: parseDomains(row.lifeDomains),
    cycleId: row.cycleId,
    updatedAt: row.updatedAt,
  };
}

/** The living vision (singleton, cycle_id NULL) — editable mid-cycle (D7). */
export function getVision(h: DbHandles): VisionRow | undefined {
  return h.db.select().from(visions).where(isNull(visions.cycleId)).get();
}

export function updateVision(h: DbHandles, patch: VisionInput, today = todayIso()) {
  if (patch.lifeDomains !== undefined && !Array.isArray(patch.lifeDomains)) {
    throw new RuleError(422, "lifeDomains must be an array of {area, note}.");
  }
  const clean = {
    longTerm: patch.longTerm?.trim() ?? "",
    threeYear: patch.threeYear?.trim() ?? "",
    cycleConnection: patch.cycleConnection?.trim() ?? "",
    lifeDomains: patch.lifeDomains ? JSON.stringify(patch.lifeDomains) : undefined,
  };
  const existing = getVision(h);
  if (existing) {
    return h.db
      .update(visions)
      .set({
        longTerm: clean.longTerm || existing.longTerm,
        threeYear: clean.threeYear || existing.threeYear,
        cycleConnection: clean.cycleConnection || existing.cycleConnection,
        ...(clean.lifeDomains !== undefined ? { lifeDomains: clean.lifeDomains } : {}),
        updatedAt: today,
      })
      .where(eq(visions.id, existing.id))
      .returning()
      .get()!;
  }
  return h.db
    .insert(visions)
    .values({
      longTerm: clean.longTerm,
      threeYear: clean.threeYear,
      cycleConnection: clean.cycleConnection,
      lifeDomains: clean.lifeDomains ?? "[]",
      cycleId: null,
      createdAt: today,
      updatedAt: today,
    })
    .returning()
    .get()!;
}

/**
 * D7: archive-time snapshot — copies the living vision into an immutable
 * cycle-stamped row so archived cycles keep the vision that ended them.
 * Idempotent: a cycle with a snapshot already keeps it.
 */
export function snapshotVisionForArchive(h: DbHandles, cycleId: number, today = todayIso()) {
  const existing = h.db.select().from(visions).where(eq(visions.cycleId, cycleId)).get();
  if (existing) return existing;
  const living = getVision(h);
  if (!living) return undefined;
  return h.db
    .insert(visions)
    .values({
      longTerm: living.longTerm,
      threeYear: living.threeYear,
      cycleConnection: living.cycleConnection,
      lifeDomains: living.lifeDomains,
      cycleId,
      createdAt: today,
      updatedAt: today,
    })
    .returning()
    .get()!;
}

/** Snapshot for an archived cycle, falling back to the living vision. */
export function getVisionForCycle(h: DbHandles, cycleId: number): VisionRow | undefined {
  return h.db.select().from(visions).where(eq(visions.cycleId, cycleId)).get() ?? getVision(h);
}
