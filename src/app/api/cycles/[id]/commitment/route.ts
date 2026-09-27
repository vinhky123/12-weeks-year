import { body, handle, numericParam } from "@/server/apiHelpers";
import { COMMITMENT_SCHEMA } from "@/lib/contracts";
import * as historyService from "@/server/services/historyService";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async (h) => {
    const commitment = historyService.getCommitment(h, await numericParam(params));
    return { commitment };
  });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async (h) => {
    const commitment = historyService.setCommitment(h, await numericParam(params), await body(req, COMMITMENT_SCHEMA));
    return { commitment };
  });
}
