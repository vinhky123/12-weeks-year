import { body, handle, numericParam, todayFrom } from "@/server/apiHelpers";
import { ITEM_PATCH_SCHEMA } from "@/lib/contracts";
import type { DbHandles } from "@/server/db";
import * as executionRepo from "@/server/db/repositories/execution";
import { notFound } from "@/server/ruleError";
import * as weekPlanService from "@/server/services/weekPlanService";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  return handle(async (h) => {
    const planId = await numericParam(params, "id", "plan id");
    const itemId = await numericParam(params, "itemId", "item id");
    const patch = await body(req, ITEM_PATCH_SCHEMA);
    if ("done" in patch) weekPlanService.setExtraItemDone(h, planId, itemId, patch.done);
    else weekPlanService.moveItem(h, planId, itemId, patch);
    return detailFor(h, planId, todayFrom(req));
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  return handle(async (h) => {
    const planId = await numericParam(params, "id", "plan id");
    const itemId = await numericParam(params, "itemId", "item id");
    weekPlanService.removeItem(h, planId, itemId);
    return detailFor(h, planId, todayFrom(req));
  });
}

function detailFor(h: DbHandles, planId: number, today: string) {
  const plan = executionRepo.getWeekPlan(h, planId);
  if (!plan) throw notFound("Week plan");
  return weekPlanService.getWeekPlanDetail(h, plan.cycleId, plan.weekNumber, today);
}
