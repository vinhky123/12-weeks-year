import fs from "node:fs";
import path from "node:path";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import { CYCLE_REVIEW_STATUSES } from "../../lib/contracts";
import { todayIso } from "../cycleMath";
import type { DbHandles } from "../db";
import * as schema from "../db/schema";
import { RuleError } from "../ruleError";
import { normalizeDraftPlanOccurrences } from "./occurrenceMigration";

const BACKUP_FORMAT = "12-week-year-local-backup";
const BACKUP_VERSION = 1;
const RETENTION = 5;

/** Child-first wipe/insert order (FK-safe). */
const TABLE_ORDER: { name: string; table: () => SQLiteTable; childrenFirst: boolean }[] = [
  { name: "completions", table: () => schema.completions, childrenFirst: true },
  { name: "week_plan_items", table: () => schema.weekPlanItems, childrenFirst: true },
  { name: "week_plans", table: () => schema.weekPlans, childrenFirst: true },
  { name: "lag_logs", table: () => schema.lagLogs, childrenFirst: true },
  { name: "lead_logs", table: () => schema.leadLogs, childrenFirst: true },
  { name: "lead_measures", table: () => schema.leadMeasures, childrenFirst: true },
  { name: "tactics", table: () => schema.tactics, childrenFirst: true },
  { name: "goals", table: () => schema.goals, childrenFirst: true },
  { name: "wam_reports", table: () => schema.wamReports, childrenFirst: true },
  { name: "cycle_reviews", table: () => schema.cycleReviews, childrenFirst: true },
  { name: "commitments", table: () => schema.commitments, childrenFirst: true },
  { name: "visions", table: () => schema.visions, childrenFirst: true },
  { name: "block_templates", table: () => schema.blockTemplates, childrenFirst: true },
  { name: "cycles", table: () => schema.cycles, childrenFirst: true },
  { name: "settings", table: () => schema.settings, childrenFirst: true },
];

export interface BackupEnvelope {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  data: Record<string, Record<string, unknown>[]>;
}

/** The backup directory lives next to the database file (temp-DB tests stay isolated). */
export function backupDirFor(dbPath: string): string {
  return path.join(path.dirname(dbPath), "backups");
}

function resolveDbPath(h: DbHandles): string {
  return (h.sqlite as unknown as { name?: string }).name ?? "data/app.db";
}

/**
 * v1 backups written before review finalization carry no status on their cycle_reviews rows. Those reviews
 * were already finished, so they import as complete. An explicit draft or complete is kept; any other value is
 * refused. Returns new rows — the caller's payload is not modified.
 */
function withReviewStatus(row: Record<string, unknown>): Record<string, unknown> {
  if (row.status === undefined) return { ...row, status: "complete" };
  if (!(CYCLE_REVIEW_STATUSES as readonly unknown[]).includes(row.status)) {
    throw new RuleError(422, `Unsupported review status in backup: ${JSON.stringify(row.status)} (expected "draft" or "complete").`);
  }
  return row;
}

function withReviewStatuses(data: BackupEnvelope["data"]): BackupEnvelope["data"] {
  const reviews = data.cycle_reviews;
  return Array.isArray(reviews) ? { ...data, cycle_reviews: reviews.map(withReviewStatus) } : data;
}

export function exportAll(h: DbHandles): BackupEnvelope {
  const data: Record<string, Record<string, unknown>[]> = {};
  for (const entry of TABLE_ORDER) {
    data[entry.name] = h.db.select().from(entry.table()).all() as Record<string, unknown>[];
  }
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data };
}

/**
 * Replace ALL data with the envelope's contents. Destructive: requires
 * confirm, and always snapshots the current state to an auto-backup first.
 * Rows keep their ids; the wipe is child-first, the insert parent-first,
 * all inside one transaction.
 */
export function importAll(h: DbHandles, payload: unknown, options: { confirm: boolean }) {
  if (!options.confirm) {
    throw new RuleError(409, "Import replaces all data — send confirm: true. A pre-import backup is written automatically.");
  }
  const envelope = payload as Partial<BackupEnvelope>;
  if (envelope?.format !== BACKUP_FORMAT) {
    throw new RuleError(422, `Unknown backup format — expected "${BACKUP_FORMAT}".`);
  }
  if (envelope.version !== BACKUP_VERSION) {
    throw new RuleError(422, `Unsupported backup version: ${String(envelope.version)} (supported: ${BACKUP_VERSION}).`);
  }
  // Validated up front: a rejected status must leave the database untouched and write no pre-import backup.
  const data = withReviewStatuses(envelope.data ?? {});

  writeAutoBackup(h, "pre-import");

  h.sqlite.transaction(() => {
    for (const entry of TABLE_ORDER) {
      if (entry.childrenFirst) h.db.delete(entry.table()).run();
    }
    for (const entry of [...TABLE_ORDER].reverse()) {
      const rows = (data[entry.name] ?? []) as Record<string, unknown>[];
      if (rows.length > 0) {
        h.db.insert(entry.table()).values(rows as never).run();
      }
    }
    normalizeDraftPlanOccurrences(h);
  })();

  return { counts: Object.fromEntries(TABLE_ORDER.map((e) => [e.name, (data[e.name] ?? []).length])) };
}

/** Best-effort local backup: never throws, keeps the newest RETENTION files. */
export function writeAutoBackup(h: DbHandles, label: string, dirOverride?: string): void {
  try {
    const dir = dirOverride ?? backupDirFor(resolveDbPath(h));
    fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const file = path.join(dir, `auto-backup-${stamp}-${label.replace(/[^a-zA-Z0-9_-]/g, "")}.json`);
    fs.writeFileSync(file, JSON.stringify(exportAll(h)));
    // rolling retention
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith("auto-backup-") && f.endsWith(".json"))
      .sort()
      .reverse();
    for (const old of files.slice(RETENTION)) {
      fs.rmSync(path.join(dir, old), { force: true });
    }
  } catch (error) {
    console.warn("[backup] auto-backup skipped:", error instanceof Error ? error.message : error);
  }
}

export function listBackups(h: DbHandles): { file: string; sizeBytes: number; createdAt: string }[] {
  try {
    const dir = backupDirFor(resolveDbPath(h));
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((f) => f.startsWith("auto-backup-") && f.endsWith(".json"))
      .map((f) => {
        const stat = fs.statSync(path.join(dir, f));
        return { file: f, sizeBytes: stat.size, createdAt: stat.mtime.toISOString() };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.file.localeCompare(a.file));
  } catch {
    return [];
  }
}

export function backupFileName(today = todayIso()): string {
  return `12-week-year-backup-${today}.json`;
}
