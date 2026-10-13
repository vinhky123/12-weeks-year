import { eq } from "drizzle-orm";
import type { DbHandles } from "../db";
import * as executionRepo from "../db/repositories/execution";
import * as planRepo from "../db/repositories/plan";
import { weekPlans } from "../db/schema";
import { dueForWeek } from "../scoring";
import { parseDuePattern } from "./cycleService";

/** Convert legacy bundled counts and reconcile draft rows against completion history. */
export function normalizeDraftPlanOccurrences(h: DbHandles): { plansChanged: number; itemsAdded: number } {
  const plans = h.db.select().from(weekPlans).where(eq(weekPlans.status, "draft")).all();
  let plansChanged = 0;
  let itemsAdded = 0;

  for (const plan of plans) {
    const added = h.sqlite.transaction(() => {
      let changed = false;
      let addedCount = 0;
      let rowsAdded = false;
      const items = executionRepo.listWeekPlanItems(h, plan.id);
      const tactics = planRepo.listTacticsByCycle(h, plan.cycleId);
      const tacticsById = new Map(tactics.map((tactic) => [tactic.id, tactic]));
      const byTactic = new Map<number, typeof items>();
      for (const item of items) {
        if (item.tacticId === null) continue;
        const group = byTactic.get(item.tacticId) ?? [];
        group.push(item);
        byTactic.set(item.tacticId, group);
      }

      const tacticIds = new Set([...tacticsById.keys(), ...byTactic.keys()]);
      for (const tacticId of tacticIds) {
        const tactic = tacticsById.get(tacticId);
        const existing = byTactic.get(tacticId) ?? [];
        const history = executionRepo.listCompletionsForTacticWeek(h, tacticId, plan.weekNumber);
        const linkedIds = new Set(history.flatMap((row) => row.weekPlanItemId === null ? [] : [row.weekPlanItemId]));
        for (const item of existing) {
          if (!Number.isInteger(item.plannedCount) || item.plannedCount < 1 ||
            !Number.isInteger(item.done) || item.done < 0) {
            throw new Error(`Invalid occurrence count on week plan item ${item.id}.`);
          }
        }
        const storedDone = existing.reduce((sum, item) => sum + item.done, 0);
        if (existing.some((item) => item.done > item.plannedCount) && history.length < storedDone) {
          const overflowingItem = existing.find((item) => item.done > item.plannedCount)!;
          throw new Error(`Invalid occurrence count on week plan item ${overflowingItem.id}.`);
        }

        const due = tactic ? dueForWeek({
          id: tactic.id,
          goalId: tactic.goalId,
          duePattern: parseDuePattern(tactic.duePattern),
          activeFromWeek: tactic.activeFromWeek,
          deactivatedAtWeek: tactic.deactivatedAtWeek,
        }, plan.weekNumber) : 0;
        const plannedSlots = existing.reduce((sum, item) => sum + item.plannedCount, 0);
        // The completion log and item.done describe the same work. Take the larger total,
        // never add them; this keeps linked completions from being counted twice.
        const completedCount = Math.max(storedDone, history.length, linkedIds.size);
        if (existing.length === 0 && history.length === 0) continue;
        const desiredSlots = existing.length === 0 && history.length > 0
          ? Math.max(due, completedCount)
          : Math.max(plannedSlots, completedCount);
        const targetSlots = Math.max(plannedSlots, desiredSlots);
        if (targetSlots === 0) continue;

        const insertedIds: number[] = [];
        let extraSlots = targetSlots - plannedSlots;
        if (existing.length === 0) {
          const currentItems = executionRepo.listWeekPlanItems(h, plan.id);
          const sortOrder = currentItems.reduce((max, item) => Math.max(max, item.sortOrder), -1) + 1;
          for (let index = 0; index < targetSlots; index += 1) {
            const inserted = executionRepo.insertWeekPlanItem(h, {
              weekPlanId: plan.id,
              tacticId,
              label: tactic?.text ?? "",
              dayOfWeek: 0,
              done: 0,
              plannedCount: 1,
              sortOrder: sortOrder + index,
            });
            insertedIds.push(inserted.id);
          }
          addedCount += targetSlots;
          rowsAdded = true;
          changed = true;
        } else {
          for (const item of existing) {
            for (let occurrence = 1; occurrence < item.plannedCount; occurrence += 1) {
              const inserted = executionRepo.insertWeekPlanItem(h, {
                weekPlanId: plan.id,
                tacticId,
                label: item.label,
                dayOfWeek: item.dayOfWeek,
                done: 0,
                plannedCount: 1,
                sortOrder: item.sortOrder,
              });
              insertedIds.push(inserted.id);
            }
          }
          extraSlots = targetSlots - plannedSlots;
          if (extraSlots > 0) {
            const source = existing.at(-1)!;
            for (let index = 0; index < extraSlots; index += 1) {
              const inserted = executionRepo.insertWeekPlanItem(h, {
                weekPlanId: plan.id,
                tacticId,
                label: source.label,
                dayOfWeek: source.dayOfWeek,
                done: 0,
                plannedCount: 1,
                sortOrder: source.sortOrder,
              });
              insertedIds.push(inserted.id);
            }
          }
          addedCount += insertedIds.length;
          if (insertedIds.length > 0) {
            rowsAdded = true;
            changed = true;
          }
        }

        const occurrenceRows = executionRepo.listWeekPlanItems(h, plan.id).filter((item) => item.tacticId === tacticId);
        const completedIds = new Set<number>([
          ...occurrenceRows.filter((item) => item.done > 0).map((item) => item.id),
          ...linkedIds,
        ]);
        for (const item of occurrenceRows) {
          if (completedIds.size >= completedCount) break;
          completedIds.add(item.id);
        }
        for (const item of occurrenceRows) {
          const done = completedIds.has(item.id) ? 1 : 0;
          if (item.plannedCount !== 1 || item.done !== done) {
            executionRepo.updateWeekPlanItem(h, item.id, { plannedCount: 1, done });
            changed = true;
          }
        }
      }

      // Stable sorting leaves original manual rows in relative order and compacts any
      // duplicate legacy order values introduced by bundled rows.
      if (rowsAdded) {
        executionRepo.listWeekPlanItems(h, plan.id).forEach((item, sortOrder) => {
          if (item.sortOrder !== sortOrder) {
            executionRepo.updateWeekPlanItem(h, item.id, { sortOrder });
            changed = true;
          }
        });
      }
      return { addedCount, changed };
    })();

    if (added.changed) plansChanged += 1;
    itemsAdded += added.addedCount;
  }

  return { plansChanged, itemsAdded };
}
