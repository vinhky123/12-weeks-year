# Phase 5A — Journey Engine & Actionable Guide (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the state-aware "You are here" journey engine (pure rules + service + `GET /api/guide/journey`), the bilingual worked-example data module, and the FE spec for Antigravity — everything except UI implementation (that is 5B).

**Architecture:** Follows the house layering: pure domain module `src/server/journeyRules.ts` (no I/O, snapshot in → statuses out) → `guideService` assembles the snapshot from existing repositories → thin route handler → zod DTOs in `src/lib/contracts.ts` (the only UI-facing import). The API returns **ids and statuses only** — all prose (bilingual en/vi) lives client-side. Spec: `docs/superpowers/specs/2026-09-26-guide-journey-design.md`.

**Tech Stack:** Next.js 15.5 App Router · TypeScript 5 strict · better-sqlite3 + Drizzle · zod · Vitest.

## Global Constraints

- TypeScript is **pinned to 5.x** — never `npm install typescript@7` (TS7's native compiler breaks Next config loading).
- All dates are UTC `YYYY-MM-DD` strings; the only clock access is injected `today` / `todayIso()`.
- The `x-twy-today` request header is the time-travel test hook; the UI never sends it.
- One-import rule: UI code imports types only from `src/lib/contracts.ts`; `contracts.ts` never imports from `src/server`.
- `journeyRules.ts` is pure: no DB, no clock, no imports beyond `./cycleMath`.
- Every user-facing string authored in this phase is bilingual `{en, vi}` (inline conditionals or `Bi` objects).
- Run tests: `npm test` (all) · `npx vitest run <file>` (one). Shell is Git Bash on Windows.
- Commit style: conventional commits (`feat:`, `docs:`, `chore:`), one commit per task.
- The engine never selects `wam_report` as `nextAction`, and `nextAction` is only ever picked **within the active phase** (never a completion step during weeks 1–12).

---

### Task 1: `journeyRules.ts` — pure journey state machine (TDD)

**Files:**
- Create: `src/server/journeyRules.ts`
- Test: `src/server/journeyRules.test.ts`

**Interfaces:**
- Consumes: `REVIEW_WEEK` from `./cycleMath`.
- Produces: `journeyState(snapshot: JourneySnapshot): JourneyResult`, `JOURNEY_STEP_IDS` (readonly 14-tuple), types `JourneyStepId`, `JourneySnapshot`, `JourneyStep`, `JourneyResult`. Task 3's service and Task 2's contracts depend on these names.

- [ ] **Step 1: Write the failing tests** — create `src/server/journeyRules.test.ts` with the spec §7 scenario table:

```ts
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/server/journeyRules.test.ts`
Expected: FAIL — cannot resolve `./journeyRules`.

- [ ] **Step 3: Write the implementation** — create `src/server/journeyRules.ts`:

```ts
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
  if (phase === "execution") {
    if (s.unclosedWeek !== null) current.add("close_week");
    else if (s.currentWeekPlanStatus === "none") current.add("plan_current_week");
    else if (s.currentWeekPlanStatus !== "closed") current.add("execute_today");
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
```

Note the one deliberate reconciliation with the spec's §3.1 wording: `close_week` is **done when nothing is owed** (`unclosedWeek === null`), not only when this week is closed — the spec's own scenario table ("Monday evening → null") requires it.

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run src/server/journeyRules.test.ts`
Expected: PASS — all tests green (scenario table + nextRitual consistency guard).

- [ ] **Step 5: Commit**

```bash
git add src/server/journeyRules.ts src/server/journeyRules.test.ts
git commit -m "feat: journey engine — pure 14-step state machine for the guide (TDD)"
```

---

### Task 2: `contracts.ts` — journey DTOs + rules/contracts sync test

**Files:**
- Modify: `src/lib/contracts.ts` (append a Phase 5 section after the existing Phase 4 export block)
- Test: extend `src/server/journeyRules.test.ts`

**Interfaces:**
- Consumes: `JOURNEY_STEP_IDS` from Task 1.
- Produces: `JOURNEY_STEP_ID_SCHEMA`, `JOURNEY_STEP_DTO`/`JourneyStepDto`, `JOURNEY_DTO`/`JourneyDto` — Task 3's route response and Task 5's FE spec data contract use these names. `JourneyDto.nextAction` is `{ id: JourneyStepId } | null` and `JourneyDto.context` is `{ cycleName: string | null; weekNumber: number; unclosedWeek: number | null }`.

- [ ] **Step 1: Write the failing sync test** — append to `src/server/journeyRules.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/server/journeyRules.test.ts`
Expected: FAIL — `../lib/contracts` has no export named `JOURNEY_STEP_IDS`.

- [ ] **Step 3: Add the contracts** — append to `src/lib/contracts.ts` (keep the one-import rule: no server imports; the sync test above is the guard):

```ts
// --- Phase 5: guide journey (server sends ids + statuses only; prose lives in FE STEP_META) ---
// Must mirror src/server/journeyRules.ts JOURNEY_STEP_IDS exactly — sync-tested.
export const JOURNEY_STEP_IDS = [
  "write_vision", "create_cycle", "set_goals", "add_tactics", "design_model_week",
  "write_commitment", "start_cycle", "plan_current_week", "execute_today", "close_week",
  "wam_report", "write_review", "archive_cycle", "start_next_cycle",
] as const;
export const JOURNEY_STEP_ID_SCHEMA = z.enum(JOURNEY_STEP_IDS);
export type JourneyStepId = (typeof JOURNEY_STEP_IDS)[number];

export const JOURNEY_STEP_DTO = z.object({
  id: JOURNEY_STEP_ID_SCHEMA,
  status: z.enum(["done", "current", "todo"]),
});
export type JourneyStepDto = z.infer<typeof JOURNEY_STEP_DTO>;

export const JOURNEY_DTO = z.object({
  phase: z.enum(["foundation", "execution", "completion"]),
  steps: z.array(JOURNEY_STEP_DTO),
  nextAction: z.object({ id: JOURNEY_STEP_ID_SCHEMA }).nullable(),
  context: z.object({
    cycleName: z.string().nullable(),
    weekNumber: z.number().int(),
    unclosedWeek: z.number().int().nullable(),
  }),
});
export type JourneyDto = z.infer<typeof JOURNEY_DTO>;
```

- [ ] **Step 4: Run tests + typecheck**

Run: `npx vitest run src/server/journeyRules.test.ts && npx tsc --noEmit`
Expected: PASS — 16 tests; tsc clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/contracts.ts src/server/journeyRules.test.ts
git commit -m "feat: journey DTO contracts + rules/contracts sync test"
```

---

### Task 3: `guideService` + `GET /api/guide/journey` + contract tests

**Files:**
- Create: `src/server/services/guideService.ts`
- Create: `src/app/api/guide/journey/route.ts`
- Test: `tests/api/phase5.test.ts`

**Interfaces:**
- Consumes: `journeyState` (Task 1); `cyclesRepo`, `planRepo`, `executionRepo`; `getVision` from `visionService`; `cycleWeekNumber`, `weekEnd`, `diffDays`, `WEEKS_IN_CYCLE` from `cycleMath`; `handle`/`todayFrom` from `apiHelpers`.
- Produces: `guideService.getJourney(h: DbHandles, today?: string): JourneyDto` and route `GET /api/guide/journey` → `{ journey: JourneyDto }`. Tasks 5 and 6 reference this endpoint.

- [ ] **Step 1: Write the failing contract tests** — create `tests/api/phase5.test.ts`:

```ts
/**
 * Phase 5 — guide journey contract: the "You are here" engine, walked through
 * the real route handlers against a temp database, exactly as the UI will.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

process.env.TWY_DB_PATH = path.join(os.tmpdir(), `twy-journey-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);

