// Pure measurement rules. Diagnosis thresholds are app heuristics, not book rules.

export type DiagnosisStatus = "INSUFFICIENT_DATA" | "EXECUTION_CONCERN" | "STRATEGY_CONCERN" | "REVIEW";
export type ExecutionObservation = { week: number; scorePct: number };
export type LagObservation = { week: number; value: number };

export interface DiagnosisResult {
  status: DiagnosisStatus;
  execution: ExecutionObservation[];
  lag: LagObservation[];
}

/**
 * Signed progress toward the target, direction-agnostic (weight down, revenue
 * up), clamped to [0, 1]. Null when not measurable (target = start) or when
 * there is no data yet (current = null).
 */
export function lagProgress(start: number, target: number, current: number | null): number | null {
  if (current === null) return null;
  const span = target - start;
  if (span === 0) return null;
  const raw = (current - start) / span;
  return Math.min(1, Math.max(0, raw));
}

/** Interpret only the latest two closed observations for execution and lag. */
export function diagnosisFor(
  executionObservations: ExecutionObservation[],
  lagObservations: LagObservation[],
  start: number,
  target: number,
): DiagnosisResult {
  const execution = [...executionObservations].sort((a, b) => a.week - b.week).slice(-2);
  const lag = [...lagObservations].sort((a, b) => a.week - b.week).slice(-2);

  if (execution.length < 2 || lag.length < 2) {
    return { status: "INSUFFICIENT_DATA", execution: [], lag: [] };
  }

  const averageExecution = execution.reduce((sum, observation) => sum + observation.scorePct, 0) / execution.length;
  if (averageExecution < 65) return { status: "EXECUTION_CONCERN", execution, lag };

  const previousProgress = lagProgress(start, target, lag[0]!.value);
  const latestProgress = lagProgress(start, target, lag[1]!.value);
  if (
    averageExecution >= 85 &&
    previousProgress !== null &&
    latestProgress !== null &&
    latestProgress < 1 &&
    latestProgress <= previousProgress
  ) {
    return { status: "STRATEGY_CONCERN", execution, lag };
  }

  return { status: "REVIEW", execution, lag };
}
