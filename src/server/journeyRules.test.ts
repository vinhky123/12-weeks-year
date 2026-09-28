import { describe, expect, it } from "vitest";
import { journeyState, JOURNEY_STEP_IDS, type JourneySnapshot } from "./journeyRules";

const base: JourneySnapshot = {
  hasLivingVision: false,
  cycleStatus: "none",
  goalCount: 0,
  goalsWithoutTactics: 0,
  hasStrategicBlock: false,
  hasCommitment: false,
  currentWeek: 0,
  currentWeekPlanStatus: "none",
  unclosedWeek: null,
  hasWamForLastClosedWeek: false,
  hasReview: false,
  hasArchivedHistory: false,
};

/** Full foundation, cycle still planning — the "ready to start" state. */
const readyToStart: JourneySnapshot = {
  ...base,
  hasLivingVision: true,
  cycleStatus: "planning",
  goalCount: 2,
  goalsWithoutTactics: 0,
  hasStrategicBlock: true,
  hasCommitment: true,
};

/** Started cycle, mid week 3. */
const running = (over: Partial<JourneySnapshot>): JourneySnapshot => ({
  ...readyToStart, cycleStatus: "active", currentWeek: 3, ...over,
});

function statusOf(result: ReturnType<typeof journeyState>, id: string) {
  return result.steps.find((s) => s.id === id)?.status;
}

describe("journeyState — spec §7 scenario table", () => {
  it("emits all 14 steps in canonical order", () => {
    const r = journeyState(base);
    expect(r.steps.map((s) => s.id)).toEqual([...JOURNEY_STEP_IDS]);
    expect(r.steps).toHaveLength(14);
  });

  it("empty database → write_vision (current, foundation)", () => {
    const r = journeyState(base);
    expect(r.phase).toBe("foundation");
    expect(r.nextAction).toBe("write_vision");
    expect(statusOf(r, "write_vision")).toBe("current");
    expect(statusOf(r, "set_goals")).toBe("todo");
  });

  it("only the first unfinished foundation step is current", () => {
    const r = journeyState({ ...base, hasLivingVision: true });
    expect(statusOf(r, "write_vision")).toBe("done");
    expect(statusOf(r, "create_cycle")).toBe("current");
    expect(statusOf(r, "set_goals")).toBe("todo");
  });

  it("full foundation, cycle planning → start_cycle", () => {
    const r = journeyState(readyToStart);
    expect(r.phase).toBe("foundation");
    expect(r.nextAction).toBe("start_cycle");
    expect(statusOf(r, "write_vision")).toBe("done");
    expect(statusOf(r, "start_cycle")).toBe("current");
  });

  it("active cycle, week 3, no plan → plan_current_week", () => {
    const r = journeyState(running({ currentWeekPlanStatus: "none" }));
    expect(r.phase).toBe("execution");
    expect(r.nextAction).toBe("plan_current_week");
    expect(statusOf(r, "plan_current_week")).toBe("current");
  });

  it("active cycle, week 3, plan open mid-week → execute_today (close not owed yet)", () => {
    const r = journeyState(running({ currentWeekPlanStatus: "draft" }));
    expect(r.nextAction).toBe("execute_today");
    expect(statusOf(r, "execute_today")).toBe("current");
    expect(statusOf(r, "close_week")).toBe("done");
  });

  it("Monday of week 3, week 2 left open → close_week first", () => {
    const r = journeyState(running({ currentWeekPlanStatus: "none", unclosedWeek: 2 }));
    expect(r.nextAction).toBe("close_week");
    expect(statusOf(r, "close_week")).toBe("current");
    expect(statusOf(r, "plan_current_week")).toBe("current"); // also pending, lower priority
  });

  it("Sunday of week 5, plan open → close_week (unclosedWeek = 5)", () => {
    const r = journeyState(running({ currentWeek: 5, currentWeekPlanStatus: "draft", unclosedWeek: 5 }));
    expect(r.nextAction).toBe("close_week");
  });

  it("week 13, no review → completion phase, write_review", () => {
    const r = journeyState(running({ currentWeek: 13 }));
    expect(r.phase).toBe("completion");
    expect(r.nextAction).toBe("write_review");
    expect(statusOf(r, "write_review")).toBe("current");
  });

  it("archived, no successor → start_next_cycle", () => {
    const r = journeyState(running({
      cycleStatus: "archived", currentWeek: 14, currentWeekPlanStatus: "closed",
      hasReview: true, hasArchivedHistory: true,
    }));
    expect(r.phase).toBe("completion");
    expect(r.nextAction).toBe("start_next_cycle");
    expect(statusOf(r, "start_next_cycle")).toBe("current");
  });

  it("successor active, week closed Sunday night (after close, before next generate) → null — never write_review", () => {
    const r = journeyState(running({ currentWeek: 5, currentWeekPlanStatus: "closed", hasArchivedHistory: true }));
    expect(r.nextAction).toBeNull();
    expect(statusOf(r, "plan_current_week")).toBe("done");
    expect(statusOf(r, "execute_today")).toBe("done");
    expect(statusOf(r, "close_week")).toBe("done");
  });

  it("everything done except WAM → still null (wam never selected)", () => {
    const r = journeyState(running({ currentWeek: 5, currentWeekPlanStatus: "closed" }));
    expect(r.nextAction).toBeNull();
    expect(statusOf(r, "wam_report")).toBe("todo");
  });

  it("foundation gap mid-cycle stays visible as todo, not current", () => {
    const r = journeyState(running({ hasLivingVision: false, currentWeekPlanStatus: "draft" }));
    expect(statusOf(r, "write_vision")).toBe("todo");
    expect(r.nextAction).toBe("execute_today");
  });

  it("start_next_cycle done when focus cycle succeeds an archived one", () => {
    const r = journeyState(running({ currentWeek: 5, currentWeekPlanStatus: "closed", hasArchivedHistory: true }));
    expect(statusOf(r, "start_next_cycle")).toBe("done");
  });
});

