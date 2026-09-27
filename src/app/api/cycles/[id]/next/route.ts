import { body, handle, numericParam } from "@/server/apiHelpers";
import { NEXT_CYCLE_CREATE_SCHEMA } from "@/lib/contracts";
import * as reviewService from "@/server/services/reviewService";

/** Week-13 reload: archive the old year, open the next one with carried goals. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async (h) => reviewService.startNextCycle(h, await numericParam(params), await body(req, NEXT_CYCLE_CREATE_SCHEMA)));
}
