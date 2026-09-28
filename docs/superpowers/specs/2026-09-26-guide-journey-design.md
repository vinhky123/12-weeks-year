# Phase 5 — The Journey: actionable guide (design)

Date: 2026-09-26 · Status: approved in conversation, pending spec review
Sprint: Phase 5 (5A backend+spec → 5B Antigravity UI → checkpoint)

## 1. Context & problem

The `/guide` page (commit `2aa1854`) explains the book's methodology well, but it is
concept-first: it never shows *what we will do with the plan* — the concrete, state-aware
journey of an actual 12-week cycle in this app. User verdict: "it does not directly reflect
what we will do with the plan."

User decisions (2026-09-26):

- Guide must **track MY plan state** ("You are here" + exactly one next action) **and**
  contain a **full worked example** cycle as teaching material. (Both, not either.)
- All new guide content is **bilingual (en + vi) from the start** (assumption approved by
  silence; vi is the default locale in `settings`).

## 2. Goals / non-goals

Goals:

1. A pure, fully-tested "journey engine" that computes where the user is on the
   Foundation → Execution → Completion path from real data.
2. One endpoint `GET /api/guide/journey` exposing it (ids + statuses only; prose lives in FE).
3. A typed example-plan data module + complete bilingual copy deck, delivered in the FE spec.
4. `/guide` rebuilt (5B) into: live "You are here" rail + next-action hero, static journey
   timeline, worked example, tightened reference sections.
5. Dashboard's NextRitualCard upgraded to lead with the journey's next action.

Non-goals (v1 of this sprint):

- No new tables or migrations — the engine reads existing state only.
- No onboarding wizard — existing creator screens are linked, not duplicated.
- No per-screen contextual help ("?" tips inside Today/Week/Plan…) — future sprint.
- No changes to `nextRitual` / `DashboardDto` — zero contract breaks.

## 3. The journey model

### 3.1 Steps (14, ordered)

**FOUNDATION** — before Week 1 (cycle `planning` or none):

| # | id | done when | href |
|---|----|-----------|-----|
| 1 | `write_vision` | a living vision row exists with any content (`longTerm`/`threeYear`/`cycleConnection` non-empty) | `/vision` |
| 2 | `create_cycle` | any non-archived cycle exists (`planning` or `active`) | `/plan` |
| 3 | `set_goals` | cycle has ≥ 1 goal (copy reminds: max 3, *why* + lag target required) | `/plan` |
| 4 | `add_tactics` | ≥ 1 goal AND no goal with zero tactics | `/plan` |
| 5 | `design_model_week` | a STRATEGIC block exists in model week (global or current cycle) | `/model-week` |
| 6 | `write_commitment` | a commitment row exists for the cycle | `/plan` |
| 7 | `start_cycle` | cycle status is `active` or beyond | `/` |

Status rule: the **first unfinished foundation step is `current`**, later unfinished ones
are `todo`. Steps 2–7 are retroactively `done` for an already-started cycle. Steps 1 and 6
can legitimately remain `todo` mid-cycle (started without vision/commitment) — the rail
shows them honestly as gaps, not errors.

**EXECUTION** — weeks 1–12, statuses evaluated against the *current* week W:

| # | id | semantics |
|---|----|-----------|
| 8 | `plan_current_week` | `done` iff a week plan exists for W (`draft` or `closed`); `current` iff none |
| 9 | `execute_today` | `done` iff W's plan is closed; `current` iff plan exists and not closed; `todo` otherwise |
| 10 | `close_week` | `current` iff `unclosedWeek ≠ null`; `done` iff W's plan is closed; `todo` otherwise |
| 11 | `wam_report` | `done` iff a WAM report exists for the most recently closed week; otherwise `todo`. **Optional:** never selected as `nextAction` while anything else is unfinished |

**COMPLETION** — week 13 and after:

| # | id | done when | href |
|---|----|-----------|-----|
| 12 | `write_review` | a `cycle_reviews` row exists for the cycle | `/review` |
| 13 | `archive_cycle` | cycle status is `archived` | `/review` |
| 14 | `start_next_cycle` | a new `planning`/`active` cycle exists after an archive | `/plan` |

