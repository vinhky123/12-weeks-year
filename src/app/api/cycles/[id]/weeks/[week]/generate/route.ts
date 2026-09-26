import { handle, numericParam, todayFrom } from "@/server/apiHelpers";
import { RuleError } from "@/server/ruleError";
import * as weekPlanService from "@/server/services/weekPlanService";

export async function POST(req: Request, { params }: { params: Promise<{ id: string; week: string }> }) {
  return handle(async (h) => {
    const cycleId = await numericParam(params, "cycle id");
    const week = Number((await params).week);
    if (!Number.isInteger(week) || week < 1 || week > 12) throw new RuleError(400, `Invalid week: ${(await params).week}`);
    const today = todayFrom(req);
    const plan = weekPlanService.generateWeekPlan(h, cycleId, week, today);
    return weekPlanService.getWeekPlanDetail(h, cycleId, plan.weekNumber, today);
  });
}
