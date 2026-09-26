import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { todayIso } from "../cycleMath";
import * as schema from "./schema";

export const DEFAULT_DB_PATH = "data/app.db";

export type DbHandles = {
  sqlite: Database.Database;
  db: ReturnType<typeof drizzle<typeof schema>>;
};

/** Open (creating dirs as needed), apply pending migrations, bootstrap settings. */
export function createDb(dbPath = process.env.TWY_DB_PATH ?? DEFAULT_DB_PATH): DbHandles {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "drizzle" });
  db.insert(schema.settings)
    .values({ id: 1, createdAt: todayIso() })
    .onConflictDoNothing()
    .run();
  return { sqlite, db };
}

const cache = new Map<string, DbHandles>();

/** Cached per resolved path — tests point TWY_DB_PATH at a temp file per suite. */
export function getDb(dbPath = process.env.TWY_DB_PATH ?? DEFAULT_DB_PATH): DbHandles {
  const key = path.resolve(dbPath);
  let handles = cache.get(key);
  if (!handles) {
    handles = createDb(key);
    cache.set(key, handles);
  }
  return handles;
}

/** Test helper: drop cached handles so a deleted temp file isn't reused. */
export function closeDb(dbPath: string) {
  const key = path.resolve(dbPath);
  const handles = cache.get(key);
  if (handles) {
    handles.sqlite.close();
    cache.delete(key);
  }
}
