import { body, handle, todayFrom } from "@/server/apiHelpers";
import { BLOCK_CREATE_SCHEMA } from "@/lib/contracts";
import * as modelWeekService from "@/server/services/modelWeekService";

export async function GET() {
  return handle((h) => modelWeekService.getModelState(h));
}

export async function POST(req: Request) {
  return handle(async (h) => {
    modelWeekService.addBlock(h, await body(req, BLOCK_CREATE_SCHEMA), todayFrom(req));
    return modelWeekService.getModelState(h);
  });
}
