import { body, handle } from "@/server/apiHelpers";
import { SETTINGS_UPDATE_SCHEMA } from "@/lib/contracts";
import * as settingsService from "@/server/services/settingsService";

export async function GET() {
  return handle((h) => ({ settings: settingsService.getSettings(h) }));
}

export async function PATCH(req: Request) {
  return handle(async (h) => ({ settings: settingsService.updateSettings(h, await body(req, SETTINGS_UPDATE_SCHEMA)) }));
}
