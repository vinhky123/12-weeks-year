import { z } from "zod";

/**
 * Single API contract between the backend (this repo) and the UI (Antigravity).
 * RULE: UI code imports ONLY from this file (plus pure display helpers) —
 * never from `src/server/**`. All endpoints are under `/api`.
 */

// --- primitives ---

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

export const SCORE_BANDS = ["ON_TRACK", "AT_RISK", "REVISE_PLAN"] as const;
export type ScoreBand = (typeof SCORE_BANDS)[number];
export const SCORE_BAND_SCHEMA = z.enum(SCORE_BANDS);

export const API_ERROR_SCHEMA = z.object({
  error: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});
export type ApiError = z.infer<typeof API_ERROR_SCHEMA>;

// --- entities ---

export const CYCLE_DTO = z.object({
  id: z.number().int(),
  name: z.string(),
  startDate: z.string(),
  status: CYCLE_STATUS_SCHEMA,
  createdAt: z.string(),
  archivedAt: z.string().nullable(),
});
export type CycleDto = z.infer<typeof CYCLE_DTO>;

export const TACTIC_DTO = z.object({
  id: z.number().int(),
  goalId: z.number().int(),
  text: z.string(),
  duePattern: DUE_PATTERN_SCHEMA,
  keystone: z.boolean(),
  activeFromWeek: z.number().int(),
  deactivatedAtWeek: z.number().int().nullable(),
  createdAt: z.string(),
});
export type TacticDto = z.infer<typeof TACTIC_DTO>;

export const GOAL_DTO = z.object({
  id: z.number().int(),
  cycleId: z.number().int(),
  title: z.string(),
  why: z.string(),
  lagMetricName: z.string(),
  lagUnit: z.string(),
  lagStart: z.number(),
  lagTarget: z.number(),
  deadlineWeek: z.number().int(),
  status: GOAL_STATUS_SCHEMA,
  sortOrder: z.number().int(),
  createdAt: z.string(),
});
export type GoalDto = z.infer<typeof GOAL_DTO>;

export const GOAL_WITH_TACTICS_DTO = GOAL_DTO.extend({ tactics: z.array(TACTIC_DTO) });
export type GoalWithTacticsDto = z.infer<typeof GOAL_WITH_TACTICS_DTO>;

export const CYCLE_DETAIL_DTO = z.object({ cycle: CYCLE_DTO, goals: z.array(GOAL_WITH_TACTICS_DTO) });
export type CycleDetailDto = z.infer<typeof CYCLE_DETAIL_DTO>;

export const CYCLE_PHASE_SCHEMA = z.enum(["pre", "execution", "review", "post"]);
export type CyclePhase = z.infer<typeof CYCLE_PHASE_SCHEMA>;

export const ACTIVE_CYCLE_INFO_DTO = z.object({
  cycle: CYCLE_DTO,
  weekNumber: z.number().int(),
  weekLabel: z.string().nullable(),
  daysRemaining: z.number().int(),
  phase: CYCLE_PHASE_SCHEMA,
});
export type ActiveCycleInfoDto = z.infer<typeof ACTIVE_CYCLE_INFO_DTO>;

export const LAG_LOG_DTO = z.object({
  id: z.number().int(),
  goalId: z.number().int(),
  weekNumber: z.number().int(),
  value: z.number(),
  loggedAt: z.string(),
});
export type LagLogDto = z.infer<typeof LAG_LOG_DTO>;

// --- scores (the honest metric) ---

export const GOAL_SCORE_DTO = z.object({
  week: z.number().int(),
  due: z.number().int(),
  completed: z.number().int(),
  scorePct: z.number().int(),
  band: SCORE_BAND_SCHEMA,
});
export type GoalScoreDto = z.infer<typeof GOAL_SCORE_DTO>;

export const WEEK_SCORE_DTO = GOAL_SCORE_DTO.extend({
  closed: z.boolean(),
  projected: z.boolean(),
});
export type WeekScoreDto = z.infer<typeof WEEK_SCORE_DTO>;

