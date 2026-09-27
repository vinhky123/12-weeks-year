// Pure measurement rules: lag progress and the book's
// strategy-vs-execution diagnosis ("confronting the truth").

export type Diagnosis = "STRATEGY_PROBLEM" | "EXECUTION_PROBLEM" | null;

/**
 * Signed progress toward the target, direction-agnostic (weight down, revenue
 * up), clamped to [0, 1]. Null when the goal isn't measurable (target = start).
 */
export function lagProgress(start: number, target: number, current: number): number | null {
  const span = target - start;
  if (span === 0) return null;
  const raw = (current - start) / span;
  return Math.min(1, Math.max(0, raw));
}

/**
 * The book's diagnosis: if you're executing (≥85) but the lag isn't moving,
 * the strategy is wrong — change tactics. If execution itself is low (<65),
 * it's an execution problem — process control, not planning.
 */
export function diagnosisFor(averageScore: number | null, progress: number | null): Diagnosis {
  if (averageScore === null) return null;
  if (averageScore < 65) return "EXECUTION_PROBLEM";
  if (averageScore >= 85 && progress !== null && progress < 0.5) return "STRATEGY_PROBLEM";
  return null;
}
