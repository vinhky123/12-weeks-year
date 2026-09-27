import { body, handle, numericParam } from "@/server/apiHelpers";
import { WAM_SAVE_SCHEMA } from "@/lib/contracts";
import { RuleError } from "@/server/ruleError";
import * as wamService from "@/server/services/wamService";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; week: string }> }) {
  return handle(async (h) => {
    const cycleId = await numericParam(params, "cycle id");
    const week = Number((await params).week);
    if (!Number.isInteger(week)) throw new RuleError(400, `Invalid week`);
    return wamService.getWam(h, cycleId, week);
  });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; week: string }> }) {
  return handle(async (h) => {
    const cycleId = await numericParam(params, "cycle id");
    const week = Number((await params).week);
    if (!Number.isInteger(week)) throw new RuleError(400, `Invalid week`);
    wamService.saveWam(h, cycleId, week, await body(req, WAM_SAVE_SCHEMA));
    return wamService.getWam(h, cycleId, week); // full view: report + live auto data
  });
}
