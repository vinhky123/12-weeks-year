import { afterAll, describe, expect, it } from "vitest";
import { getSettings, updateSettings } from "./settingsService";
import { createDb } from "../db";

describe("settings service", () => {
  const h = createDb(":memory:");
  afterAll(() => h.sqlite.close());

  it("bootstraps defaults and updates individual fields", () => {
    const base = getSettings(h);
    expect(base.theme).toBe("system");
    expect(base.locale).toBe("en");
    expect(base.weekStartsOn).toBe(1);

    const themed = updateSettings(h, { theme: "dark" });
    expect(themed.theme).toBe("dark");
    expect(themed.locale).toBe("en"); // untouched

    const localized = updateSettings(h, { locale: "vi", weekStartsOn: 0 });
    expect(localized.locale).toBe("vi");
    expect(localized.weekStartsOn).toBe(0);
    expect(localized.theme).toBe("dark");
  });

  it("rejects invalid values", () => {
    expect(() => updateSettings(h, { theme: "neon" as never })).toThrow(/theme must be/);
    expect(() => updateSettings(h, { locale: "fr" as never })).toThrow(/locale must be/);
    expect(() => updateSettings(h, { weekStartsOn: 9 })).toThrow(/weekStartsOn/);
  });
});
