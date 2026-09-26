import { NextResponse } from "next/server";
import { z } from "zod";
import { todayIso } from "./cycleMath";
import type { DbHandles } from "./db";
import { getDb } from "./db";
import { RuleError } from "./ruleError";

/**
 * Wrap a route handler: opens the local DB, maps RuleError -> HTTP status +
 * ApiError shape, zod failures -> 400, everything else -> 500.
 */
export async function handle(fn: (h: DbHandles) => unknown): Promise<Response> {
  try {
    const data = await fn(getDb());
    return NextResponse.json(data ?? { ok: true });
  } catch (error) {
    if (error instanceof RuleError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body.", details: { issues: error.issues.map((i) => ({ path: i.path, message: i.message })) } },
        { status: 400 },
      );
    }
    console.error("[api]", error);
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

export async function body<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  const raw = await req.json().catch(() => {
    throw new RuleError(400, "Request body must be valid JSON.");
  });
  return schema.parse(raw);
}

/**
 * "Today" for a request. The optional x-twy-today header is a local testing /
 * demo hook (time travel); the UI never sends it.
 */
export function todayFrom(req: Request): string {
  return req.headers.get("x-twy-today") ?? todayIso();
}

export async function numericParam(params: Promise<{ id: string }>, label = "id"): Promise<number> {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n) || n < 1) throw new RuleError(400, `Invalid ${label}: ${id}`);
  return n;
}
