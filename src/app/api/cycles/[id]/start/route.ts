import { handle, numericParam } from "@/server/apiHelpers";
import * as cycleService from "@/server/services/cycleService";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async (h) => cycleService.startCycle(h, await numericParam(params)));
}
