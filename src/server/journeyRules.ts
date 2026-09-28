// Pure journey state for the guide — Foundation -> Execution -> Completion.
// Snapshot in, step statuses out. No I/O; the service assembles the snapshot
// from real data. nextAction is only ever picked within the ACTIVE phase, so
// the engine can never suggest a completion step during weeks 1-12.
// wam_report is deliberately never selectable (optional ritual).

import { REVIEW_WEEK } from "./cycleMath";

export const JOURNEY_STEP_IDS = [
  "write_vision", "create_cycle", "set_goals", "add_tactics", "design_model_week",
  "write_commitment", "start_cycle", "plan_current_week", "execute_today", "close_week",
  "wam_report", "write_review", "archive_cycle", "start_next_cycle",
] as const;

export type JourneyStepId = (typeof JOURNEY_STEP_IDS)[number];
export type JourneyStepStatus = "done" | "current" | "todo";
export type JourneyPhase = "foundation" | "execution" | "completion";

const FOUNDATION_ORDER = [
  "write_vision", "create_cycle", "set_goals", "add_tactics",
  "design_model_week", "write_commitment", "start_cycle",
] as const satisfies readonly JourneyStepId[];

// nextAction priority within execution — mirrors nextRitual: close -> plan -> execute.
const EXECUTION_PRIORITY = ["close_week", "plan_current_week", "execute_today"] as const;

const COMPLETION_ORDER = ["write_review", "archive_cycle", "start_next_cycle"] as const;

export interface JourneySnapshot {
  // foundation
  hasLivingVision: boolean;
  cycleStatus: "none" | "planning" | "active" | "review" | "archived";
  goalCount: number;
  goalsWithoutTactics: number;
  hasStrategicBlock: boolean;
  hasCommitment: boolean;
  // execution (current week: 0 pre, 1-12 execution, 13 review, 14 after)
  currentWeek: number;
  currentWeekPlanStatus: "none" | "draft" | "closed";
  /** Latest week that should be closed but isn't (prior week left open, or current week ended with plan open). */
  unclosedWeek: number | null;
  hasWamForLastClosedWeek: boolean;
  // completion
  hasReview: boolean;
  hasArchivedHistory: boolean;
}

export interface JourneyStep {
  id: JourneyStepId;
  status: JourneyStepStatus;
}

export interface JourneyResult {
  phase: JourneyPhase;
  steps: JourneyStep[];
  nextAction: JourneyStepId | null;
}

export function journeyState(s: JourneySnapshot): JourneyResult {
  const started = s.cycleStatus === "active" || s.cycleStatus === "review" || s.cycleStatus === "archived";
  const phase: JourneyPhase =
    s.cycleStatus === "none" || s.cycleStatus === "planning"
      ? "foundation"
      : s.cycleStatus === "archived" || s.cycleStatus === "review" || s.currentWeek >= REVIEW_WEEK
        ? "completion"
        : "execution";

  // close_week is "done" when nothing is owed: an open current week mid-week is
  // not a gap — closing only becomes due once the week has ended.
  const done: Record<JourneyStepId, boolean> = {
    write_vision: s.hasLivingVision,
    create_cycle: s.cycleStatus !== "none",
    set_goals: s.goalCount >= 1,
    add_tactics: s.goalCount >= 1 && s.goalsWithoutTactics === 0,
    design_model_week: s.hasStrategicBlock,
    write_commitment: s.hasCommitment,
    start_cycle: started,
    plan_current_week: s.currentWeekPlanStatus !== "none",
    execute_today: s.currentWeekPlanStatus === "closed",
    close_week: s.unclosedWeek === null,
    wam_report: s.hasWamForLastClosedWeek,
    write_review: s.hasReview,
    archive_cycle: s.cycleStatus === "archived",
    start_next_cycle: started && s.cycleStatus !== "archived" && s.hasArchivedHistory,
  };

  const current = new Set<JourneyStepId>();
  const firstFoundationGap = FOUNDATION_ORDER.find((id) => !done[id]);
  if (firstFoundationGap && phase === "foundation") current.add(firstFoundationGap);
  // Independent per spec §3.1 (rows 8-10): each step's "current" condition is
  // evaluated on its own, so several execution steps can be current at once
  // (e.g. close_week and plan_current_week when week 2 was left open).
  if (phase === "execution") {
    if (s.unclosedWeek !== null) current.add("close_week");
    if (s.currentWeekPlanStatus === "none") current.add("plan_current_week");
    if (s.currentWeekPlanStatus === "draft") current.add("execute_today");
  }
  const firstCompletionGap = COMPLETION_ORDER.find((id) => !done[id]);
  if (firstCompletionGap && phase === "completion") current.add(firstCompletionGap);

  const steps: JourneyStep[] = JOURNEY_STEP_IDS.map((id) => ({
    id,
    status: done[id] ? "done" : current.has(id) ? "current" : "todo",
  }));

  let nextAction: JourneyStepId | null = null;
  if (phase === "execution") {
    nextAction = EXECUTION_PRIORITY.find((id) => !done[id]) ?? null;
  } else {
    const order = phase === "foundation" ? FOUNDATION_ORDER : COMPLETION_ORDER;
    nextAction = order.find((id) => !done[id]) ?? null;
  }

  return { phase, steps, nextAction };
}
