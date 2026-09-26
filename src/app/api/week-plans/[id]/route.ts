import { handle, numericParam, todayFrom } from "@/server/apiHelpers";
import { notFound } from "@/server/ruleError";
import * as executionRepo from "@/server/db/repositories/execution";
import * as weekPlanService from "@/server/services/weekPlanService";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async (h) => {
    const id = await numericParam(params, "plan id");
    const plan = executionRepo.getWeekPlan(h, id);
    if (!plan) throw notFound("Week plan");
    return weekPlanService.getWeekPlanDetail(h, plan.cycleId, plan.weekNumber, todayFrom(req));
  });
}
