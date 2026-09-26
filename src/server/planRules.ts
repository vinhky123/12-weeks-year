// Pure planning rules for The 12 Week Year: weekly-plan generation and the
// book's input validations. No I/O; joins cycleMath + scoring concepts.

import { REVIEW_WEEK, WEEKS_IN_CYCLE } from "./cycleMath";
import { type DuePattern, type TacticLike, dueForWeek } from "./scoring";

export interface ValidationError {
  field: string;
  message: string;
}

/** Tactics that owe completions in `week`, with their due counts. */
export function tacticsDueInWeek(
  tactics: TacticLike[],
  week: number,
): { tactic: TacticLike; dueCount: number }[] {
  return tactics
    .map((tactic) => ({ tactic, dueCount: dueForWeek(tactic, week) }))
    .filter((entry) => entry.dueCount > 0);
}

/**
 * One week-plan item per due tactic. Default day is Monday (0) — the user
 * redistributes from there; placement is UI concern, dues are not.
 */
export function generateWeekPlanItems(
  tactics: TacticLike[],
  week: number,
  textById?: Map<TacticLike["id"], string>,
): { label: string; tacticId: TacticLike["id"]; dayOfWeek: 0; plannedCount: number; sortOrder: number }[] {
  return tacticsDueInWeek(tactics, week).map((entry, index) => ({
    label: textById?.get(entry.tactic.id) ?? `Tactic ${String(entry.tactic.id)}`,
    tacticId: entry.tactic.id,
    dayOfWeek: 0 as const,
    plannedCount: entry.dueCount,
    sortOrder: index,
  }));
}

export interface GoalInput {
  title: string;
  why: string;
  lagMetricName: string;
  lagUnit: string;
  lagStart: number;
  lagTarget: number;
  deadlineWeek?: number;
}

/** The book's goal criteria, as checks: specific, measurable, stretching, time-bound, ≤3. */
export function validateNewGoal(activeGoalCount: number, input: GoalInput): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!input.title?.trim()) errors.push({ field: "title", message: "Title is required." });
  if (!input.why?.trim()) errors.push({ field: "why", message: "The why is required — goals without an emotional connection don't survive the valley." });
  if (!input.lagMetricName?.trim()) errors.push({ field: "lagMetricName", message: "Name the lag indicator (e.g. Weight)." });
  if (!input.lagUnit?.trim()) errors.push({ field: "lagUnit", message: "Name the unit (e.g. lbs, $, words)." });
  if (!Number.isFinite(input.lagStart)) errors.push({ field: "lagStart", message: "Start value must be a number." });
  if (!Number.isFinite(input.lagTarget)) errors.push({ field: "lagTarget", message: "Target value must be a number." });
  if (Number.isFinite(input.lagStart) && Number.isFinite(input.lagTarget) && input.lagStart === input.lagTarget) {
    errors.push({ field: "lagTarget", message: "Target must differ from start — a goal you can't measure can't be scored." });
  }
  const deadline = input.deadlineWeek ?? WEEKS_IN_CYCLE;
  if (!Number.isInteger(deadline) || deadline < 1 || deadline > WEEKS_IN_CYCLE) {
    errors.push({ field: "deadlineWeek", message: `Deadline must be a week between 1 and ${WEEKS_IN_CYCLE}.` });
  }
  if (activeGoalCount >= 3) {
    errors.push({ field: "count", message: "Max 3 active goals per cycle — the vital few. Drop one first." });
  }
  return errors;
}

function isValidPattern(pattern: DuePattern): boolean {
  if (pattern.type === "EVERY_WEEK") {
    return Number.isInteger(pattern.timesPerWeek) && pattern.timesPerWeek >= 1 && pattern.timesPerWeek <= 7;
  }
  if (pattern.type === "SPECIFIC_WEEKS") {
    return (
      Array.isArray(pattern.weeks) &&
      pattern.weeks.length >= 1 &&
      pattern.weeks.length <= WEEKS_IN_CYCLE &&
      pattern.weeks.every((w) => Number.isInteger(w) && w >= 1 && w <= WEEKS_IN_CYCLE)
    );
  }
  return false;
}

export interface TacticInput {
  text: string;
  duePattern: DuePattern;
}

/** Tactics are verb-first, concrete, countable sentences with a due pattern. */
export function validateNewTactic(input: TacticInput): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!input.text?.trim()) {
    errors.push({ field: "text", message: "Tactic text is required." });
  } else if (input.text.trim().length > 200) {
    errors.push({ field: "text", message: "Keep tactics under 200 characters — concrete, verb-first." });
  }
  if (!input.duePattern || !isValidPattern(input.duePattern)) {
    errors.push({ field: "duePattern", message: "Due pattern must be EVERY_WEEK (1-7x) or SPECIFIC_WEEKS (weeks 1-12)." });
  }
  return errors;
}

export interface RitualState {
  hasActiveCycle: boolean;
  cycleStatus: "planning" | "active" | "review" | "archived";
  /** Current execution week (1-12); 13 = review week. */
  currentWeek: number;
  hasCurrentWeekPlan: boolean;
  lastWeekPlanClosed: boolean;
  reviewWeek: boolean;
}

/** What the system wants from the user right now — the weekly loop's order. */
export function nextRitual(state: RitualState) {
  if (!state.hasActiveCycle) return "create_cycle" as const;
  if (state.reviewWeek) return "review_mode" as const;
  if (state.cycleStatus === "planning") return "start_cycle" as const;
  if (state.currentWeek >= 2 && !state.lastWeekPlanClosed) return "close_last_week" as const;
  if (!state.hasCurrentWeekPlan) return "plan_week" as const;
  if (state.currentWeek <= 0 || state.currentWeek >= REVIEW_WEEK) return "await_week_end" as const;
  return "execute_today" as const;
}
