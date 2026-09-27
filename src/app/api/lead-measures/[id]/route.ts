import { body, handle, numericParam } from "@/server/apiHelpers";
import { LEAD_MEASURE_CREATE_SCHEMA } from "@/lib/contracts";
import * as measuresService from "@/server/services/measuresService";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async (h) => measuresService.updateLeadMeasure(h, await numericParam(params), await body(req, LEAD_MEASURE_CREATE_SCHEMA.partial())));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async (h) => {
    await measuresService.removeLeadMeasure(h, await numericParam(params));
    return { ok: true };
  });
}
