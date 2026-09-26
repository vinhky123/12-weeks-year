import { handle, todayFrom } from "@/server/apiHelpers";
import { RuleError } from "@/server/ruleError";
import * as cycleService from "@/server/services/cycleService";

export async function GET(req: Request) {
  return handle(async (h) => {
    const info = cycleService.getActiveCycleInfo(h, todayFrom(req));
    if (!info) throw new RuleError(404, "No active cycle.");
    return info;
  });
}
