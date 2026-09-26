import { body, handle, numericParam, todayFrom } from "@/server/apiHelpers";
import { GOAL_CREATE_SCHEMA } from "@/lib/contracts";
import * as planService from "@/server/services/planService";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async (h) => {
    const cycleId = await numericParam(params);
    return planService.addGoal(h, cycleId, await body(req, GOAL_CREATE_SCHEMA), todayFrom(req));
  });
}
