import { handle, numericParam, todayFrom } from "@/server/apiHelpers";
import * as scoringService from "@/server/services/scoringService";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async (h) => scoringService.getCycleScores(h, await numericParam(params), todayFrom(req)));
}
