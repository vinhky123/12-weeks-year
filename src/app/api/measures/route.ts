import { handle, todayFrom } from "@/server/apiHelpers";
import { RuleError } from "@/server/ruleError";
import * as cyclesRepo from "@/server/db/repositories/cycles";
import * as measuresService from "@/server/services/measuresService";

export async function GET(req: Request) {
  return handle(async (h) => {
    const cycle = cyclesRepo.findActiveCycle(h) ?? cyclesRepo.listCycles(h).filter((c) => c.status !== "archived").at(-1);
    if (!cycle) throw new RuleError(404, "No cycle to measure yet — create one first.");
    return measuresService.getMeasuresOverview(h, cycle.id, todayFrom(req));
  });
}