const journeyRoute = await import("../../src/app/api/guide/journey/route");
const visionRoute = await import("../../src/app/api/vision/route");
const cyclesRoute = await import("../../src/app/api/cycles/route");
const startRoute = await import("../../src/app/api/cycles/[id]/start/route");
const goalsRoute = await import("../../src/app/api/cycles/[id]/goals/route");
const tacticsRoute = await import("../../src/app/api/goals/[id]/tactics/route");
const weeksRoute = await import("../../src/app/api/cycles/[id]/weeks/[week]/route");
const generateRoute = await import("../../src/app/api/cycles/[id]/weeks/[week]/generate/route");
const closeRoute = await import("../../src/app/api/week-plans/[id]/close/route");
const reviewRoute = await import("../../src/app/api/cycles/[id]/review/route");
const archiveRoute = await import("../../src/app/api/cycles/[id]/archive/route");
const nextRoute = await import("../../src/app/api/cycles/[id]/next/route");
const modelWeekRoute = await import("../../src/app/api/model-week/route");
const commitmentRoute = await import("../../src/app/api/cycles/[id]/commitment/route");

function req(method: string, url: string, bodyJson?: unknown, today?: string): Request {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { "content-type": "application/json", ...(today ? { "x-twy-today": today } : {}) },
    body: bodyJson === undefined ? undefined : JSON.stringify(bodyJson),
  });
}

function ctx(p: Record<string, string | number>): { params: Promise<any> } {
  const resolved: Record<string, string> = {};
  for (const [k, v] of Object.entries(p)) resolved[k] = String(v);
  return { params: Promise.resolve(resolved) };
}

async function json(res: Response) {
  return (await res.json()) as Record<string, any>;
}

async function journey(today?: string) {
  return json(await journeyRoute.GET(req("GET", "/api/guide/journey", undefined, today))).journey;
}

