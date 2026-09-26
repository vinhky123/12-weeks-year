import { body, handle } from "@/server/apiHelpers";
import { CYCLE_CREATE_SCHEMA } from "@/lib/contracts";
import * as cycleService from "@/server/services/cycleService";

export async function GET() {
  return handle((h) => cycleService.listCycles(h));
}

export async function POST(req: Request) {
  return handle(async (h) => cycleService.createCycle(h, await body(req, CYCLE_CREATE_SCHEMA)));
}
