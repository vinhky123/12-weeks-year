/**
 * Phase 4 contract test — settings round-trip, export/import portability
 * (round-trip fidelity, destructive guard, pre-import backup), backups list.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const TODAY = "2026-10-05";
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), `twy-p4-api-`));
process.env.TWY_DB_PATH = path.join(TMP, "app.db");

const settingsRoute = await import("../../src/app/api/settings/route");
const exportRoute = await import("../../src/app/api/export/route");
const importRoute = await import("../../src/app/api/import/route");
const backupsRoute = await import("../../src/app/api/backups/route");
const cyclesRoute = await import("../../src/app/api/cycles/route");

function req(method: string, bodyJson?: unknown): Request {
  return new Request("http://localhost/x", {
    method,
    headers: { "content-type": "application/json", "x-twy-today": TODAY },
    body: bodyJson === undefined ? undefined : JSON.stringify(bodyJson),
  });
}

async function json(res: Response) {
  return (await res.json()) as Record<string, any>;
}

describe("phase 4: settings", () => {
  it("defaults and partial updates", async () => {
    const base = await json(await settingsRoute.GET());
    expect(base.settings).toMatchObject({ theme: "system", locale: "vi", weekStartsOn: 1 });
    const patched = await json(await settingsRoute.PATCH(req("PATCH", { theme: "dark", locale: "en" })));
    expect(patched.settings).toMatchObject({ theme: "dark", locale: "en", weekStartsOn: 1 });
    const bad = await settingsRoute.PATCH(req("PATCH", { theme: "neon" }));
    expect(bad.status).toBe(400);
  });
});

describe("phase 4: portability", () => {
  it("export → import → export is identical; guards work; backups listed", async () => {
    // give the db something to carry
    const cycle = await json(await cyclesRoute.POST(req("POST", { name: "Q5", startDate: TODAY })));

    const download = await exportRoute.GET();
    expect(download.status).toBe(200);
    expect(download.headers.get("content-disposition")).toContain("12-week-year-backup-");
    const original = JSON.parse(await download.text());
    expect(original.format).toBe("12-week-year-local-backup");
    expect(original.version).toBe(1);
    expect(original.data.cycles.some((c: any) => c.id === cycle.id)).toBe(true);

    // destructive guard
    const unconfirmed = await importRoute.POST(req("POST", { payload: original, confirm: false }));
    expect(unconfirmed.status).toBe(409);
    const badVersion = await importRoute.POST(req("POST", { payload: { ...original, version: 99 }, confirm: true }));
    expect(badVersion.status).toBe(422);

    // round-trip: mutate, then restore from the backup
    await cyclesRoute.POST(req("POST", { name: "Extra cycle", startDate: TODAY }));
    const restoreRes = await importRoute.POST(req("POST", { payload: original, confirm: true }));
    const restore = await json(restoreRes);
    expect(restore.ok).toBe(true);
    expect(restore.counts.cycles).toBe(original.data.cycles.length);
    const after = JSON.parse(await (await exportRoute.GET()).text());
    expect(after.data).toEqual(original.data); // identical state restored

    // backups: pre-import snapshot + auto-backups listed
    const backups = await json(await backupsRoute.GET());
    expect(backups.backups.length).toBeGreaterThanOrEqual(1);
  });
});

afterAll(() => {
  try {
    fs.rmSync(TMP, { recursive: true, force: true });
  } catch {
    // temp cleanup
  }
});
