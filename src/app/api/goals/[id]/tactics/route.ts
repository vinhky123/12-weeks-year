import { body, handle, numericParam, todayFrom } from "@/server/apiHelpers";
import { TACTIC_CREATE_SCHEMA } from "@/lib/contracts";
import * as planService from "@/server/services/planService";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async (h) => {
    const goalId = await numericParam(params, "goal id");
    return planService.addTactic(h, goalId, await body(req, TACTIC_CREATE_SCHEMA), todayFrom(req));
  });
}
