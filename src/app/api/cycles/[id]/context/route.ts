import { handle, numericParam, todayFrom } from "@/server/apiHelpers";
import * as cycleService from "@/server/services/cycleService";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async (h) => cycleService.getCycleInfo(h, await numericParam(params, "cycle id"), todayFrom(req)));
}