describe("guide journey (Phase 5 contract)", () => {
  it("empty database → foundation, write_vision, null cycle context", async () => {
    const j = await journey();
    expect(j.phase).toBe("foundation");
    expect(j.steps).toHaveLength(14);
    expect(j.nextAction).toEqual({ id: "write_vision" });
    expect(j.context).toEqual({ cycleName: null, weekNumber: 0, unclosedWeek: null });
  });

  it("full foundation, planning → start_cycle", async () => {
    await visionRoute.PUT(req("PUT", "/api/vision", { longTerm: "A life on my own terms." }));
    const cycle = json(await cyclesRoute.POST(req("POST", "/api/cycles", { name: "Journey cycle" })));
    const goal = json(
      await goalsRoute.POST(
        req("POST", `/api/cycles/${cycle.id}/goals`, {
          title: "Lose 10 lbs", why: "Energy", lagMetricName: "Weight", lagUnit: "lbs", lagStart: 180, lagTarget: 170,
        }),
        ctx({ id: cycle.id }),
      ),
    );
    await tacticsRoute.POST(
      req("POST", `/api/goals/${goal.id}/tactics`, {
        text: "Strength train 30 min", duePattern: { type: "EVERY_WEEK", timesPerWeek: 3 },
      }),
      ctx({ id: goal.id }),
    );
    await modelWeekRoute.POST(req("POST", "/api/model-week", { type: "STRATEGIC", dayOfWeek: 0, startMinute: 540, durationMinutes: 180 }));
    await commitmentRoute.PUT(req("PUT", `/api/cycles/${cycle.id}/commitment`, { costs: "Early mornings", statement: "I choose to finish." }), ctx({ id: cycle.id }));

    const j = await journey();
    expect(j.phase).toBe("foundation");
    expect(j.nextAction).toEqual({ id: "start_cycle" });
    expect(j.context.cycleName).toBe("Journey cycle");
  });

  it("started + week 1 generated, mid-week → execute_today", async () => {
    const active = json(await (await import("../../src/app/api/cycles/active/route")).GET(req("GET", "/api/cycles/active")));
    await startRoute.POST(req("POST", `/api/cycles/${active.cycle.id}/start`), ctx({ id: active.cycle.id }));
    await generateRoute.POST(req("POST", `/api/cycles/${active.cycle.id}/weeks/1/generate`), ctx({ id: active.cycle.id, week: 1 }));

    const j = await journey(active.cycle.startDate); // Monday of week 1
    expect(j.phase).toBe("execution");
    expect(j.nextAction).toEqual({ id: "execute_today" });
    expect(j.context).toMatchObject({ weekNumber: 1, unclosedWeek: null });
  });

  it("Sunday of week 1, plan still open → close_week with unclosedWeek=1", async () => {
    const active = json(await (await import("../../src/app/api/cycles/active/route")).GET(req("GET", "/api/cycles/active")));
    const sunday = addDays(active.cycle.startDate, 6);
    const j = await journey(sunday);
    expect(j.nextAction).toEqual({ id: "close_week" });
    expect(j.context.unclosedWeek).toBe(1);
  });

  it("week 1 closed (Sunday night, before next generate) → null; after generating week 2 → execute_today", async () => {
    const active = json(await (await import("../../src/app/api/cycles/active/route")).GET(req("GET", "/api/cycles/active")));
    const detail = json(await weeksRoute.GET(req("GET", `/api/cycles/${active.cycle.id}/weeks/1`, undefined, addDays(active.cycle.startDate, 6)), ctx({ id: active.cycle.id, week: 1 })));
    await closeRoute.POST(req("POST", `/api/week-plans/${detail.plan.id}/close`, { reflection: "Honest week." }, addDays(active.cycle.startDate, 6)), ctx({ id: detail.plan.id }));

    // The null window: week 1 closed, week 2 not yet generated — nothing is owed tonight.
    const jClosed = await journey(addDays(active.cycle.startDate, 6)); // Sunday of week 1
    expect(jClosed.nextAction).toBeNull();
    expect(jClosed.steps.find((s: any) => s.id === "wam_report").status).toBe("todo");

    // Monday: generate week 2 → execution resumes.
    await generateRoute.POST(req("POST", `/api/cycles/${active.cycle.id}/weeks/2/generate`, undefined, addDays(active.cycle.startDate, 7)), ctx({ id: active.cycle.id, week: 2 }));
    const jMonday = await journey(addDays(active.cycle.startDate, 7));
    expect(jMonday.nextAction).toEqual({ id: "execute_today" });
    expect(jMonday.steps.find((s: any) => s.id === "execute_today").status).toBe("current");
  });

  it("week 13 → write_review; then archive → start_next_cycle; then successor → foundation again", async () => {
    const active = json(await (await import("../../src/app/api/cycles/active/route")).GET(req("GET", "/api/cycles/active")));
    const week13 = addDays(active.cycle.startDate, 84);
    const j13 = await journey(week13);
    expect(j13.phase).toBe("completion");
    expect(j13.nextAction).toEqual({ id: "write_review" });

    await reviewRoute.PUT(
      req("PUT", `/api/cycles/${active.cycle.id}/review`, {
        qol: [
          { area: "Spiritual", rating: 6 }, { area: "Spouse/Key Relationship", rating: 7 }, { area: "Family", rating: 7 },
          { area: "Business", rating: 6 }, { area: "Personal", rating: 6 }, { area: "Physical", rating: 7 },
        ],
        disciplines: [
          { name: "Vision", rating: 7 }, { name: "12-Week Planning", rating: 8 },
          { name: "Weekly Routine (Score · Plan · WAM)", rating: 7 }, { name: "Performance time (Blocks)", rating: 6 },
          { name: "Key Measures", rating: 7 },
        ],
        breakthroughs: "The score made the truth impossible to hide.",
      }, week13),
      ctx({ id: active.cycle.id }),
    );
    await archiveRoute.POST(req("POST", `/api/cycles/${active.cycle.id}/archive`, undefined, week13), ctx({ id: active.cycle.id }));

    const jArchived = await journey(week13);
    expect(jArchived.nextAction).toEqual({ id: "start_next_cycle" });

    const goalId = json(await goalsRoute.GET(req("GET", `/api/cycles/${active.cycle.id}/goals`), ctx({ id: active.cycle.id }))).goals[0].id;
    await nextRoute.POST(req("POST", `/api/cycles/${active.cycle.id}/next`, { name: "Journey II", carryoverGoalIds: [goalId] }, week13), ctx({ id: active.cycle.id }));
    const jNext = await journey(week13);
    expect(jNext.phase).toBe("foundation");
    expect(jNext.nextAction).toEqual({ id: "add_tactics" }); // carried goal has no tactics
  });
});

