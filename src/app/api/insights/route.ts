import { handle } from "@/server/apiHelpers";
import * as historyService from "@/server/services/historyService";

export async function GET() {
  return handle((h) => historyService.getInsights(h));
}
