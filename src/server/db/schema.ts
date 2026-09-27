import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// Phase 0/1 tables. Phase 2+ tables (visions, block templates, lead measures,
// wam reports, cycle reviews) arrive with their phases' migrations.

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey().default(1),
  currentCycleId: integer("current_cycle_id"),
  weekStartsOn: integer("week_starts_on").notNull().default(1), // 1 = Monday
  theme: text("theme").notNull().default("system"),
  locale: text("locale").notNull().default("en"),
  createdAt: text("created_at").notNull(),
});

export const cycles = sqliteTable("cycles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  startDate: text("start_date").notNull(), // YYYY-MM-DD
  status: text("status").notNull().default("planning"), // planning | active | review | archived
  createdAt: text("created_at").notNull(),
  archivedAt: text("archived_at"),
});

export const goals = sqliteTable("goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cycleId: integer("cycle_id").notNull().references(() => cycles.id),
  title: text("title").notNull(),
  why: text("why").notNull(),
  lagMetricName: text("lag_metric_name").notNull(),
  lagUnit: text("lag_unit").notNull(),
  lagStart: real("lag_start").notNull(),
  lagTarget: real("lag_target").notNull(),
  deadlineWeek: integer("deadline_week").notNull().default(12),
  status: text("status").notNull().default("active"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const tactics = sqliteTable("tactics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  goalId: integer("goal_id").notNull().references(() => goals.id),
  text: text("text").notNull(), // verb-first sentence
  duePattern: text("due_pattern").notNull(), // JSON-encoded DuePattern
  keystone: integer("keystone").notNull().default(0),
  activeFromWeek: integer("active_from_week").notNull().default(1),
  deactivatedAtWeek: integer("deactivated_at_week"),
  createdAt: text("created_at").notNull(),
});

export const completions = sqliteTable("completions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tacticId: integer("tactic_id").notNull().references(() => tactics.id),
  cycleWeek: integer("cycle_week").notNull(), // 1-12
  date: text("date").notNull(),
  createdAt: text("created_at").notNull(),
});

export const weekPlans = sqliteTable(
  "week_plans",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    cycleId: integer("cycle_id").notNull().references(() => cycles.id),
    weekNumber: integer("week_number").notNull(),
    status: text("status").notNull().default("draft"), // draft | closed
    closedAt: text("closed_at"),
    reflection: text("reflection"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("week_plans_cycle_week_idx").on(t.cycleId, t.weekNumber)],
);

export const weekPlanItems = sqliteTable("week_plan_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  weekPlanId: integer("week_plan_id").notNull().references(() => weekPlans.id),
  tacticId: integer("tactic_id"), // null only for explicit plan-revision items
  label: text("label").notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Monday .. 6 = Sunday
  done: integer("done").notNull().default(0),
  plannedCount: integer("planned_count").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const lagLogs = sqliteTable(
  "lag_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    goalId: integer("goal_id").notNull().references(() => goals.id),
    weekNumber: integer("week_number").notNull(), // 1-12
    value: real("value").notNull(),
    loggedAt: text("logged_at").notNull(),
  },
  (t) => [uniqueIndex("lag_logs_goal_week_idx").on(t.goalId, t.weekNumber)],
);

// --- Phase 2: vision, model week, lead measures ---

/** Living vision: the singleton row with cycle_id NULL. Snapshots set cycle_id (immutable). */
export const visions = sqliteTable("visions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  longTerm: text("long_term").notNull().default(""),
  threeYear: text("three_year").notNull().default(""),
  cycleConnection: text("cycle_connection").notNull().default(""),
  lifeDomains: text("life_domains").notNull().default("[]"), // JSON [{area, note}]
  cycleId: integer("cycle_id"), // null = living vision; set = archived snapshot
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const blockTemplates = sqliteTable("block_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cycleId: integer("cycle_id"), // null = global default template
  type: text("type").notNull(), // STRATEGIC | BUFFER | BREAKOUT | PLANNING | WAM
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Monday .. 6 = Sunday
  startMinute: integer("start_minute").notNull(), // minutes from midnight
  durationMinutes: integer("duration_minutes").notNull(),
  label: text("label"),
  createdAt: text("created_at").notNull(),
});

export const leadMeasures = sqliteTable("lead_measures", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  goalId: integer("goal_id").notNull().references(() => goals.id),
  name: text("name").notNull(),
  weeklyTarget: integer("weekly_target").notNull(),
  createdAt: text("created_at").notNull(),
});

export const leadLogs = sqliteTable(
  "lead_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    leadMeasureId: integer("lead_measure_id").notNull().references(() => leadMeasures.id),
    weekNumber: integer("week_number").notNull(), // 1-12
    value: real("value").notNull(),
    loggedAt: text("logged_at").notNull(),
  },
  (t) => [uniqueIndex("lead_logs_measure_week_idx").on(t.leadMeasureId, t.weekNumber)],
);
