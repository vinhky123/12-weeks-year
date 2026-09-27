import { handle, numericParam } from "@/server/apiHelpers";
import * as visionService from "@/server/services/visionService";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async (h) => {
    const cycleId = await numericParam(params);
    const vision = visionService.getVisionForCycle(h, cycleId);
    return { vision: vision ? visionService.toVisionDto(vision) : null };
  });
}
