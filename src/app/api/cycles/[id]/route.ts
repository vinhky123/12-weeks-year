import { handle, numericParam } from "@/server/apiHelpers";
import * as cycleService from "@/server/services/cycleService";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async (h) => cycleService.getCycleDetail(h, await numericParam(params)));
}
