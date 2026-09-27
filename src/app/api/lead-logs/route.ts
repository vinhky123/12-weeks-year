import { body, handle, todayFrom } from "@/server/apiHelpers";
import { LEAD_LOG_CREATE_SCHEMA } from "@/lib/contracts";
import * as measuresService from "@/server/services/measuresService";

export async function POST(req: Request) {
  return handle(async (h) => measuresService.logLead(h, await body(req, LEAD_LOG_CREATE_SCHEMA), todayFrom(req)));
}
