// Pure week-13 review rules: catalogs, goal grading, valley guardrails,
// and the celebration summary ("celebrate before analysis").

import type { WeekScore } from "./scoring";

/** The book's six quality-of-life areas (intentional imbalance check). */
export const QOL_AREAS = [
  "Spiritual",
  "Spouse/Key Relationship",
  "Family",
  "Business",
  "Personal",
  "Physical",
] as const;

/** The five success disciplines the user rates on their own execution. */
export const DISCIPLINES = [
  "Vision",
  "12-Week Planning",
  "Weekly Routine (Score · Plan · WAM)",
  "Performance Time (Blocks)",
  "Key Measures",
] as const;

/**
 * Auto-suggested 1-10 grade: half goal completion, half execution quality.
 * A missing side defers to the other; nothing measurable floors at 1.
 */
export function goalGrade(percentComplete: number | null, avgScore: number | null): number {
  const completion = percentComplete ?? avgScore;
  const execution = avgScore ?? percentComplete;
  if (completion === null || execution === null) return 1;
  const blended = 10 * (0.5 * (completion / 100) + 0.5 * (execution / 100));
  return Math.min(10, Math.max(1, Math.round(blended)));
}

export interface Guidance {
  headline: string;
  body: string;
}

/**
 * The valley of despair (emotional cycle of change) hits around weeks 3-6.
 * When execution dips there, the system guides instead of judging.
 */
export function valleyGuidance(currentWeek: number, averageScore: number | null): Guidance | null {
  if (averageScore === null || averageScore >= 70) return null;
  if (currentWeek < 3 || currentWeek > 6) return null;
  return {
    headline: "You're in the valley of despair — this is normal.",
    body:
      "Weeks 3–6 are where most people quit: progress is invisible, the costs are real. " +
      "This is a data point, not a verdict. Rely on your commitments and your weekly rhythm, not your feelings — " +
      "informed optimism comes next.",
  };
}

export interface GoalStatusLike {
  status: string;
}

export interface Celebration {
  bestWeek: { week: number; scorePct: number } | null;
  scoredWeeks: number;
  averageScore: number | null;
  goalsCompleted: number;
  goalsTotal: number;
}

/** The week-13 opener: wins first, analysis second. */
export function buildCelebration(weeks: (WeekScore | null)[], goals: GoalStatusLike[]): Celebration {
  const scored = weeks.filter((w): w is WeekScore => w !== null);
  const best = scored.reduce<WeekScore | null>(
    (bestSoFar, w) => (bestSoFar === null || w.scorePct > bestSoFar.scorePct ? w : bestSoFar),
    null,
  );
  return {
    bestWeek: best ? { week: best.week, scorePct: best.scorePct } : null,
    scoredWeeks: scored.length,
    averageScore: scored.length === 0 ? null : Math.round(scored.reduce((s, w) => s + w.scorePct, 0) / scored.length),
    goalsCompleted: goals.filter((g) => g.status === "achieved").length,
    goalsTotal: goals.length,
  };
}
