import { body, handle, todayFrom } from "@/server/apiHelpers";
import { COMPLETION_SCHEMA } from "@/lib/contracts";
import * as scoringService from "@/server/services/scoringService";

export async function POST(req: Request) {
  return handle(async (h) => scoringService.logCompletion(h, await body(req, COMPLETION_SCHEMA), todayFrom(req)));
}

/** Removes the most recent completion for the tactic-week (the honest undo). */
export async function DELETE(req: Request) {
  return handle(async (h) => scoringService.unlogCompletion(h, await body(req, COMPLETION_SCHEMA), todayFrom(req)));
}
