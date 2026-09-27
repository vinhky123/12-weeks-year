import { handle, numericParam } from "@/server/apiHelpers";
import * as reviewService from "@/server/services/reviewService";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async (h) => reviewService.getCelebration(h, await numericParam(params)));
}
