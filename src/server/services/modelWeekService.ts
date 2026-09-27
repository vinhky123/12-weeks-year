import { eq, isNull, or } from "drizzle-orm";
import { todayIso } from "../cycleMath";
import type { DbHandles } from "../db/index";
import { blockTemplates } from "../db/schema";
import { RuleError, invalid } from "../ruleError";
import { validateModelWeek, type BlockTypeLike } from "../modelWeekRules";

export type BlockRow = typeof blockTemplates.$inferSelect;

const BLOCK_TYPES: BlockTypeLike[] = ["STRATEGIC", "BUFFER", "BREAKOUT", "PLANNING", "WAM"];

export function listBlocks(h: DbHandles, cycleId?: number | null): BlockRow[] {
  const rows = cycleId
    ? h.db.select().from(blockTemplates).where(or(isNull(blockTemplates.cycleId), eq(blockTemplates.cycleId, cycleId))).all()
    : h.db.select().from(blockTemplates).all();
  return rows.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startMinute - b.startMinute);
}

export function getModelState(h: DbHandles, cycleId?: number | null) {
  const blocks = listBlocks(h, cycleId);
  return { blocks, warnings: validateModelWeek(blocks.map((b) => ({ type: b.type as BlockTypeLike, durationMinutes: b.durationMinutes }))) };
}

export function addBlock(
  h: DbHandles,
  input: { type: BlockTypeLike; dayOfWeek: number; startMinute: number; durationMinutes: number; label?: string },
  today = todayIso(),
): BlockRow {
  validateBlockInput(input);
  return h.db
    .insert(blockTemplates)
    .values({
      cycleId: null,
      type: input.type,
      dayOfWeek: input.dayOfWeek,
      startMinute: input.startMinute,
      durationMinutes: input.durationMinutes,
      label: input.label?.trim() || null,
      createdAt: today,
    })
    .returning()
    .get()!;
}

export function updateBlock(
  h: DbHandles,
  id: number,
  patch: { type?: BlockTypeLike; dayOfWeek?: number; startMinute?: number; durationMinutes?: number; label?: string },
): BlockRow {
  const block = h.db.select().from(blockTemplates).where(eq(blockTemplates.id, id)).get();
  if (!block) throw new RuleError(404, "Block not found.");
  const merged = { ...block, ...patch };
  validateBlockInput(merged);
  return h.db.update(blockTemplates).set({ ...patch, label: patch.label?.trim() || null }).where(eq(blockTemplates.id, id)).returning().get()!;
}

export function removeBlock(h: DbHandles, id: number): void {
  const result = h.db.delete(blockTemplates).where(eq(blockTemplates.id, id)).run();
  if (result.changes === 0) throw new RuleError(404, "Block not found.");
}

function validateBlockInput(input: { type: string; dayOfWeek: number; startMinute: number; durationMinutes: number }) {
  if (!BLOCK_TYPES.includes(input.type as BlockTypeLike)) {
    throw invalid(`type must be one of ${BLOCK_TYPES.join(", ")}.`);
  }
  if (!Number.isInteger(input.dayOfWeek) || input.dayOfWeek < 0 || input.dayOfWeek > 6) {
    throw invalid("dayOfWeek must be 0 (Mon) - 6 (Sun).");
  }
  if (!Number.isInteger(input.startMinute) || input.startMinute < 0 || input.startMinute > 1439) {
    throw invalid("startMinute must be 0-1439 (minutes from midnight).");
  }
  if (!Number.isInteger(input.durationMinutes) || input.durationMinutes < 15 || input.durationMinutes > 480) {
    throw invalid("durationMinutes must be 15-480.");
  }
}
