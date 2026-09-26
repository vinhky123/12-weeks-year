import { body, handle, numericParam, todayFrom } from "@/server/apiHelpers";
import { CLOSE_WEEK_SCHEMA } from "@/lib/contracts";
import * as executionRepo from "@/server/db/repositories/execution";
import { notFound } from "@/server/ruleError";
import * as weekPlanService from "@/server/services/weekPlanService";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async (h) => {
    const planId = await numericParam(params, "plan id");
    weekPlanService.closeWeek(h, planId, await body(req, CLOSE_WEEK_SCHEMA), todayFrom(req));
    const plan = executionRepo.getWeekPlan(h, planId);
    if (!plan) throw notFound("Week plan");
    return weekPlanService.getWeekPlanDetail(h, plan.cycleId, plan.weekNumber, todayFrom(req));
  });
}
