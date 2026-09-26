import { handle, todayFrom } from "@/server/apiHelpers";
import * as scoringService from "@/server/services/scoringService";

export async function GET(req: Request) {
  return handle((h) => scoringService.buildDashboard(h, todayFrom(req)));
}
