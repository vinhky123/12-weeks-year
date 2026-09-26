import { body, handle, numericParam, todayFrom } from "@/server/apiHelpers";
import { ADD_PLAN_ITEM_SCHEMA } from "@/lib/contracts";
import * as executionRepo from "@/server/db/repositories/execution";
import { notFound } from "@/server/ruleError";
import * as weekPlanService from "@/server/services/weekPlanService";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async (h) => {
    const planId = await numericParam(params, "plan id");
    weekPlanService.addPlanRevisionItem(h, planId, await body(req, ADD_PLAN_ITEM_SCHEMA));
    const plan = executionRepo.getWeekPlan(h, planId);
    if (!plan) throw notFound("Week plan");
    return weekPlanService.getWeekPlanDetail(h, plan.cycleId, plan.weekNumber, todayFrom(req));
  });
}
