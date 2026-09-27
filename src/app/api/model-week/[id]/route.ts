import { body, handle, numericParam } from "@/server/apiHelpers";
import { BLOCK_UPDATE_SCHEMA } from "@/lib/contracts";
import * as modelWeekService from "@/server/services/modelWeekService";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async (h) => {
    const id = await numericParam(params, "block id");
    modelWeekService.updateBlock(h, id, await body(req, BLOCK_UPDATE_SCHEMA));
    return modelWeekService.getModelState(h);
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async (h) => {
    const id = await numericParam(params, "block id");
    modelWeekService.removeBlock(h, id);
    return modelWeekService.getModelState(h);
  });
}
