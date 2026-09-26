import { body, handle, todayFrom } from "@/server/apiHelpers";
import { LAG_LOG_CREATE_SCHEMA } from "@/lib/contracts";
import * as executionRepo from "@/server/db/repositories/execution";
import { notFound } from "@/server/ruleError";
import * as planRepo from "@/server/db/repositories/plan";

export async function POST(req: Request) {
  return handle(async (h) => {
    const input = await body(req, LAG_LOG_CREATE_SCHEMA);
    if (!planRepo.getGoal(h, input.goalId)) throw notFound("Goal");
    return executionRepo.upsertLagLog(h, { ...input, loggedAt: todayFrom(req) });
  });
}
