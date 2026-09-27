import { body, handle, numericParam, todayFrom } from "@/server/apiHelpers";
import { LEAD_MEASURE_CREATE_SCHEMA } from "@/lib/contracts";
import * as measuresService from "@/server/services/measuresService";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async (h) => {
    const goalId = await numericParam(params, "goal id");
    return measuresService.addLeadMeasure(h, goalId, await body(req, LEAD_MEASURE_CREATE_SCHEMA), todayFrom(req));
  });
}
