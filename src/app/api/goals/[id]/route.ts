import { body, handle, numericParam } from "@/server/apiHelpers";
import { GOAL_UPDATE_SCHEMA } from "@/lib/contracts";
import * as planService from "@/server/services/planService";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async (h) => planService.updateGoal(h, await numericParam(params), await body(req, GOAL_UPDATE_SCHEMA)));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async (h) => planService.dropGoal(h, await numericParam(params)));
}
