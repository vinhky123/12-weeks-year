import { getDb } from "@/server/db";
import { RuleError } from "@/server/ruleError";
import { backupFileName, exportAll } from "@/server/services/backupService";

/** Download the entire database as a versioned JSON backup. */
export async function GET() {
  try {
    const envelope = exportAll(getDb());
    return new Response(JSON.stringify(envelope, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="${backupFileName()}"`,
      },
    });
  } catch (error) {
    if (error instanceof RuleError) {
      return Response.json({ error: error.message, details: error.details }, { status: error.status });
    }
    throw error;
  }
}
