import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

export const DEFAULT_DB_PATH = "data/app.db";

/** Open (creating dirs as needed), apply pending migrations, return handles. */
export function createDb(dbPath = process.env.TWY_DB_PATH ?? DEFAULT_DB_PATH) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "drizzle" });
  return { sqlite, db };
}

let instance: ReturnType<typeof createDb> | null = null;

/** Process-wide singleton (one local user, one app process). */
export function getDb() {
  instance ??= createDb();
  return instance;
}
