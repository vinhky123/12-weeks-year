import { handle, numericParam, todayFrom } from "@/server/apiHelpers";
import * as reviewService from "@/server/services/reviewService";

/** Explicitly finalize the saved review: the only way it becomes complete. Repeating it is safe. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async (h) => ({ review: reviewService.finalizeReview(h, await numericParam(params), todayFrom(req)) }));
}