`start_next_cycle` is the persistent final call-to-action after archiving ("your next
12-week year awaits — carry the vital few forward"). When it too is done, the journey is
complete → `nextAction: null`, phases render as "cycle in flight / all caught up".

### 3.2 Phase & nextAction

The **active phase** is: `foundation` until `start_cycle` is done; `execution` during
weeks 1–12 of a started cycle; `completion` from week 13 / status `review` / `archived`.

- Steps in the active phase keep their §3.1 statuses; steps in **later** phases are always
  `todo` (visual future — never selectable); steps in **earlier** phases keep their real
  statuses (foundation gaps stay visible mid-cycle).
- `nextAction` = the first unfinished step **within the active phase only**, skipping
  `wam_report`. Within execution the order is `close_week` > `plan_current_week` >
  `execute_today`, mirroring `nextRitual`'s proven ordering: close → plan → execute.
- `nextAction` is `null` when the active phase has nothing unfinished (e.g. Monday
  evening: last week closed, this week planned, execution ongoing — the FE renders
  "all caught up, see you tomorrow"). It can never be a completion step while the cycle
  is still in weeks 1–12.

### 3.3 Snapshot input (service assembles; rules stay pure)

```ts
export interface JourneySnapshot {
  // foundation
  hasLivingVision: boolean;
  cycleStatus: "none" | "planning" | "active" | "review" | "archived";
  goalCount: number;              // goals of the planning/active cycle
  goalsWithoutTactics: number;
  hasStrategicBlock: boolean;
  hasCommitment: boolean;
  // execution (current week W; 0 = pre, 13+ = review/after)
  currentWeek: number;
  currentWeekPlanStatus: "none" | "draft" | "closed";
  unclosedWeek: number | null;    // latest week that should be closed but isn't (prior week left open, or W ended with plan open)
  // completion
  hasReview: boolean;
  hasSuccessorCycle: boolean;     // a planning/active cycle exists after the archived one
}
```

`unclosedWeek` computation (service): if W ≥ 2 and week W−1 (or the latest earlier week
with a plan) is not closed → that week number; else if W's plan exists, is not closed, and
today ≥ W's week end (Sunday) → W; else null.

## 4. Architecture

Layering follows the established pattern (pure rules → service → thin route → contracts):

```
src/server/journeyRules.ts        NEW  journeyState(snapshot) → { phase, steps, nextAction }
src/server/services/guideService.ts  NEW  getJourney(handle) — assembles snapshot from
                                              existing repositories, applies rules
src/app/api/guide/journey/route.ts   NEW  GET → { journey: JourneyDto }
src/lib/contracts.ts              ADD  JOURNEY_STEP_STATUS / JOURNEY_STEP_ID / JOURNEY_DTO
src/lib/example-plan.ts           NEW  typed worked-example constants (FE-only, no API)
docs/fe-specs/phase-5-journey.md  NEW  full FE spec incl. complete bilingual copy deck
```

### 4.1 DTO shape — server owns status, client owns words

```ts
export const JOURNEY_STEP_IDS = [ "write_vision", "create_cycle", "set_goals",
  "add_tactics", "design_model_week", "write_commitment", "start_cycle",
  "plan_current_week", "execute_today", "close_week", "wam_report",
  "write_review", "archive_cycle", "start_next_cycle" ] as const;

export const JOURNEY_DTO = z.object({
  phase: z.enum(["foundation", "execution", "completion"]),
  steps: z.array(z.object({
    id: z.enum(JOURNEY_STEP_IDS),
    status: z.enum(["done", "current", "todo"]),
  })),
  nextAction: z.object({ id: z.enum(JOURNEY_STEP_IDS) }).nullable(),
  context: z.object({
    cycleName: z.string().nullable(),
    weekNumber: z.number().int(),       // 0 pre … 13+ review/after
    unclosedWeek: z.number().int().nullable(),
  }),
});
```

All titles, one-line details, whys, and hrefs live in a client-side `STEP_META` map keyed
by step id (bilingual en/vi, inline conditionals like the dashboard). The API never sends
prose — locale stays a client concern. Phase derivation is defined in §3.2.

### 4.2 Dashboard integration (non-breaking)

Dashboard FE additionally fetches `/api/guide/journey` (parallel to `/api/dashboard`).
NextRitualCard renders the journey `nextAction` as the primary line, with the existing
`nextRitual` string as the secondary ritual hint. `DashboardDto` and `nextRitual` stay
untouched — no backend change, no contract test churn.

## 5. Worked example — "A full cycle, played out"

`src/lib/example-plan.ts` holds one coherent example (inspired by the book §4.4 and our
seed): **"Minh's first 12-week year"** — 2 goals: *health* (180 → 170 lbs) and *side
project* ($0 → $500). Typed as subsets of existing DTOs (`GOAL_DTO`-shaped,
`WEEK_PLAN_ITEM_DTO`-shaped) so Antigravity renders them with real card components inside
a visually distinct "EXAMPLE" frame. Content beats, each 2–4 lines:

1. The plan as built — vision excerpt, 2 goals with whys, 4–5 verb-first tactics with due
   patterns (one `EVERY_WEEK ×3`, one `SPECIFIC_WEEKS`).
2. Week 1 Monday — the generated board, items placed on days.
3. Wednesday mid-week — a Today card: 2 checked, 1 open, projected score 71%.
4. Sunday W1 — closed at 92%, one-line reflection.
5. Week 4 (valley) — closed honestly at 58%, the banner shown, what Minh changed (shrank
   one tactic's count — a plan revision, allowed pre-week).
6. Week 13 — review highlights: both goals graded, one achieved (169.5 lbs), celebration
   first, commitment renewed for the next cycle.

## 6. `/guide` page structure (5B build, from FE spec)

1. **You are here** (live) — vertical journey rail (3 phase groups, 14 steps, checkmarks)
   + one hero next-action card (title, 2-line why, CTA button → href).
2. **The journey on one page** (static timeline) — Day 0 (~1 h setup) → every Monday
   (~20 min: close → plan → WAM) → every day (~5 min) → week 13 (~2 h) → between cycles.
3. **A full cycle, played out** (§5 example frames).
4. **Reference** (tightened from current page) — scoring & diagnosis (85% / strategy vs
   execution), the valley weeks 3–6, data ownership, book credit.

Everything bilingual inline (`locale === "vi" ? … : …`). Existing prose is reused and
tightened, not thrown away.

## 7. Testing strategy

- **Unit (`journeyRules.test.ts`)** — scenario table as tests:

| Scenario | nextAction |
|---|---|
| Empty database | `write_vision` |
| Vision written, no cycle | `create_cycle` |
| Full foundation, cycle planning | `start_cycle` |
| Active cycle, week 3, no plan | `plan_current_week` |
| Active, week 3, plan open mid-week | `execute_today` |
| Active, week 3, Monday, week 2 unclosed | `close_week` |
| Active, Sunday of week 5, plan open | `close_week` |
| Week 13, no review | `write_review` |
| Archived, no successor | `start_next_cycle` |
| Archived + successor active & caught up (week plan closed) | `null` |
| Active, week 5, week plan closed (Monday evening) | `null` — never `write_review` |
| WAM missing but everything else current-week done | never `wam_report` |

- **Contract test** — `GET /api/guide/journey` in ≥3 states (empty, mid-execution with
  `x-twy-today`, week 13); envelope `{journey}`; zod-validated.
- **Audit** — `scripts/system-audit.mjs` +5 checks woven into the walkthrough.
- **Consistency guard** — unit test asserting `nextAction` agrees with `nextRitual`'s
  category on shared scenarios (close-before-plan-before-execute).
- **5B (Antigravity)** — e2e: journey rail renders per state; next-action CTA navigates;
  worked-example frames present; en/vi render.

## 8. Sprint protocol (unchanged)

- **5A (this repo, me):** journeyRules + unit tests → guideService + route + contracts +
  contract test → example-plan.ts → FE spec with full bilingual copy deck → audit
  extension → `tsc` + build + full suite green → commit.
- **5B (Antigravity):** guide rebuild, NextRitualCard upgrade, e2e — from the FE spec.
- **Checkpoint:** my review of UI + audit rerun, same as Phases 1–4.

Acceptance for 5A: all tests green (117 + ~12 new), audit 70 → 75, build clean, FE spec
complete enough that Antigravity needs no backend questions.

## 9. Risks

| Risk | Mitigation |
|---|---|
| Two "what now" sources (`nextRitual` vs journey) disagree | shared-scenario consistency test; FE renders journey primary, ritual secondary |
| Step list grows/copy drifts between en/vi | copy lives in one `STEP_META` map, single file |
| Journey feels naggy mid-cycle (vision still todo at week 6) | rail labels gaps "foundation gaps", tone honest-not-guilty in copy deck |
| Example data mistaken for real data | distinct EXAMPLE frame styling + explicit label, spec mandates it |
