import { z } from "zod";

/**
 * Single API contract between the backend (this repo) and the UI (Antigravity).
 * RULE: UI code imports ONLY from this file (plus pure display helpers) —
 * never from `src/server/**`. Request/response schemas per endpoint are
 * appended here phase by phase, before their FE specs are written.
 */

export const DUE_PATTERN_SCHEMA = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("EVERY_WEEK"),
    timesPerWeek: z.number().int().min(1).max(7),
  }),
  z.object({
    type: z.literal("SPECIFIC_WEEKS"),
    weeks: z.array(z.number().int().min(1).max(12)).min(1).max(12),
  }),
]);
export type DuePattern = z.infer<typeof DUE_PATTERN_SCHEMA>;

export const CYCLE_STATUSES = ["planning", "active", "review", "archived"] as const;
export type CycleStatus = (typeof CYCLE_STATUSES)[number];
export const CYCLE_STATUS_SCHEMA = z.enum(CYCLE_STATUSES);

export const GOAL_STATUSES = ["active", "achieved", "missed", "dropped"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];
export const GOAL_STATUS_SCHEMA = z.enum(GOAL_STATUSES);

export const WEEK_PLAN_STATUSES = ["draft", "closed"] as const;
export type WeekPlanStatus = (typeof WEEK_PLAN_STATUSES)[number];
export const WEEK_PLAN_STATUS_SCHEMA = z.enum(WEEK_PLAN_STATUSES);

export const API_ERROR_SCHEMA = z.object({
  error: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});
export type ApiError = z.infer<typeof API_ERROR_SCHEMA>;

// Book constants surfaced for the UI (values mirror src/server modules).
export const ON_TRACK_THRESHOLD = 85;
export const AT_RISK_THRESHOLD = 65;
export const WEEKS_IN_CYCLE = 12;
export const REVIEW_WEEK = 13;
export const MAX_GOALS_PER_CYCLE = 3;
