import { handle, numericParam } from "@/server/apiHelpers";
import * as historyService from "@/server/services/historyService";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async (h) => historyService.getCycleDetail(h, await numericParam(params)));
}
