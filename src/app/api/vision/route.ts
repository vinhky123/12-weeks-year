import { body, handle, todayFrom } from "@/server/apiHelpers";
import { VISION_UPDATE_SCHEMA } from "@/lib/contracts";
import * as visionService from "@/server/services/visionService";

export async function GET() {
  return handle((h) => {
    const vision = visionService.getVision(h);
    return { vision: vision ? visionService.toVisionDto(vision) : null };
  });
}

export async function PUT(req: Request) {
  return handle(async (h) => {
    const vision = visionService.toVisionDto(visionService.updateVision(h, await body(req, VISION_UPDATE_SCHEMA), todayFrom(req)));
    return { vision };
  });
}
