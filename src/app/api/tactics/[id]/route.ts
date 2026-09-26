import { body, handle, numericParam, todayFrom } from "@/server/apiHelpers";
import { TACTIC_UPDATE_SCHEMA } from "@/lib/contracts";
import { RuleError } from "@/server/ruleError";
import * as planService from "@/server/services/planService";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async (h) => planService.updateTactic(h, await numericParam(params), await body(req, TACTIC_UPDATE_SCHEMA)));
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async (h) => {
    const id = await numericParam(params);
    const fromWeekRaw = new URL(req.url).searchParams.get("fromWeek");
    const fromWeek = fromWeekRaw === null ? undefined : Number(fromWeekRaw);
    if (fromWeek !== undefined && (!Number.isInteger(fromWeek) || fromWeek < 1 || fromWeek > 12)) {
      throw new RuleError(400, `Invalid fromWeek: ${fromWeekRaw}`);
    }
    return planService.deactivateTactic(h, id, fromWeek, todayFrom(req));
  });
}
