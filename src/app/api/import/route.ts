import { body, handle } from "@/server/apiHelpers";
import { IMPORT_SCHEMA } from "@/lib/contracts";
import * as backupService from "@/server/services/backupService";

/** Replace all data from a backup file. Destructive: requires confirm; pre-import snapshot is automatic. */
export async function POST(req: Request) {
  return handle(async (h) => {
    const { payload, confirm } = await body(req, IMPORT_SCHEMA);
    const result = backupService.importAll(h, payload, { confirm });
    return { ok: true, counts: result.counts };
  });
}
