import { handle } from "@/server/apiHelpers";
import * as backupService from "@/server/services/backupService";

export async function GET() {
  return handle((h) => ({ backups: backupService.listBackups(h) }));
}
