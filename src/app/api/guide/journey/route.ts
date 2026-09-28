import { handle, todayFrom } from "@/server/apiHelpers";
import * as guideService from "@/server/services/guideService";

export async function GET(req: Request) {
  return handle((h) => ({ journey: guideService.getJourney(h, todayFrom(req)) }));
}