export const CYCLE_SCORES_DTO = z.object({
  currentWeek: z.number().int(),
  weeks: z.array(WEEK_SCORE_DTO.nullable()),
  averageScore: z.number().int().nullable(),
  goals: z.array(z.object({ goalId: z.number().int(), title: z.string(), currentWeekScore: GOAL_SCORE_DTO.nullable() })),
});
export type CycleScoresDto = z.infer<typeof CYCLE_SCORES_DTO>;

// --- week plans ---

export const GOAL_CONTEXT_DTO = z.object({ id: z.number().int(), title: z.string(), why: z.string() });

export const WEEK_PLAN_DTO = z.object({
  id: z.number().int(),
  cycleId: z.number().int(),
  weekNumber: z.number().int(),
  status: WEEK_PLAN_STATUS_SCHEMA,
  closedAt: z.string().nullable(),
  reflection: z.string().nullable(),
  createdAt: z.string(),
});
export type WeekPlanDto = z.infer<typeof WEEK_PLAN_DTO>;

export const WEEK_PLAN_ITEM_DTO = z.object({
  id: z.number().int(),
  weekPlanId: z.number().int(),
  tacticId: z.number().int().nullable(),
  label: z.string(),
  dayOfWeek: z.number().int().min(0).max(6),
  done: z.number().int(),
  plannedCount: z.number().int(),
  sortOrder: z.number().int(),
  goal: GOAL_CONTEXT_DTO.nullable(),
});
export type WeekPlanItemDto = z.infer<typeof WEEK_PLAN_ITEM_DTO>;

export const WEEK_PLAN_DETAIL_DTO = z.object({
  plan: WEEK_PLAN_DTO,
  weekStart: z.string(),
  weekEnd: z.string(),
  items: z.array(WEEK_PLAN_ITEM_DTO),
  score: WEEK_SCORE_DTO.nullable(),
});
export type WeekPlanDetailDto = z.infer<typeof WEEK_PLAN_DETAIL_DTO>;

// --- dashboard & today ---

export const NEXT_RITUALS = [
  "create_cycle", "start_cycle", "close_last_week", "plan_week", "execute_today", "review_mode", "await_week_end",
] as const;
export type NextRitual = (typeof NEXT_RITUALS)[number];
export const NEXT_RITUAL_SCHEMA = z.enum(NEXT_RITUALS);

export const DASHBOARD_DTO = z.object({
  phase: z.enum(["no_cycle", "pre", "execution", "review", "post"]),
  today: z.object({
    isoDate: z.string(),
    weekNumber: z.number().int(),
    weekLabel: z.string().nullable(),
    daysRemaining: z.number().int(),
  }),
  cycle: CYCLE_DTO.nullable(),
  currentWeek: z
    .object({
      number: z.number().int(),
      planStatus: z.enum(["none", "draft", "closed"]),
      score: WEEK_SCORE_DTO.nullable(),
    })
    .nullable(),
  scoreHistory: z.array(WEEK_SCORE_DTO.nullable()),
  averageScore: z.number().int().nullable(),
  goals: z.array(
    z.object({
      id: z.number().int(),
      title: z.string(),
      why: z.string(),
      lagMetricName: z.string(),
      lagUnit: z.string(),
      lagStart: z.number(),
      lagTarget: z.number(),
      status: GOAL_STATUS_SCHEMA,
      tacticCount: z.number().int(),
      currentWeekScore: GOAL_SCORE_DTO.nullable(),
    }),
  ),
  nextRitual: NEXT_RITUAL_SCHEMA,
  dailyPrinciple: z.string(),
});
export type DashboardDto = z.infer<typeof DASHBOARD_DTO>;

export const TODAY_DTO = z.object({
  date: z.string(),
  weekNumber: z.number().int(),
  weekLabel: z.string().nullable(),
  dayIndexToday: z.number().int().min(0).max(6),
  days: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      date: z.string(),
      items: z.array(WEEK_PLAN_ITEM_DTO),
    }),
  ),
  planStatus: z.enum(["none", "draft", "closed"]),
  projectedScore: WEEK_SCORE_DTO.nullable(),
  dailyPrinciple: z.string(),
});
export type TodayDto = z.infer<typeof TODAY_DTO>;

