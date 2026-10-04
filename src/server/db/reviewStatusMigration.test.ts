import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CYCLE_REVIEW_STATUSES } from "../../lib/contracts";
import { createDb, type DbHandles } from "./index";
import { cycleReviews, cycles } from "./schema";

const MIGRATIONS = path.resolve("drizzle");
const REVIEW_STATUS_TAG = "0004_review_status";

type Journal = { entries: { idx: number; tag: string; when: number }[] };

let tmpDir: string;
let opened: Database.Database[];

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "twy-review-status-migration-"));
  opened = [];
});

afterEach(() => {
  // Close whatever a failed assertion left open, otherwise Windows refuses to delete the files.
  for (const sqlite of opened) {
    try {
      sqlite.close();
    } catch {
      // already closed
    }
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function readJournal(): Journal {
  return JSON.parse(fs.readFileSync(path.join(MIGRATIONS, "meta", "_journal.json"), "utf8")) as Journal;
}

/** A copy of the real migrations folder holding only what shipped before the review-status migration. */
function writeHistoricalMigrations(): string {
  const journal = readJournal();
  const cut = journal.entries.findIndex((entry) => entry.tag === REVIEW_STATUS_TAG);
  const shipped = cut === -1 ? journal.entries : journal.entries.slice(0, cut);
  const folder = path.join(tmpDir, "historical-migrations");
  fs.mkdirSync(path.join(folder, "meta"), { recursive: true });
  fs.writeFileSync(path.join(folder, "meta", "_journal.json"), JSON.stringify({ ...journal, entries: shipped }));
  for (const entry of shipped) fs.copyFileSync(path.join(MIGRATIONS, `${entry.tag}.sql`), path.join(folder, `${entry.tag}.sql`));
  return folder;
}

const LEGACY_PARTIAL_REVIEW = {
  id: 41,
  cycleId: 7,
  resultsJson: JSON.stringify([{ goalId: 3, title: "Ship", percentComplete: 50, avgScore: 80, grade: 6, note: "kept as written" }]),
  qolJson: JSON.stringify([{ area: "Physical", rating: 8, anchor1: "Sick", anchor10: "Athlete" }]),
  disciplinesJson: JSON.stringify([{ name: "Vision", rating: 7 }]),
  breakthroughs: "Legacy breakthrough",
  nextCycleNotes: "Legacy notes",
  createdAt: "2026-04-01",
  updatedAt: "2026-04-02",
};

const LEGACY_EMPTY_REVIEW = {
  id: 90,
  cycleId: 8,
  resultsJson: "[]",
  qolJson: "[]",
  disciplinesJson: "[]",
  breakthroughs: null,
  nextCycleNotes: null,
  createdAt: "2026-07-01",
  updatedAt: "2026-07-01",
};

/** A database exactly as the app left it before this migration existed, holding two legacy reviews. */
function createLegacyDatabase(file: string) {
  const sqlite = new Database(file);
  opened.push(sqlite);
  sqlite.pragma("foreign_keys = ON");
  migrate(drizzle(sqlite), { migrationsFolder: writeHistoricalMigrations() });
  const insertCycle = sqlite.prepare(
    "INSERT INTO cycles (id, name, start_date, status, created_at, archived_at) VALUES (@id, @name, @startDate, 'archived', @createdAt, @archivedAt)",
  );
  insertCycle.run({ id: 7, name: "Legacy Q1", startDate: "2026-01-05", createdAt: "2026-01-01", archivedAt: "2026-04-05" });
  insertCycle.run({ id: 8, name: "Legacy Q2", startDate: "2026-04-06", createdAt: "2026-04-01", archivedAt: "2026-07-05" });
  const insertReview = sqlite.prepare(
    `INSERT INTO cycle_reviews (id, cycle_id, results_json, qol_json, disciplines_json, breakthroughs, next_cycle_notes, created_at, updated_at)
     VALUES (@id, @cycleId, @resultsJson, @qolJson, @disciplinesJson, @breakthroughs, @nextCycleNotes, @createdAt, @updatedAt)`,
  );
  insertReview.run(LEGACY_PARTIAL_REVIEW);
  insertReview.run(LEGACY_EMPTY_REVIEW);
  return sqlite;
}

/** The app opening the database: pending migrations run. */
function openApp(file: string): DbHandles {
  const handles = createDb(file);
  opened.push(handles.sqlite);
  return handles;
}

const READ_REVIEWS = `SELECT id, cycle_id AS cycleId, results_json AS resultsJson, qol_json AS qolJson,
  disciplines_json AS disciplinesJson, breakthroughs, next_cycle_notes AS nextCycleNotes,
  created_at AS createdAt, updated_at AS updatedAt, status FROM cycle_reviews ORDER BY id`;

function columns(sqlite: Database.Database) {
  return sqlite.prepare("PRAGMA table_info(cycle_reviews)").all() as {
    name: string;
    type: string;
    notnull: number;
    dflt_value: string | null;
  }[];
}

describe("review status migration", () => {
  it("is journaled after the existing migrations with a later timestamp so already-migrated databases pick it up", () => {
    const { entries } = readJournal();

    expect(entries.slice(0, 5).map((entry) => entry.tag)).toEqual([
      "0000_bright_radioactive_man",
      "0001_groovy_silver_centurion",
      "0002_sad_viper",
      "0003_curved_medusa",
      REVIEW_STATUS_TAG,
    ]);
    expect(entries[4]!.idx).toBe(4);
    expect(entries[4]!.when).toBeGreaterThan(entries[3]!.when);
  });

  it("starts from an authentic pre-migration database without a status column", () => {
    const legacy = createLegacyDatabase(path.join(tmpDir, "legacy.db"));

    expect(columns(legacy).map((column) => column.name)).not.toContain("status");
  });

  it("marks every review that existed before the migration complete and preserves its data, ids and timestamps", () => {
    const file = path.join(tmpDir, "legacy.db");
    createLegacyDatabase(file).close();

    const h = openApp(file);

    expect(h.sqlite.prepare(READ_REVIEWS).all()).toEqual([
      { ...LEGACY_PARTIAL_REVIEW, status: "complete" },
      { ...LEGACY_EMPTY_REVIEW, status: "complete" },
    ]);
    expect((h.sqlite.prepare("SELECT count(*) AS count FROM __drizzle_migrations").get() as { count: number }).count).toBe(
      readJournal().entries.length,
    );
  });

  it("adds a NOT NULL status column defaulting to draft, so reviews created afterwards start as drafts", () => {
    const file = path.join(tmpDir, "legacy.db");
    createLegacyDatabase(file).close();

    const h = openApp(file);

    expect(columns(h.sqlite).find((column) => column.name === "status")).toMatchObject({
      type: expect.stringMatching(/^text$/i),
      notnull: 1,
      dflt_value: "'draft'",
    });

    h.db.insert(cycles).values({ id: 9, name: "Fresh", startDate: "2026-07-06", createdAt: "2026-07-01" }).run();
    h.sqlite.prepare("INSERT INTO cycle_reviews (cycle_id, created_at, updated_at) VALUES (9, '2026-10-05', '2026-10-05')").run();

    expect(h.db.select().from(cycleReviews).all().find((review) => review.cycleId === 9)?.status).toBe("draft");
  });

  it("does not re-complete anything when the database is opened again", () => {
    const file = path.join(tmpDir, "legacy.db");
    createLegacyDatabase(file).close();

    const first = openApp(file);
    first.db.insert(cycles).values({ id: 9, name: "Fresh", startDate: "2026-07-06", createdAt: "2026-07-01" }).run();
    first.sqlite.prepare("INSERT INTO cycle_reviews (cycle_id, created_at, updated_at) VALUES (9, '2026-10-05', '2026-10-05')").run();
    first.sqlite.prepare("UPDATE cycle_reviews SET status = 'draft' WHERE id = 41").run();
    first.sqlite.close();

    const second = openApp(file);

    expect(second.sqlite.prepare("SELECT cycle_id AS cycleId, status FROM cycle_reviews ORDER BY cycle_id").all()).toEqual([
      { cycleId: 7, status: "draft" },
      { cycleId: 8, status: "complete" },
      { cycleId: 9, status: "draft" },
    ]);
  });

  it("keeps the schema enum in step with the contract's review statuses", () => {
    expect(cycleReviews.status.enumValues).toEqual([...CYCLE_REVIEW_STATUSES]);
  });
});
