// Pure execution scoring for The 12 Week Year.
// "The score measures achievements, not effort or intentions": completions
// count only, over-completion caps at due, and weeks with nothing due score null.

import { WEEKS_IN_CYCLE } from "./cycleMath";

export type DuePattern =
  | { type: "EVERY_WEEK"; timesPerWeek: number }
  | { type: "SPECIFIC_WEEKS"; weeks: number[] };

export interface TacticLike {
  id: string | number;
  goalId: string | number;
  duePattern: DuePattern;
  /** First execution week (1-based) this tactic counts for. Default 1. */
  activeFromWeek: number;
  /** Last execution week this tactic counts for, inclusive. Null = still active. */
  deactivatedAtWeek: number | null;
}

export const ON_TRACK_THRESHOLD = 85;
export const AT_RISK_THRESHOLD = 65;

export type ScoreBand = "ON_TRACK" | "AT_RISK" | "REVISE_PLAN";

export interface WeekScore {
  week: number;
  due: number;
  completed: number;
  scorePct: number;
  band: ScoreBand;
}

/** How many completions this tactic owes in `week`. Zero means not due. */
export function dueForWeek(tactic: TacticLike, week: number): number {
  if (!Number.isInteger(week) || week < 1 || week > WEEKS_IN_CYCLE) return 0;
  if (week < tactic.activeFromWeek) return 0;
  if (tactic.deactivatedAtWeek !== null && week > tactic.deactivatedAtWeek) return 0;
  const pattern = tactic.duePattern;
  if (pattern.type === "EVERY_WEEK") {
    return Number.isFinite(pattern.timesPerWeek) && pattern.timesPerWeek > 0
      ? Math.floor(pattern.timesPerWeek)
      : 0;
  }
  return pattern.weeks.includes(week) ? 1 : 0;
}

export function bandFor(scorePct: number): ScoreBand {
  if (scorePct >= ON_TRACK_THRESHOLD) return "ON_TRACK";
  if (scorePct >= AT_RISK_THRESHOLD) return "AT_RISK";
  return "REVISE_PLAN";
}

/**
 * Weekly execution score = completed / due tactic completions (the book's
 * signature metric; 85%+ is the benchmark). `completions` maps tactic id to
 * the number of completions logged that week; values are clamped to [0, due].
 * Returns null when nothing was due — such weeks never count against you.
 */
export function weekScore(
  tactics: TacticLike[],
  completions: Map<TacticLike["id"], number>,
  week: number,
): WeekScore | null {
  let due = 0;
  let completed = 0;
  for (const tactic of tactics) {
    const tacticDue = dueForWeek(tactic, week);
    if (tacticDue === 0) continue;
    const logged = completions.get(tactic.id) ?? 0;
    due += tacticDue;
    completed += Math.min(Math.max(0, logged), tacticDue);
  }
  if (due === 0) return null;
  const scorePct = Math.round((completed / due) * 100);
  return { week, due, completed, scorePct, band: bandFor(scorePct) };
}

/** Same computation restricted to one goal's tactics. */
export function goalScore(
  tactics: TacticLike[],
  completions: Map<TacticLike["id"], number>,
  week: number,
  goalId: TacticLike["goalId"],
): WeekScore | null {
  return weekScore(
    tactics.filter((t) => t.goalId === goalId),
    completions,
    week,
  );
}

/** Mean weekly score across the cycle; weeks with nothing due are excluded. */
export function cycleAverageScore(weekly: (WeekScore | null)[]): number | null {
  const scores = weekly
    .filter((w): w is WeekScore => w !== null)
    .map((w) => w.scorePct);
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
}