export const COMPLETION_RESULT_DTO = z.object({
  tacticId: z.number().int(),
  weekNumber: z.number().int(),
  done: z.number().int(),
  due: z.number().int(),
  projectedScore: WEEK_SCORE_DTO.nullable(),
});
export type CompletionResultDto = z.infer<typeof COMPLETION_RESULT_DTO>;

// --- request bodies ---

export const CYCLE_CREATE_SCHEMA = z.object({ name: z.string().min(1), startDate: z.string().optional() });
export type CycleCreate = z.infer<typeof CYCLE_CREATE_SCHEMA>;

export const GOAL_CREATE_SCHEMA = z.object({
  title: z.string().min(1),
  why: z.string().min(1),
  lagMetricName: z.string().min(1),
  lagUnit: z.string().min(1),
  lagStart: z.number(),
  lagTarget: z.number(),
  deadlineWeek: z.number().int().min(1).max(12).optional(),
});
export type GoalCreate = z.infer<typeof GOAL_CREATE_SCHEMA>;

export const GOAL_UPDATE_SCHEMA = GOAL_CREATE_SCHEMA.partial().extend({ status: GOAL_STATUS_SCHEMA.optional() });
export type GoalUpdate = z.infer<typeof GOAL_UPDATE_SCHEMA>;

export const TACTIC_CREATE_SCHEMA = z.object({ text: z.string().min(1), duePattern: DUE_PATTERN_SCHEMA });
export type TacticCreate = z.infer<typeof TACTIC_CREATE_SCHEMA>;

export const TACTIC_UPDATE_SCHEMA = z.object({
  text: z.string().min(1).optional(),
  duePattern: DUE_PATTERN_SCHEMA.optional(),
  keystone: z.boolean().optional(),
});
export type TacticUpdate = z.infer<typeof TACTIC_UPDATE_SCHEMA>;

export const ADD_PLAN_ITEM_SCHEMA = z.object({
  label: z.string().min(1),
  dayOfWeek: z.number().int().min(0).max(6),
  confirmPlanRevision: z.boolean(),
});

export const ITEM_PATCH_SCHEMA = z.object({
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  sortOrder: z.number().int().optional(),
  label: z.string().min(1).optional(),
});

export const CLOSE_WEEK_SCHEMA = z.object({
  reflection: z.string().optional(),
  lagValues: z.array(z.object({ goalId: z.number().int(), value: z.number() })).optional(),
});
export type CloseWeek = z.infer<typeof CLOSE_WEEK_SCHEMA>;

export const COMPLETION_SCHEMA = z.object({ tacticId: z.number().int(), weekNumber: z.number().int().min(1).max(12) });

export const LAG_LOG_CREATE_SCHEMA = z.object({
  goalId: z.number().int(),
  weekNumber: z.number().int().min(1).max(12),
  value: z.number(),
});

// --- Phase 2: vision, model week, lead measures ---

export const LIFE_DOMAIN_DTO = z.object({ area: z.string(), note: z.string() });
export type LifeDomainDto = z.infer<typeof LIFE_DOMAIN_DTO>;

export const VISION_DTO = z.object({
  id: z.number().int(),
  longTerm: z.string(),
  threeYear: z.string(),
  cycleConnection: z.string(),
  lifeDomains: z.array(LIFE_DOMAIN_DTO),
  cycleId: z.number().int().nullable(),
  updatedAt: z.string(),
});
export type VisionDto = z.infer<typeof VISION_DTO>;

export const VISION_UPDATE_SCHEMA = z.object({
  longTerm: z.string().optional(),
  threeYear: z.string().optional(),
  cycleConnection: z.string().optional(),
  lifeDomains: z.array(LIFE_DOMAIN_DTO).optional(),
});
export type VisionUpdate = z.infer<typeof VISION_UPDATE_SCHEMA>;

export const BLOCK_TYPES = ["STRATEGIC", "BUFFER", "BREAKOUT", "PLANNING", "WAM"] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];
export const BLOCK_TYPE_SCHEMA = z.enum(BLOCK_TYPES);

export const BLOCK_TEMPLATE_DTO = z.object({
  id: z.number().int(),
  cycleId: z.number().int().nullable(),
  type: BLOCK_TYPE_SCHEMA,
  dayOfWeek: z.number().int().min(0).max(6),
  startMinute: z.number().int().min(0).max(1439),
  durationMinutes: z.number().int().min(15).max(480),
  label: z.string().nullable(),
  createdAt: z.string(),
});
export type BlockTemplateDto = z.infer<typeof BLOCK_TEMPLATE_DTO>;

