import { eq } from "drizzle-orm";
import type { DbHandles } from "../db";
import { settings } from "../db/schema";
import { invalid, notFound } from "../ruleError";

export type SettingsRow = typeof settings.$inferSelect;

export const THEMES = ["system", "light", "dark"] as const;
export const LOCALES = ["en", "vi"] as const;

export type Theme = (typeof THEMES)[number];
export type Locale = (typeof LOCALES)[number];

export interface SettingsPatch {
  theme?: Theme;
  locale?: Locale;
  weekStartsOn?: number;
}

export function getSettings(h: DbHandles): SettingsRow {
  const row = h.db.select().from(settings).where(eq(settings.id, 1)).get();
  if (!row) throw notFound("Settings");
  return row;
}

export function updateSettings(h: DbHandles, patch: SettingsPatch): SettingsRow {
  if (patch.theme !== undefined && !THEMES.includes(patch.theme)) {
    throw invalid(`theme must be one of ${THEMES.join(", ")}.`);
  }
  if (patch.locale !== undefined && !LOCALES.includes(patch.locale)) {
    throw invalid(`locale must be one of ${LOCALES.join(", ")}.`);
  }
  if (patch.weekStartsOn !== undefined && (!Number.isInteger(patch.weekStartsOn) || patch.weekStartsOn < 0 || patch.weekStartsOn > 6)) {
    throw invalid("weekStartsOn must be 0 (Mon) - 6 (Sun).");
  }
  const updates = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  if (Object.keys(updates).length === 0) return getSettings(h);
  return h.db.update(settings).set(updates).where(eq(settings.id, 1)).returning().get()!;
}
