import { body, handle, numericParam } from "@/server/apiHelpers";
import { REVIEW_SAVE_SCHEMA } from "@/lib/contracts";
import * as reviewService from "@/server/services/reviewService";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async (h) => reviewService.getReview(h, await numericParam(params)));
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async (h) => {
    const review = reviewService.saveReview(h, await numericParam(params), await body(req, REVIEW_SAVE_SCHEMA));
    return { review };
  });
}