export const BLOCK_CREATE_SCHEMA = z.object({
  type: BLOCK_TYPE_SCHEMA,
  dayOfWeek: z.number().int().min(0).max(6),
  startMinute: z.number().int().min(0).max(1439),
  durationMinutes: z.number().int().min(15).max(480),
  label: z.string().optional(),
});
export type BlockCreate = z.infer<typeof BLOCK_CREATE_SCHEMA>;

export const BLOCK_UPDATE_SCHEMA = BLOCK_CREATE_SCHEMA.partial();
export type BlockUpdate = z.infer<typeof BLOCK_UPDATE_SCHEMA>;

export const WARNING_DTO = z.object({ field: z.string(), message: z.string() });
export type WarningDto = z.infer<typeof WARNING_DTO>;

export const MODEL_WEEK_DTO = z.object({
  blocks: z.array(BLOCK_TEMPLATE_DTO),
  warnings: z.array(WARNING_DTO),
});
export type ModelWeekDto = z.infer<typeof MODEL_WEEK_DTO>;

export const LEAD_MEASURE_DTO = z.object({
  id: z.number().int(),
  goalId: z.number().int(),
  name: z.string(),
  weeklyTarget: z.number().int(),
  createdAt: z.string(),
});
export type LeadMeasureDto = z.infer<typeof LEAD_MEASURE_DTO>;

export const LEAD_MEASURE_CREATE_SCHEMA = z.object({
  name: z.string().min(1),
  weeklyTarget: z.number().int().min(1),
});
export type LeadMeasureCreate = z.infer<typeof LEAD_MEASURE_CREATE_SCHEMA>;

export const LEAD_LOG_DTO = z.object({
  id: z.number().int(),
  leadMeasureId: z.number().int(),
  weekNumber: z.number().int().min(1).max(12),
  value: z.number(),
  loggedAt: z.string(),
});
export type LeadLogDto = z.infer<typeof LEAD_LOG_DTO>;

export const LEAD_LOG_CREATE_SCHEMA = z.object({
  leadMeasureId: z.number().int(),
  weekNumber: z.number().int().min(1).max(12),
  value: z.number().min(0),
});
export type LeadLogCreate = z.infer<typeof LEAD_LOG_CREATE_SCHEMA>;

export const DIAGNOSIS_SCHEMA = z.enum(["STRATEGY_PROBLEM", "EXECUTION_PROBLEM"]);

export const MEASURES_OVERVIEW_DTO = z.object({
  cycleId: z.number().int(),
  currentWeek: z.number().int(),
  averageScore: z.number().int().nullable(),
  weeks: z.array(WEEK_SCORE_DTO.nullable()),
  goals: z.array(
    z.object({
      goal: z.object({
        id: z.number().int(),
        title: z.string(),
        lagMetricName: z.string(),
        lagUnit: z.string(),
        lagStart: z.number(),
        lagTarget: z.number(),
      }),
      lagSeries: z.array(z.object({ week: z.number().int(), value: z.number() }).nullable()),
      lagProgress: z.number().nullable(),
      latestLag: z.number().nullable(),
      leadMeasures: z.array(
        z.object({
          id: z.number().int(),
          name: z.string(),
          weeklyTarget: z.number().int(),
          series: z.array(z.object({ week: z.number().int(), value: z.number() })),
          thisWeek: z.number().nullable(),
        }),
      ),
      currentWeekScore: GOAL_SCORE_DTO.nullable(),
      diagnosis: DIAGNOSIS_SCHEMA.nullable(),
    }),
  ),
});
export type MeasuresOverviewDto = z.infer<typeof MEASURES_OVERVIEW_DTO>;

// --- book constants surfaced for the UI (values mirror src/server modules) ---

export const ON_TRACK_THRESHOLD = 85;
export const AT_RISK_THRESHOLD = 65;
export const WEEKS_IN_CYCLE = 12;
export const REVIEW_WEEK = 13;
export const MAX_GOALS_PER_CYCLE = 3;
