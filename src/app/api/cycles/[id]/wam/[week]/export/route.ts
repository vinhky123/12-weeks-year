import { numericParam } from "@/server/apiHelpers";
import { getDb } from "@/server/db";
import { RuleError } from "@/server/ruleError";
import * as wamService from "@/server/services/wamService";

/** One-click Markdown export of the weekly accountability report. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; week: string }> }) {
  try {
    const cycleId = await numericParam(params, "cycle id");
    const week = Number((await params).week);
    const markdown = wamService.exportWamMarkdown(getDb(), cycleId, week);
    return new Response(markdown, {
      headers: { "content-type": "text/markdown; charset=utf-8", "content-disposition": `attachment; filename="wam-week-${week}.md"` },
    });
  } catch (error) {
    if (error instanceof RuleError) {
      return Response.json({ error: error.message, details: error.details }, { status: error.status });
    }
    throw error;
  }
}
