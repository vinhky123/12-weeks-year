import { handle, numericParam, todayFrom } from "@/server/apiHelpers";
import * as cycleService from "@/server/services/cycleService";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async (h) => cycleService.archiveCycle(h, await numericParam(params), todayFrom(req)));
}
