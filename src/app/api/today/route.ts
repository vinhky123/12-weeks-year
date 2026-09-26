import { handle, todayFrom } from "@/server/apiHelpers";
import { RuleError } from "@/server/ruleError";
import * as scoringService from "@/server/services/scoringService";

export async function GET(req: Request) {
  return handle(async (h) => {
    const view = scoringService.getTodayView(h, todayFrom(req));
    if (!view) throw new RuleError(404, "No active execution week today — start a cycle or generate this week's plan.");
    return view;
  });
}