function addDays(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

afterAll(() => {
  fs.rmSync(path.dirname(process.env.TWY_DB_PATH!), { recursive: true, force: true });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/api/phase5.test.ts`
Expected: FAIL — cannot resolve `../../src/app/api/guide/journey/route`.

- [ ] **Step 3: Write the service** — create `src/server/services/guideService.ts`:

```ts
// Guide journey service — assembles the JourneySnapshot from real data and
// applies the pure rules. The focus cycle mirrors buildDashboard: active
// cycle first, then settings.currentCycleId, then the most recent
// non-archived cycle (e.g. freshly created, still planning).
import { and, eq, isNull, or } from "drizzle-orm";
import { cycleWeekNumber, diffDays, todayIso, weekEnd, WEEKS_IN_CYCLE } from "../cycleMath";
import type { DbHandles } from "../db/index";
import * as cyclesRepo from "../db/repositories/cycles";
import * as executionRepo from "../db/repositories/execution";
import * as planRepo from "../db/repositories/plan";
import { blockTemplates, commitments, cycleReviews, settings as settingsTable, wamReports } from "../db/schema";
import { journeyState, type JourneySnapshot } from "../journeyRules";
import { getVision } from "./visionService";

const EMPTY_SNAPSHOT: JourneySnapshot = {
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

export function getJourney(h: DbHandles, today = todayIso()) {
  let cycle = cyclesRepo.findActiveCycle(h);
  if (!cycle) {
    const settingsRow = h.db.select().from(settingsTable).where(eq(settingsTable.id, 1)).get();
    if (settingsRow?.currentCycleId) cycle = cyclesRepo.getCycle(h, settingsRow.currentCycleId) ?? undefined;
  }
  if (!cycle) {
    const open = cyclesRepo.listCycles(h).filter((c) => c.status !== "archived");
    cycle = open[open.length - 1];
  }

  if (!cycle) {
    const r = journeyState(EMPTY_SNAPSHOT);
    return toDto(r, { cycleName: null, weekNumber: 0, unclosedWeek: null });
  }

  const vision = getVision(h);
  const goals = planRepo.listGoals(h, cycle.id);
  const tacticCount = new Map<number, number>();
  for (const tactic of planRepo.listTacticsByCycle(h, cycle.id)) {
    tacticCount.set(tactic.goalId, (tacticCount.get(tactic.goalId) ?? 0) + 1);
  }

  const currentWeek = cycleWeekNumber(today, cycle.startDate);
  const plan = executionRepo.findWeekPlan(h, cycle.id, Math.min(Math.max(currentWeek, 1), WEEKS_IN_CYCLE));

  let unclosedWeek: number | null = null;
  if (currentWeek >= 2) {
    const prior = executionRepo.findWeekPlan(h, cycle.id, currentWeek - 1);
    if (prior && prior.status !== "closed") unclosedWeek = currentWeek - 1;
  }
  if (
    unclosedWeek === null &&
    currentWeek >= 1 && currentWeek <= WEEKS_IN_CYCLE &&
    plan && plan.status !== "closed" &&
    diffDays(today, weekEnd(cycle.startDate, currentWeek)) >= 0
  ) {
    unclosedWeek = currentWeek;
  }

  const closedWeeks = executionRepo.listWeekPlans(h, cycle.id).filter((p) => p.status === "closed");
  const lastClosedWeek = closedWeeks.length ? Math.max(...closedWeeks.map((p) => p.weekNumber)) : null;

  const snapshot: JourneySnapshot = {
    hasLivingVision:
      !!vision &&
      [vision.longTerm, vision.threeYear, vision.cycleConnection].some((t) => t.trim().length > 0),
    cycleStatus: cycle.status as JourneySnapshot["cycleStatus"],
    goalCount: goals.length,
    goalsWithoutTactics: goals.filter((g) => (tacticCount.get(g.id) ?? 0) === 0).length,
    hasStrategicBlock: !!h.db
      .select()
      .from(blockTemplates)
      .where(and(eq(blockTemplates.type, "STRATEGIC"), or(isNull(blockTemplates.cycleId), eq(blockTemplates.cycleId, cycle.id))))
      .get(),
    hasCommitment: !!h.db.select().from(commitments).where(eq(commitments.cycleId, cycle.id)).get(),
    currentWeek,
    currentWeekPlanStatus: plan?.status ?? "none",
    unclosedWeek,
    hasWamForLastClosedWeek:
      lastClosedWeek !== null &&
      !!h.db
        .select()
        .from(wamReports)
        .where(and(eq(wamReports.cycleId, cycle.id), eq(wamReports.weekNumber, lastClosedWeek)))
        .get(),
    hasReview: !!h.db.select().from(cycleReviews).where(eq(cycleReviews.cycleId, cycle.id)).get(),
    hasArchivedHistory: cyclesRepo.listCycles(h).some((c) => c.status === "archived"),
  };

  return toDto(journeyState(snapshot), { cycleName: cycle.name, weekNumber: currentWeek, unclosedWeek });
}

function toDto(
  r: ReturnType<typeof journeyState>,
  context: { cycleName: string | null; weekNumber: number; unclosedWeek: number | null },
) {
  return {
    ...r,
    nextAction: r.nextAction ? { id: r.nextAction } : null,
    context,
  };
}
```

- [ ] **Step 4: Write the route** — create `src/app/api/guide/journey/route.ts`:

```ts
import { handle, todayFrom } from "@/server/apiHelpers";
import * as guideService from "@/server/services/guideService";

export async function GET(req: Request) {
  return handle((h) => ({ journey: guideService.getJourney(h, todayFrom(req)) }));
}
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npx vitest run tests/api/phase5.test.ts && npx tsc --noEmit`
Expected: PASS — 6 tests; tsc clean. If the `close` route rejects `{ reflection }` alone, check `WEEK_PLAN_CLOSE_SCHEMA` in contracts and send the minimal valid body (do not loosen the schema).

- [ ] **Step 6: Commit**

```bash
git add src/server/services/guideService.ts src/app/api/guide/journey/route.ts tests/api/phase5.test.ts
git commit -m "feat: guide service + GET /api/guide/journey (state-aware You-Are-Here)"
```

---

### Task 4: `example-plan.ts` — the worked example (bilingual, static)

**Files:**
- Create: `src/lib/example-plan.ts`
- Test: `src/lib/example-plan.test.ts`

**Interfaces:**
- Consumes: `DUE_PATTERN_SCHEMA`, type `DuePattern` from `@/lib/contracts`.
- Produces: type `Bi = { en: string; vi: string }`; `EXAMPLE_VISION`; `EXAMPLE_GOALS: ExampleGoal[]` (with nested `ExampleTactic[]`); `EXAMPLE_WEEK1_ITEMS: { id: string; label: Bi; dayOfWeek: number; done: boolean; goalId: string }[]`; `EXAMPLE_TODAY: { projectedScorePct: number; openCount: number; doneToday: number }`; `EXAMPLE_WEEK1_CLOSE = { scorePct: 92; reflection: Bi }`; `EXAMPLE_VALLEY = { week: 4; scorePct: 58; whatChanged: Bi }`; `EXAMPLE_REVIEW = { grades: { goalId: string; percentComplete: number; achieved: boolean }[]; breakthrough: Bi }`. Task 5's FE spec references these exports by name.

- [ ] **Step 1: Write the failing shape test** — create `src/lib/example-plan.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DUE_PATTERN_SCHEMA } from "./contracts";
import { EXAMPLE_GOALS, EXAMPLE_WEEK1_ITEMS } from "./example-plan";

describe("worked example data (book-faithful shape)", () => {
  it("at most 3 goals (the vital few), each with 1+ tactics", () => {
    expect(EXAMPLE_GOALS.length).toBeLessThanOrEqual(3);
    expect(EXAMPLE_GOALS.length).toBeGreaterThanOrEqual(1);
    for (const g of EXAMPLE_GOALS) expect(g.tactics.length).toBeGreaterThanOrEqual(1);
  });

  it("every due pattern is a valid DuePattern", () => {
    for (const g of EXAMPLE_GOALS) {
      for (const t of g.tactics) expect(() => DUE_PATTERN_SCHEMA.parse(t.duePattern)).not.toThrow();
    }
  });

  it("every bilingual field has non-empty en and vi", () => {
    const check = (b: { en: string; vi: string }) => expect(b.en.trim().length && b.vi.trim().length).toBeGreaterThan(0);
    for (const g of EXAMPLE_GOALS) {
      check(g.title); check(g.why);
      for (const t of g.tactics) check(t.text);
    }
    for (const i of EXAMPLE_WEEK1_ITEMS) {
      check(i.label);
      expect(i.dayOfWeek).toBeGreaterThanOrEqual(0);
      expect(i.dayOfWeek).toBeLessThanOrEqual(6);
    }
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/example-plan.test.ts`
Expected: FAIL — cannot resolve `./example-plan`.

- [ ] **Step 3: Write the data** — create `src/lib/example-plan.ts` with exactly this content:

```ts
// Static worked example for the /guide page — "Minh's first 12-week year".
// Presentational only: shaped like the real DTOs so the FE can reuse card
// components inside a clearly-labeled EXAMPLE frame. No API, no server code.
import type { DuePattern } from "./contracts";

export type Bi = { en: string; vi: string };

export const EXAMPLE_VISION = {
  longTerm: {
    en: "A healthy builder: work I own, a body that carries me, mornings I choose.",
    vi: "Người kiến tạo khỏe mạnh: công việc của chính mình, một cơ thể bền bỉ, những buổi sáng tự chọn.",
  },
  threeYear: {
    en: "Freelance income covers rent; strength training is just what I do.",
    vi: "Thu nhập freelance đủ tiền thuê nhà; tập tạ đã thành thói quen mặc định.",
  },
  cycleConnection: {
    en: "This cycle proves both: 10 lbs off, first $500 earned.",
    vi: "Chu kỳ này chứng minh cả hai: giảm 10 lbs, kiếm 500 đô đầu tiên.",
  },
};

export interface ExampleTactic {
  id: string;
  text: Bi;
  duePattern: DuePattern;
}

export interface ExampleGoal {
  id: string;
  title: Bi;
  why: Bi;
  lagMetricName: string;
  lagUnit: string;
  lagStart: number;
  lagTarget: number;
  deadlineWeek: number;
  tactics: ExampleTactic[];
}

export const EXAMPLE_GOALS: ExampleGoal[] = [
  {
    id: "g-health",
    title: { en: "Get to 170 lbs", vi: "Về 170 lbs" },
    why: {
      en: "Energy for everything else — and proof I can keep a promise to myself.",
      vi: "Có năng lượng cho mọi việc còn lại — và chứng minh tôi giữ được lời hứa với chính mình.",
    },
    lagMetricName: "Weight", lagUnit: "lbs", lagStart: 180, lagTarget: 170, deadlineWeek: 12,
    tactics: [
      { id: "t-lift", text: { en: "Perform 30-min strength training", vi: "Tập tạ 30 phút" }, duePattern: { type: "EVERY_WEEK", timesPerWeek: 3 } },
      { id: "t-log", text: { en: "Log meals in the app", vi: "Ghi bữa ăn vào app" }, duePattern: { type: "EVERY_WEEK", timesPerWeek: 6 } },
    ],
  },
  {
    id: "g-side",
    title: { en: "Earn first $500 from the side project", vi: "Kiếm 500 đô đầu tiên từ dự án phụ" },
    why: {
      en: "The first dollar proves the path; $500 proves it repeats.",
      vi: "Đô đầu tiên chứng minh con đường tồn tại; 500 đô chứng minh nó lặp lại được.",
    },
    lagMetricName: "Revenue", lagUnit: "$", lagStart: 0, lagTarget: 500, deadlineWeek: 12,
    tactics: [
      { id: "t-ship", text: { en: "Ship one customer-facing improvement", vi: "Ship một cải tiến cho người dùng" }, duePattern: { type: "EVERY_WEEK", timesPerWeek: 2 } },
      { id: "t-outreach", text: { en: "Send 5 outreach messages", vi: "Gửi 5 tin nhắn tiếp cận khách" }, duePattern: { type: "EVERY_WEEK", timesPerWeek: 3 } },
      { id: "t-launch", text: { en: "Run the launch week", vi: "Chạy tuần ra mắt" }, duePattern: { type: "SPECIFIC_WEEKS", weeks: [11, 12] } },
    ],
  },
];

export const EXAMPLE_WEEK1_ITEMS = [
  { id: "w1-a", label: { en: "Perform 30-min strength training", vi: "Tập tạ 30 phút" }, dayOfWeek: 0, done: true, goalId: "g-health" },
  { id: "w1-b", label: { en: "Log meals in the app", vi: "Ghi bữa ăn vào app" }, dayOfWeek: 0, done: true, goalId: "g-health" },
  { id: "w1-c", label: { en: "Send 5 outreach messages", vi: "Gửi 5 tin nhắn tiếp cận khách" }, dayOfWeek: 1, done: true, goalId: "g-side" },
  { id: "w1-d", label: { en: "Perform 30-min strength training", vi: "Tập tạ 30 phút" }, dayOfWeek: 2, done: false, goalId: "g-health" },
  { id: "w1-e", label: { en: "Ship one customer-facing improvement", vi: "Ship một cải tiến cho người dùng" }, dayOfWeek: 3, done: false, goalId: "g-side" },
  { id: "w1-f", label: { en: "Send 5 outreach messages", vi: "Gửi 5 tin nhắn tiếp cận khách" }, dayOfWeek: 4, done: false, goalId: "g-side" },
  { id: "w1-g", label: { en: "Perform 30-min strength training", vi: "Tập tạ 30 phút" }, dayOfWeek: 5, done: false, goalId: "g-health" },
];

/** Wednesday of week 1, looking at Today: 2 of 3 actions checked so far. */
export const EXAMPLE_TODAY = {
  projectedScorePct: 71,
  doneToday: 2,
  openCount: 1,
  note: {
    en: "Two checked, one to go. The projected score moves as you work — that's the productive tension.",
    vi: "Đã tick hai việc, còn một. Điểm dự kiến chạy theo bạn làm — đó chính là sức căng hữu ích.",
  },
};

export const EXAMPLE_WEEK1_CLOSE = {
  scorePct: 92,
  reflection: {
    en: "Missed one meal log on Saturday. Everything else held.",
    vi: "Bỏ một lần ghi bữa ăn thứ Bảy. Các việc còn lại đều giữ được.",
  },
};

export const EXAMPLE_VALLEY = {
  week: 4,
  scorePct: 58,
  headline: {
    en: "The valley hit — and she closed the week honestly anyway.",
    vi: "Đáy thung lũng đến — và cô ấy vẫn chốt tuần một cách trung thực.",
  },
  whatChanged: {
    en: "Dinner shifts at the family restaurant were eating the evening workout. She moved one session to Monday lunch and shrank meal logging from 6 to 5 days — a plan revision before week 5 started, not an excuse after it.",
    vi: "Ca tối ở quán gia đình đang nuốt buổi tập buổi tối. Cô dời một buổi sang trưa thứ Hai và giảm ghi bữa ăn từ 6 xuống 5 ngày — sửa kế hoạch trước tuần 5 bắt đầu, chứ không phải bào chữa sau đó.",
  },
};

export const EXAMPLE_REVIEW = {
  grades: [
    { goalId: "g-health", percentComplete: 100, achieved: true }, // 169.5 lbs
    { goalId: "g-side", percentComplete: 62, achieved: false }, // $310
  ],
  breakthrough: {
    en: "The score never lied. Two bad weeks early taught me more than a good month ever did.",
    vi: "Điểm số chưa bao giờ nói dối. Hai tuần tệ ở đầu dạy tôi nhiều hơn một tháng tốt.",
  },
};
```

- [ ] **Step 4: Run tests + typecheck**

Run: `npx vitest run src/lib/example-plan.test.ts && npx tsc --noEmit`
Expected: PASS — 3 tests; tsc clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/example-plan.ts src/lib/example-plan.test.ts
git commit -m "feat: bilingual worked-example data for the guide (Minh's first cycle)"
```

---

### Task 5: FE spec for Antigravity — `docs/fe-specs/phase-5-journey.md`

**Files:**
- Create: `docs/fe-specs/phase-5-journey.md` (follow the repo template header style used by `phase-*.md` specs — check `docs/fe-specs/README.md` rules first)

**Interfaces:**
- Consumes: `JourneyDto` contract (Task 2), `GET /api/guide/journey` (Task 3), `src/lib/example-plan.ts` exports (Task 4), the bilingual copy deck below.
- Produces: the complete build instruction for Antigravity's Phase 5B (guide rebuild + dashboard NextRitualCard upgrade + e2e). No backend questions should remain after reading it.

- [ ] **Step 1: Write the spec** with these sections, using this exact copy deck. Sections: *Idea & why (book basis)* → *Screens & routes* (`/guide` rebuild, dashboard card) → *Components & layout* → *States* → *Interactions* → *Data contract* (`GET /api/guide/journey` → `{ journey: JourneyDto }`, copied verbatim from contracts.ts; parallel fetch on dashboard) → *Copy & tone* → *Acceptance*.

**STEP_META copy deck** (client-side map keyed by step id; render by locale):

| id | href | title en / vi | detail en / vi |
|----|------|---------------|----------------|
| `write_vision` | `/vision` | Write your vision / Viết tầm nhìn | Long-term (5–15 years), 3-year outlook, and why this cycle matters. Start with *what if*, not how. / Dài hạn (5–15 năm), triển vọng 3 năm, vì sao chu kỳ này quan trọng. Bắt đầu bằng "nếu như", chưa cần "làm sao". |
| `create_cycle` | `/plan` | Create your 12-week cycle / Tạo chu kỳ 12 tuần | Name it and pick the Monday it starts. A year is no longer 12 months. / Đặt tên và chọn thứ Hai khởi động. Một năm không còn là 12 tháng. |
| `set_goals` | `/plan` | Set 1–3 goals — the vital few / Đặt 1–3 mục tiêu — vital few | Each needs a *why* and a measurable lag target: 180 → 170 lbs, $0 → $500. A fourth goal dilutes the first three. / Mỗi mục tiêu cần *lý do* và chỉ số đo được: 180 → 170 lbs, $0 → $500. Mục tiêu thứ tư làm loãng ba mục tiêu đầu. |
| `add_tactics` | `/plan` | Break goals into tactics / Chia mục tiêu thành chiến thuật | Verb-first, countable actions with a due pattern — "Strength train 30 min, 3×/week". The week plan generates from these. / Động từ đứng đầu, đếm được, có tần suất — "Tập tạ 30 phút, 3 lần/tuần". Kế hoạch tuần sinh ra từ đây. |
| `design_model_week` | `/model-week` | Design your model week / Thiết kế tuần mẫu | Reserve the 3-hour strategic block, daily buffers, and a breakout. The model week is where tactics physically fit. / Giữ khối chiến lược 3 tiếng, các khối đệm hằng ngày và khối nghỉ xả. Tuần mẫu là chỗ chiến thuật nằm vừa. |
| `write_commitment` | `/plan` | Make the commitment / Đưa ra cam kết | Count the costs honestly, then write "I choose to…". The promise only spans 12 weeks — that's what makes going all-in possible. / Đếm giá phải trả thật lòng, rồi viết "Tôi chọn…". Lời hứa chỉ kéo dài 12 tuần — nên dồn toàn lực được. |
| `start_cycle` | `/` | Start the cycle / Khởi động chu kỳ | Day 1 begins the 84 days. From here the rhythm takes over: plan Monday, execute daily, close weekly. / Ngày 1 bắt đầu 84 ngày. Từ đây nhịp độ dẫn đường: lập kế hoạch thứ Hai, thực thi hằng ngày, chốt cuối tuần. |
| `plan_current_week` | `/week` | Generate this week's plan / Sinh kế hoạch tuần này | Monday ritual: fresh items from your tactics, placed on days. Never skip — it's the heartbeat. / Nghi thức thứ Hai: mục mới từ chiến thuật, xếp vào các ngày. Không bao giờ bỏ — đây là nhịp tim. |
| `execute_today` | `/today` | Execute today / Thực thi hôm nay | Check off today's actions, ~5 minutes. The score measures achievements, not effort. / Tick các hành động hôm nay, ~5 phút. Điểm đo kết quả đạt được, không đo nỗ lực. |
| `close_week` | `/week` | Close the week honestly / Chốt tuần trung thực | Final score, log lag values, one-line reflection. Closed weeks are immutable — that's what keeps the record true. / Điểm cuối, ghi chỉ số kết quả, một dòng suy ngẫm. Tuần đã chốt không sửa được — điều đó khiến số liệu đáng tin. |
| `wam_report` | `/wam` | Write your WAM report / Viết báo cáo WAM | Weekly accountability check-in with yourself: blockers, what worked, encouragement. Optional but powerful. / Buổi đối diện trách nhiệm hằng tuần: vướng mắc, điều hiệu quả, lời động viên. Không bắt buộc nhưng rất hiệu quả. |
| `write_review` | `/review` | Week 13: review the year / Tuần 13: tổng kết năm | Celebrate first, then grade goals, quality of life, and the five disciplines. / Ăn mừng trước, rồi chấm điểm mục tiêu, chất lượng cuộc sống và 5 kỷ luật. |
| `archive_cycle` | `/review` | Archive the year / Lưu trữ năm | Freeze scores, review, and vision snapshot. History stays browsable forever. / Đóng băng điểm số, tổng kết và ảnh tầm nhìn. Lịch sử xem lại mãi mãi. |
| `start_next_cycle` | `/plan` | Start your next 12-week year / Bắt đầu năm 12 tuần tiếp theo | Carry the vital few forward, refine, go again. Four fresh starts a year. / Giữ lại vital few, tinh chỉnh, chạy tiếp. Bốn lần khởi đầu mới mỗi năm. |

Additional mandated copy (state-dependent):

- **nextAction null (caught up):** "All caught up — nothing owed right now. See you tomorrow on Today." / "Đã xong hết — hiện không còn việc đến hạn. Hẹn gặp mai ở trang Hôm nay."
- **Foundation gaps mid-cycle** (any foundation step `todo` while phase ≠ foundation): render the group label "Foundation gaps" with: "You started without these. Filling them strengthens the cycle; leaving them empty is also a choice." / "Bạn khởi động thiếu những mục này. Bổ sung sẽ làm chu kỳ vững hơn; để trống cũng là một lựa chọn."
- **close_week detail when `context.unclosedWeek` is set:** append "Week N is waiting." / "Tuần N đang chờ." (N = `context.unclosedWeek`).
- **EXAMPLE frame label:** "Example — Minh's first cycle (not your data)" / "Ví dụ minh họa — chu kỳ đầu của Minh (không phải dữ liệu của bạn)".

Page structure (top to bottom of `/guide`): (1) *You are here* — journey rail grouped by the three phases, checkmark for done, pulsing dot for current, plus one hero next-action card (STEP_META title + detail + CTA → href; or the caught-up card when null); (2) *The journey on one page* — static timeline Day 0 → Monday → daily → week 13 → between cycles (reuse and tighten the prose already in `src/app/guide/page.tsx`, sections "The rhythm" and "One-time setup"); (3) *A full cycle, played out* — the example frames from `src/lib/example-plan.ts` (plan as built → week-1 board → Wednesday today card with 71% projected → 92% close → valley week 4 at 58% + what changed → week-13 review grades); (4) *Reference* — keep the current scoring/diagnosis, valley, and data-ownership sections from `src/app/guide/page.tsx` nearly as-is, bilingualized. Dashboard: fetch `/api/guide/journey` in parallel with `/api/dashboard`; NextRitualCard leads with journey `nextAction` and keeps the existing `nextRitual` as the secondary hint line. Acceptance checklist: rail renders per live state; CTA navigates; example frames clearly labeled; en + vi complete; no `nextAction` shown for completion steps during weeks 1–12 (verify with `x-twy-today` header in e2e only).

- [ ] **Step 2: Self-check the spec** — confirm it names every `JourneyDto` field, every `example-plan.ts` export used, both locales for every visible string, and lists e2e scenarios mirroring the Task 3 contract tests. Fix gaps inline.

- [ ] **Step 3: Commit**

```bash
git add docs/fe-specs/phase-5-journey.md
git commit -m "docs: FE spec phase-5 journey — guide rebuild with full bilingual copy deck"
```

---

### Task 6: audit extension, PROJECT-PLAN note, full verification

**Files:**
- Modify: `scripts/system-audit.mjs` (three insertions)
- Modify: `PROJECT-PLAN.md` (§10 roadmap append)

**Interfaces:**
- Consumes: `GET /api/guide/journey` (Task 3).
- Produces: audit coverage for the journey (70 → 78 checks) and the roadmap record.

- [ ] **Step 1: Add seeded-state journey checks** — in section A, immediately after the `check("nextRitual present" …)` line, insert:

```js
  const journey = await api("GET", "/api/guide/journey");
  check("journey 200 with 14 steps", journey.status === 200 && journey.json.journey.steps.length === 14);
  check("journey phase=execution on seed", journey.json.journey.phase === "execution");
  check("journey foundation complete on seed", journey.json.journey.steps
    .filter((s) => ["write_vision", "create_cycle", "set_goals", "add_tactics", "design_model_week", "write_commitment", "start_cycle"].includes(s.id))
    .every((s) => s.status === "done"));
  check("journey nextAction=execute_today on seed (week 2 open)", journey.json.journey.nextAction?.id === "execute_today", JSON.stringify(journey.json.journey.nextAction));
  check("journey wam todo and never selected", journey.json.journey.steps.find((s) => s.id === "wam_report")?.status === "todo" && journey.json.journey.nextAction?.id !== "wam_report");
```

If the seed's "today" lands on a Sunday of week 2 the expected value is `close_week` instead — verify once against `npm run db:seed` output and adjust the assertion to the observed correct value (the rule is: open week mid-week → `execute_today`, ended open week → `close_week`).

- [ ] **Step 2: Add week-13 time-travel check** — right after the Step 1 block, insert:

```js
  const week13 = new Date(Date.parse(`${active.json.cycle.startDate}T00:00:00Z`) + 84 * 86_400_000).toISOString().slice(0, 10);
  const journey13 = await api("GET", "/api/guide/journey", undefined, week13);
  check("journey time-travel week 13 → write_review", journey13.json.journey.phase === "completion" && journey13.json.journey.nextAction?.id === "write_review");
```

- [ ] **Step 3: Add post-archive checks** — after the existing `check("snapshot frozen while living vision evolves" …)` line (i.e. after archive, before `POST /cycles/[id]/next`), insert:

```js
  const journeyArchived = await api("GET", "/api/guide/journey");
  check("journey after archive → start_next_cycle", journeyArchived.json.journey.phase === "completion" && journeyArchived.json.journey.nextAction?.id === "start_next_cycle");
```

And after the existing `check("carried goals copy title/why/lag only (no tactics)" …)` line, insert:

```js
  const journeyNext = await api("GET", "/api/guide/journey");
  check("journey successor cycle → add_tactics (carried goals lack tactics)", journeyNext.json.journey.phase === "foundation" && journeyNext.json.journey.nextAction?.id === "add_tactics");
```

- [ ] **Step 4: Append Phase 5 to the roadmap** — in `PROJECT-PLAN.md` §10, after the Phase 4 block, add:

```markdown
### Phase 5 — The Journey: actionable guide (M)
State-aware "You are here" engine (`journeyRules` + `GET /api/guide/journey`), `/guide` rebuilt
around the live journey rail + next-action hero, bilingual worked example, dashboard card upgrade.
Spec: `docs/superpowers/specs/2026-09-26-guide-journey-design.md` · FE spec: `docs/fe-specs/phase-5-journey.md`.
5A backend+spec (this repo) → 5B UI (Antigravity) → checkpoint.
```

- [ ] **Step 5: Full verification** — run everything:

```bash
npx tsc --noEmit && npm test && npm run build
```

Expected: tsc clean · all tests pass (117 existing + ~26 new) · build succeeds with 31 routes (no new pages in 5A — the route is `/api/guide/journey`, invisible to the route count's page list).

- [ ] **Step 6: Commit**

```bash
git add scripts/system-audit.mjs PROJECT-PLAN.md
git commit -m "chore: audit journey checks (70→78) + PROJECT-PLAN phase 5 entry"
```

- [ ] **Step 7: Report Phase 5A delivery** — tell the user: 5A is done (tests, audit additions, build green), and it's time to call the Antigravity agent for 5B with `docs/fe-specs/phase-5-journey.md`, per the phase delivery protocol (D9).