// Spec §7 consistency guard: wherever nextRitual (the proven ordering) and the
// journey engine overlap, they must agree. Degenerate states (week 14 without
// archive, plans before the start date) are out of scope by design.
import { nextRitual, type RitualState } from "./planRules";

describe("journey nextAction stays consistent with nextRitual", () => {
  const ritualFor = (over: Partial<RitualState>): RitualState => ({
    hasActiveCycle: true, cycleStatus: "active", currentWeek: 3,
    hasCurrentWeekPlan: true, lastWeekPlanClosed: true, reviewWeek: false, ...over,
  });

  it.each([
    ["execute", running({ currentWeekPlanStatus: "draft" }), ritualFor({}), "execute_today"],
    ["close before plan", running({ currentWeekPlanStatus: "none", unclosedWeek: 2 }), ritualFor({ hasCurrentWeekPlan: false, lastWeekPlanClosed: false }), "close_last_week"],
    ["plan", running({ currentWeekPlanStatus: "none" }), ritualFor({ hasCurrentWeekPlan: false }), "plan_week"],
    ["review week", running({ currentWeek: 13 }), ritualFor({ currentWeek: 13, reviewWeek: true }), "review_mode"],
    ["not started", readyToStart, ritualFor({ cycleStatus: "planning", currentWeek: 0, hasCurrentWeekPlan: false }), "start_cycle"],
    ["no cycle at all", base, { hasActiveCycle: false, cycleStatus: "none", currentWeek: 0, hasCurrentWeekPlan: false, lastWeekPlanClosed: true, reviewWeek: false }, "create_cycle"],
  ] as const)("agrees on %s → %s", (_name, snapshot, ritual, expected) => {
    expect(nextRitual(ritual as RitualState)).toBe(expected);
    const journeyToRitual: Record<string, string> = {
      execute_today: "execute_today", close_week: "close_last_week", plan_current_week: "plan_week",
      write_review: "review_mode", start_cycle: "start_cycle",
      // the journey splits ritual's create_cycle into finer pre-cycle steps
      write_vision: "create_cycle", create_cycle: "create_cycle",
    };
    const na = journeyState(snapshot as JourneySnapshot).nextAction!;
    expect(journeyToRitual[na]).toBe(expected);
  });
});

import { JOURNEY_DTO, JOURNEY_STEP_IDS as CONTRACT_STEP_IDS } from "../lib/contracts";

describe("journey contracts stay in sync with the rules", () => {
  it("step ids match between contracts.ts and journeyRules.ts", () => {
    expect([...CONTRACT_STEP_IDS]).toEqual([...JOURNEY_STEP_IDS]);
  });

  it("journeyState output parses as JourneyDto (with service-level context added)", () => {
    const r = journeyState(base);
    const payload = {
      ...r,
      nextAction: r.nextAction ? { id: r.nextAction } : null,
      context: { cycleName: null, weekNumber: 0, unclosedWeek: null },
    };
    expect(() => JOURNEY_DTO.parse(payload)).not.toThrow();
    expect(JOURNEY_DTO.parse(payload).phase).toBe("foundation");
  });
});
