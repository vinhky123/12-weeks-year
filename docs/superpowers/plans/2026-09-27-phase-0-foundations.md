# Phase 0 — Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the self-hosted Next.js app with the fully-tested pure domain modules (cycle math + execution scoring), the SQLite schema, the API-contract skeleton, the app shell, and the Antigravity FE-spec kit — everything later phases build on, with zero product features yet.

**Architecture:** Next.js App Router app. Pure domain modules in `src/server/` (no I/O, no React, no Next imports) hold the book's rules and carry the test suite. SQLite via better-sqlite3 + Drizzle lives in `src/server/db/` and is touched only by API routes and scripts. `src/lib/contracts.ts` is the single zod-typed interface the UI (built by the external Antigravity agent) is allowed to consume.

**Tech Stack:** Next.js 15, React 19, TypeScript (strict), Tailwind CSS 4, better-sqlite3, Drizzle ORM + drizzle-kit, zod, Vitest, Playwright (config only this phase), tsx.

## Global Constraints

- Host is Windows + Git Bash: all shell commands must run under Git Bash; npm scripts must work on Windows.
- TypeScript `strict`; no `any` in `src/server/**`.
- `src/server/*.ts` pure modules must not import Next.js/React and must not do I/O (no fs/db/network); dates passed in as `'YYYY-MM-DD'` UTC strings, `now` injected as parameter.
- Book constants have a single source: `WEEKS_IN_CYCLE = 12`, `REVIEW_WEEK = 13` (cycleMath), `ON_TRACK_THRESHOLD = 85`, `AT_RISK_THRESHOLD = 65` (scoring).
- DB path overridable via `TWY_DB_PATH` env (default `data/app.db`); `data/` is gitignored — user data never committed.
- UI code may import only `src/lib/contracts.ts`, never `src/server/**` (convention documented in `docs/fe-specs/README.md`; lint enforcement later).
- Commit style: conventional commits, one logical change per commit, never commit `node_modules/`, `.next/`, or `data/`.
- Dependency majors: next@15, react@19, tailwindcss@4; others latest. Exact pins live in `package-lock.json` (committed).

---

### Task 1: Project scaffold and tooling

**Files:**
- Create: `.gitignore`, `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `playwright.config.ts`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`
- Modify: none

**Interfaces:**
- Consumes: nothing
- Produces: a bootable Next.js app (`npm run dev`), `npm test` runner wired for `src/**/*.test.ts`, `@/*` path alias → `src/*`

- [ ] **Step 1: Write `.gitignore`**

```gitignore
# dependencies
node_modules/

# next.js
.next/
out/
next-env.d.ts
*.tsbuildinfo

# local user data — never commit
data/

# testing
test-results/
playwright-report/

# env
.env
.env.*
!.env.example

# os
Thumbs.db
.DS_Store
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "12-week-year-local",
  "version": "0.1.0",
  "private": true,
  "description": "Your personal 12 Week Year operating system — local-first, self-hosted.",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx scripts/migrate.ts"
  }
}
```

- [ ] **Step 3: Install dependencies**

```bash
npm install next@15 react@19 react-dom@19 drizzle-orm better-sqlite3 zod
npm install -D typescript @types/node @types/react @types/react-dom @types/better-sqlite3 tailwindcss@4 @tailwindcss/postcss drizzle-kit vitest tsx @playwright/test
```
Expected: both installs exit 0; `node_modules/` and `package-lock.json` appear.

- [ ] **Step 4: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 5: Write `next.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `playwright.config.ts`**

`next.config.ts`:
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

`postcss.config.mjs` (Tailwind v4):
```js
export default { plugins: { "@tailwindcss/postcss": {} } };
```

`vitest.config.ts`:
```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts"] },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});
```

`playwright.config.ts` (browsers installed in Phase 1; config wired now):
```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  use: { baseURL: "http://localhost:3210" },
  webServer: {
    command: "npm run dev -- -p 3210",
    url: "http://localhost:3210",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
```

- [ ] **Step 6: Write `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`**

`src/app/globals.css`:
```css
@import "tailwindcss";
```

`src/app/layout.tsx` (AppShell arrives in Task 7; minimal for now):
```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "12 Week Year Local",
  description: "Your personal 12 Week Year operating system — local-first, self-hosted.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

`src/app/page.tsx` (temporary; replaced in Task 7):
```tsx
export default function HomePage() {
  return <main className="p-10">12 Week Year Local — scaffolding…</main>;
}
```

- [ ] **Step 7: Verify boot**

Run: `npm run dev -- -p 3210 &` then `curl -s http://localhost:3210 | grep -o "12 Week Year Local — scaffolding"` then kill the server.
Expected: the grep prints the placeholder text once (HTML title may render escaped — check for "scaffolding" if the em dash escapes).

- [ ] **Step 8: Commit**

```bash
git add .gitignore package.json package-lock.json tsconfig.json next.config.ts postcss.config.mjs vitest.config.ts playwright.config.ts src/app
git commit -m "chore: scaffold Next.js 15 + TS strict + Tailwind v4 with vitest and playwright configs"
```

---

### Task 2: Cycle math module (TDD)

**Files:**
- Create: `src/server/cycleMath.ts`
- Test: `src/server/cycleMath.test.ts`

**Interfaces:**
- Produces (used by scoring, all API routes, all FE specs):
  - `WEEKS_IN_CYCLE = 12`, `REVIEW_WEEK = 13`
  - `toUtcMs(iso: string): number`, `toIsoDate(ms: number): string`, `todayIso(now?: Date): string`
  - `addDays(iso: string, days: number): string`, `diffDays(from: string, to: string): number`
  - `nextMonday(from: string): string`
  - `weekStart(cycleStart: string, week: number): string`, `weekEnd(cycleStart: string, week: number): string`
  - `cycleWeekNumber(today: string, cycleStart: string): number` — `0` pre-cycle, `1–12` execution, `13` review, `14` after
  - `daysRemainingInExecution(today: string, cycleStart: string): number`
  - `weekAndDayLabel(today: string, cycleStart: string): string | null` — `"Week 4 · Day 2"` or null outside execution weeks
- All throw `Error` on malformed/rollover dates (`2026-02-31`).

- [ ] **Step 1: Write the failing tests** — full suite in `src/server/cycleMath.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  WEEKS_IN_CYCLE, REVIEW_WEEK, addDays, cycleWeekNumber, daysRemainingInExecution,
  diffDays, nextMonday, toIsoDate, todayIso, weekAndDayLabel, weekEnd, weekStart,
} from "./cycleMath";

const START = "2026-10-05"; // a Monday

describe("date helpers", () => {
  it("adds days across month/year boundaries", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("diffDays is signed day count", () => {
    expect(diffDays("2026-10-05", "2026-10-05")).toBe(0);
    expect(diffDays("2026-10-05", "2026-10-11")).toBe(6);
    expect(diffDays("2026-10-11", "2026-10-05")).toBe(-6);
  });
  it("todayIso formats UTC calendar date", () => {
    expect(todayIso(new Date(Date.UTC(2026, 8, 27)))).toBe("2026-09-27");
  });
  it("rejects malformed and rollover dates", () => {
    expect(() => addDays("2026-2-3", 1)).toThrow();
    expect(() => addDays("2026-02-30", 1)).toThrow();
    expect(() => diffDays("nonsense", "2026-01-01")).toThrow();
  });
  it("toIsoDate round-trips", () => {
    expect(toIsoDate(Date.UTC(2026, 0, 31))).toBe("2026-01-31");
  });
});

describe("nextMonday", () => {
  it("returns the strictly next Monday", () => {
    expect(nextMonday("2026-10-05")).toBe("2026-10-12"); // Monday -> next Monday
    expect(nextMonday("2026-10-07")).toBe("2026-10-12"); // Wednesday
    expect(nextMonday("2026-10-11")).toBe("2026-10-12"); // Sunday
  });
});

describe("weekStart/weekEnd", () => {
  it("week 1 starts at cycleStart and spans 7 days", () => {
    expect(weekStart(START, 1)).toBe(START);
    expect(weekEnd(START, 1)).toBe("2026-10-11");
  });
  it("week N starts at +7*(N-1)", () => {
    expect(weekStart(START, 12)).toBe("2026-12-21");
    expect(weekEnd(START, 12)).toBe("2026-12-27");
    expect(weekStart(START, 13)).toBe("2026-12-28");
  });
  it("works with mid-week starts", () => {
    expect(weekStart("2026-10-07", 2)).toBe("2026-10-14");
    expect(weekEnd("2026-10-07", 2)).toBe("2026-10-20");
  });
  it("rejects week 0 and week 14", () => {
    expect(() => weekStart(START, 0)).toThrow(RangeError);
    expect(() => weekStart(START, 14)).toThrow(RangeError);
  });
});

describe("cycleWeekNumber", () => {
  it("is 0 before the cycle starts", () => {
    expect(cycleWeekNumber("2026-10-04", START)).toBe(0);
  });
  it("walks the execution weeks on boundaries", () => {
    expect(cycleWeekNumber(START, START)).toBe(1);
    expect(cycleWeekNumber("2026-10-11", START)).toBe(1);
    expect(cycleWeekNumber("2026-10-12", START)).toBe(2);
    expect(cycleWeekNumber("2026-12-21", START)).toBe(12);
    expect(cycleWeekNumber("2026-12-27", START)).toBe(12);
    expect(cycleWeekNumber("2026-12-28", START)).toBe(REVIEW_WEEK);
    expect(cycleWeekNumber("2027-01-03", START)).toBe(REVIEW_WEEK);
    expect(cycleWeekNumber("2027-01-04", START)).toBe(14);
  });
  it("mid-week cycle start still yields clean weeks", () => {
    expect(cycleWeekNumber("2026-10-07", "2026-10-07")).toBe(1);
    expect(cycleWeekNumber("2026-10-13", "2026-10-07")).toBe(1);
    expect(cycleWeekNumber("2026-10-14", "2026-10-07")).toBe(2);
  });
});

describe("daysRemainingInExecution", () => {
  it("counts today inclusive through end of week 12", () => {
    expect(daysRemainingInExecution(START, START)).toBe(84);
    expect(daysRemainingInExecution("2026-12-27", START)).toBe(1);
    expect(daysRemainingInExecution("2026-12-28", START)).toBe(0);
    expect(daysRemainingInExecution("2025-01-01", START)).toBe(0);
  });
});

describe("weekAndDayLabel", () => {
  it("labels execution days", () => {
    expect(weekAndDayLabel(START, START)).toBe("Week 1 · Day 1");
    expect(weekAndDayLabel("2026-10-11", START)).toBe("Week 1 · Day 7");
    expect(weekAndDayLabel("2026-10-12", START)).toBe("Week 2 · Day 1");
  });
  it("is null outside execution weeks", () => {
    expect(weekAndDayLabel("2026-10-04", START)).toBeNull();
    expect(weekAndDayLabel("2026-12-28", START)).toBeNull();
  });
});

describe("book constants", () => {
  it("a year is 12 weeks plus a review week", () => {
    expect(WEEKS_IN_CYCLE).toBe(12);
    expect(REVIEW_WEEK).toBe(13);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/server/cycleMath.test.ts`
Expected: FAIL — cannot resolve `./cycleMath`.

- [ ] **Step 3: Implement `src/server/cycleMath.ts`**

```ts
// Pure cycle/date math for The 12 Week Year.
// Dates are 'YYYY-MM-DD' strings interpreted as UTC calendar days, so results
// never depend on the machine's timezone. No I/O, no injected clock except
// the explicit `now` parameter of todayIso().

export const WEEKS_IN_CYCLE = 12 as const;
export const REVIEW_WEEK = 13 as const;

const MS_PER_DAY = 86_400_000;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parse a YYYY-MM-DD string to UTC ms, rejecting malformed and rollover dates. */
export function toUtcMs(iso: string): number {
  const match = ISO_DATE.exec(iso);
  if (!match) throw new Error(`Invalid date string: ${iso!} (expected YYYY-MM-DD)`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const ms = Date.UTC(year, month - 1, day);
  const back = new Date(ms);
  if (
    back.getUTCFullYear() !== year ||
    back.getUTCMonth() !== month - 1 ||
    back.getUTCDate() !== day
  ) {
    throw new Error(`Invalid calendar date: ${iso}`);
  }
  return ms;
}

export function toIsoDate(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Current UTC calendar date; `now` is injected for testability. */
export function todayIso(now: Date = new Date()): string {
  return toIsoDate(now.getTime());
}

export function addDays(iso: string, days: number): string {
  return toIsoDate(toUtcMs(iso) + days * MS_PER_DAY);
}

/** Signed whole-day difference from -> to. */
export function diffDays(from: string, to: string): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY);
}

/** The Monday strictly after `from` (default cycle start date). */
export function nextMonday(from: string): string {
  const dayOfWeek = new Date(toUtcMs(from)).getUTCDay(); // 0 = Sunday
  const delta = ((1 - dayOfWeek + 7) % 7) || 7;
  return addDays(from, delta);
}

/** First calendar day of execution week `week` (1-12) or the review week (13). */
export function weekStart(cycleStart: string, week: number): string {
  if (!Number.isInteger(week) || week < 1 || week > REVIEW_WEEK) {
    throw new RangeError(`week must be an integer between 1 and ${REVIEW_WEEK}, got ${week}`);
  }
  return addDays(cycleStart, (week - 1) * 7);
}

/** Last calendar day (inclusive) of the given week. */
export function weekEnd(cycleStart: string, week: number): string {
  return addDays(weekStart(cycleStart, week), 6);
}

/** 0 = before start · 1-12 = execution week · 13 = review week · 14 = after. */
export function cycleWeekNumber(today: string, cycleStart: string): number {
  const offset = diffDays(cycleStart, today);
  if (offset < 0) return 0;
  const week = Math.floor(offset / 7) + 1;
  if (week <= WEEKS_IN_CYCLE) return week;
  if (week === REVIEW_WEEK) return REVIEW_WEEK;
  return 14;
}

/** Whole execution days left including today, through end of week 12. Never negative. */
export function daysRemainingInExecution(today: string, cycleStart: string): number {
  const end = weekEnd(cycleStart, WEEKS_IN_CYCLE);
  return Math.max(0, diffDays(today, end) + 1);
}

/** UI label like "Week 4 · Day 2"; null outside execution weeks. */
export function weekAndDayLabel(today: string, cycleStart: string): string | null {
  const week = cycleWeekNumber(today, cycleStart);
  if (week < 1 || week > WEEKS_IN_CYCLE) return null;
  const dayInWeek = (diffDays(cycleStart, today) % 7) + 1;
  return `Week ${week} · Day ${dayInWeek}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/server/cycleMath.test.ts`
Expected: PASS — all suites green.

- [ ] **Step 5: Commit**

```bash
git add src/server/cycleMath.ts src/server/cycleMath.test.ts
git commit -m "feat: add pure cycle math module with full unit tests"
```

---

### Task 3: Execution scoring module (TDD)

**Files:**
- Create: `src/server/scoring.ts`
- Test: `src/server/scoring.test.ts`

**Interfaces:**
- Consumes: `WEEKS_IN_CYCLE` from `./cycleMath`
- Produces (used by API routes, FE specs, review wizard):
  - `DuePattern = { type: "EVERY_WEEK"; timesPerWeek: number } | { type: "SPECIFIC_WEEKS"; weeks: number[] }`
  - `TacticLike = { id: string | number; goalId: string | number; duePattern: DuePattern; activeFromWeek: number; deactivatedAtWeek: number | null }`
  - `ON_TRACK_THRESHOLD = 85`, `AT_RISK_THRESHOLD = 65`, `ScoreBand = "ON_TRACK" | "AT_RISK" | "REVISE_PLAN"`
  - `WeekScore = { week: number; due: number; completed: number; scorePct: number; band: ScoreBand }`
  - `dueForWeek(tactic, week): number`
  - `bandFor(scorePct): ScoreBand`
  - `weekScore(tactics, completions: Map<id, number>, week): WeekScore | null` — null when no tactics due
  - `goalScore(tactics, completions, week, goalId): WeekScore | null`
  - `cycleAverageScore(weekly: (WeekScore | null)[]): number | null`

- [ ] **Step 1: Write the failing tests** — full suite in `src/server/scoring.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  AT_RISK_THRESHOLD, ON_TRACK_THRESHOLD, bandFor, cycleAverageScore, dueForWeek,
  goalScore, weekScore, type TacticLike,
} from "./scoring";

function tactic(partial: Partial<TacticLike> & { id: number }): TacticLike {
  return {
    goalId: 1,
    duePattern: { type: "EVERY_WEEK", timesPerWeek: 1 },
    activeFromWeek: 1,
    deactivatedAtWeek: null,
    ...partial,
  };
}

describe("dueForWeek", () => {
  it("EVERY_WEEK due equals timesPerWeek", () => {
    expect(dueForWeek(tactic({ id: 1, duePattern: { type: "EVERY_WEEK", timesPerWeek: 3 } }), 4)).toBe(3);
  });
  it("SPECIFIC_WEEKS due 1 only in listed weeks", () => {
    const t = tactic({ id: 1, duePattern: { type: "SPECIFIC_WEEKS", weeks: [3, 7] } });
    expect(dueForWeek(t, 3)).toBe(1);
    expect(dueForWeek(t, 4)).toBe(0);
    expect(dueForWeek(t, 7)).toBe(1);
  });
  it("respects activeFromWeek and deactivatedAtWeek", () => {
    const t = tactic({ id: 1, activeFromWeek: 5, deactivatedAtWeek: 6 });
    expect(dueForWeek(t, 4)).toBe(0);
    expect(dueForWeek(t, 5)).toBe(1);
    expect(dueForWeek(t, 6)).toBe(1);
    expect(dueForWeek(t, 7)).toBe(0);
  });
  it("never dues outside weeks 1-12", () => {
    expect(dueForWeek(tactic({ id: 1 }), 0)).toBe(0);
    expect(dueForWeek(tactic({ id: 1 }), 13)).toBe(0);
  });
  it("guards junk patterns", () => {
    expect(dueForWeek(tactic({ id: 1, duePattern: { type: "EVERY_WEEK", timesPerWeek: Number.NaN } }), 2)).toBe(0);
    expect(dueForWeek(tactic({ id: 1, duePattern: { type: "EVERY_WEEK", timesPerWeek: 0 } }), 2)).toBe(0);
  });
});

describe("weekScore", () => {
  const tactics = [
    tactic({ id: 1, duePattern: { type: "EVERY_WEEK", timesPerWeek: 3 } }),
    tactic({ id: 2, duePattern: { type: "SPECIFIC_WEEKS", weeks: [2] } }),
  ];

  it("computes score, caps over-completion, ignores negative", () => {
    const score = weekScore(tactics, new Map([[1, 5], [2, 1]]), 2);
    expect(score).toEqual({ week: 2, due: 4, completed: 4, scorePct: 100, band: "ON_TRACK" });
    const negative = weekScore(tactics, new Map([[1, -2]]), 2);
    expect(negative!.completed).toBe(0);
  });
  it("is null when nothing is due", () => {
    expect(weekScore(tactics, new Map(), 1)).not.toBeNull(); // tactic 1 due in week 1
    expect(weekScore([tactics[1]], new Map(), 1)).toBeNull();
  });
  it("rounds to whole percent", () => {
    const t = [tactic({ id: 1, duePattern: { type: "EVERY_WEEK", timesPerWeek: 3 } })];
    expect(weekScore(t, new Map([[1, 2]]), 1)!.scorePct).toBe(67);
  });
  it("bands: 85 on track, 84 at risk, 64 revise", () => {
    const t = [tactic({ id: 1, duePattern: { type: "EVERY_WEEK", timesPerWeek: 20 } })];
    expect(weekScore(t, new Map([[1, 17]]), 1)!.band).toBe("ON_TRACK");   // 85
    expect(weekScore(t, new Map([[1, 16]]), 1)!.band).toBe("AT_RISK");    // 80 -> wait 16/20 = 80
    expect(weekScore(t, new Map([[1, 12]]), 1)!.band).toBe("REVISE_PLAN"); // 60
  });
});

describe("bandFor thresholds", () => {
  it("uses the book's numbers", () => {
    expect(ON_TRACK_THRESHOLD).toBe(85);
    expect(AT_RISK_THRESHOLD).toBe(65);
    expect(bandFor(100)).toBe("ON_TRACK");
    expect(bandFor(85)).toBe("ON_TRACK");
    expect(bandFor(84)).toBe("AT_RISK");
    expect(bandFor(65)).toBe("AT_RISK");
    expect(bandFor(64)).toBe("REVISE_PLAN");
    expect(bandFor(0)).toBe("REVISE_PLAN");
  });
});

describe("goalScore", () => {
  it("filters tactics by goal", () => {
    const tactics = [
      tactic({ id: 1, goalId: 10 }),
      tactic({ id: 2, goalId: 20 }),
    ];
    const score = goalScore(tactics, new Map([[1, 1], [2, 0]]), 1, 10);
    expect(score).toEqual({ week: 1, due: 1, completed: 1, scorePct: 100, band: "ON_TRACK" });
  });
});

describe("cycleAverageScore", () => {
  it("averages scored weeks and ignores nulls", () => {
    const s = (week: number, scorePct: number) => ({ week, due: 1, completed: 1, scorePct, band: bandFor(scorePct) as never });
    expect(cycleAverageScore([s(1, 80), null, s(2, 90)])).toBe(85);
  });
  it("is null with no scored weeks", () => {
    expect(cycleAverageScore([null, null])).toBeNull();
    expect(cycleAverageScore([])).toBeNull();
  });
});
```

Note: in the `bands` test the middle case is 16/20 = 80% → `AT_RISK` (a second AT_RISK sample). Keep the comment consistent — 80, not 84.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/server/scoring.test.ts`
Expected: FAIL — cannot resolve `./scoring`.

- [ ] **Step 3: Implement `src/server/scoring.ts`**

```ts
// Pure execution scoring for The 12 Week Year.
// "The score measures achievements, not effort or intentions": completions
// count only, over-completion caps at due, weeks with nothing due score null.

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
 * Weekly execution score = completed / due tactic completions.
 * `completions` maps tactic id -> number of completions logged that week;
 * values are clamped to [0, due]. Returns null when nothing was due.
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/server/scoring.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/scoring.ts src/server/scoring.test.ts
git commit -m "feat: add execution scoring module with full unit tests"
```

---

### Task 4: Database layer (schema + migrations)

**Files:**
- Create: `src/server/db/schema.ts`, `src/server/db/index.ts`, `drizzle.config.ts`, `scripts/migrate.ts`, `drizzle/` (generated)

**Interfaces:**
- Consumes: nothing
- Produces: drizzle tables `settings`, `cycles`, `goals`, `tactics`, `completions`, `weekPlans`, `weekPlanItems`; `createDb(dbPath?)` returning `{ sqlite, db }` (auto-creates dir, WAL, FK on, applies migrations); `getDb()` singleton honoring `TWY_DB_PATH`

- [ ] **Step 1: Write `src/server/db/schema.ts`**

```ts
import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// Phase 0/1 tables. Phase 2+ tables (visions, block templates, leads,
// wam reports, cycle reviews) arrive with their phases' migrations.

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey().default(1),
  currentCycleId: integer("current_cycle_id"),
  weekStartsOn: integer("week_starts_on").notNull().default(1), // 1 = Monday
  theme: text("theme").notNull().default("system"),
  locale: text("locale").notNull().default("en"),
  createdAt: text("created_at").notNull(),
});

export const cycles = sqliteTable("cycles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  startDate: text("start_date").notNull(), // YYYY-MM-DD
  status: text("status").notNull().default("planning"), // planning | active | review | archived
  createdAt: text("created_at").notNull(),
  archivedAt: text("archived_at"),
});

export const goals = sqliteTable("goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cycleId: integer("cycle_id").notNull().references(() => cycles.id),
  title: text("title").notNull(),
  why: text("why").notNull(),
  lagMetricName: text("lag_metric_name").notNull(),
  lagUnit: text("lag_unit").notNull(),
  lagStart: real("lag_start").notNull(),
  lagTarget: real("lag_target").notNull(),
  deadlineWeek: integer("deadline_week").notNull().default(12),
  status: text("status").notNull().default("active"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const tactics = sqliteTable("tactics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  goalId: integer("goal_id").notNull().references(() => goals.id),
  text: text("text").notNull(), // verb-first sentence
  duePattern: text("due_pattern").notNull(), // JSON-encoded DuePattern
  keystone: integer("keystone").notNull().default(0),
  activeFromWeek: integer("active_from_week").notNull().default(1),
  deactivatedAtWeek: integer("deactivated_at_week"),
  createdAt: text("created_at").notNull(),
});

export const completions = sqliteTable("completions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tacticId: integer("tactic_id").notNull().references(() => tactics.id),
  cycleWeek: integer("cycle_week").notNull(), // 1-12
  date: text("date").notNull(),
  createdAt: text("created_at").notNull(),
});

export const weekPlans = sqliteTable(
  "week_plans",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    cycleId: integer("cycle_id").notNull().references(() => cycles.id),
    weekNumber: integer("week_number").notNull(),
    status: text("status").notNull().default("draft"), // draft | closed
    closedAt: text("closed_at"),
    reflection: text("reflection"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("week_plans_cycle_week_idx").on(t.cycleId, t.weekNumber)],
);

export const weekPlanItems = sqliteTable("week_plan_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  weekPlanId: integer("week_plan_id").notNull().references(() => weekPlans.id),
  tacticId: integer("tactic_id"), // null only for explicit plan-revision items
  label: text("label").notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Monday .. 6 = Sunday
  done: integer("done").notNull().default(0),
  plannedCount: integer("planned_count").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
});
```

- [ ] **Step 2: Write `drizzle.config.ts`**

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.TWY_DB_PATH ?? "data/app.db" },
});
```

- [ ] **Step 3: Generate migrations**

Run: `npm run db:generate`
Expected: `drizzle/` contains a `0000_*.sql` migration creating all 7 tables + the unique index.

- [ ] **Step 4: Write `src/server/db/index.ts` and `scripts/migrate.ts`**

`src/server/db/index.ts`:
```ts
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

export const DEFAULT_DB_PATH = "data/app.db";

export function createDb(dbPath = process.env.TWY_DB_PATH ?? DEFAULT_DB_PATH) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "drizzle" });
  return { sqlite, db };
}

let instance: ReturnType<typeof createDb> | null = null;

/** Process-wide singleton (one local user, one app process). */
export function getDb() {
  instance ??= createDb();
  return instance;
}
```

`scripts/migrate.ts`:
```ts
import { createDb } from "../src/server/db";

const target = process.env.TWY_DB_PATH ?? "data/app.db";
const { sqlite } = createDb(target);
console.log(`Migrations applied to ${target}`);
sqlite.close();
```

- [ ] **Step 5: Verify**

Run: `npm run db:migrate && node -e "const D=require('better-sqlite3');const d=new D('data/app.db');console.log(d.prepare('SELECT name FROM sqlite_master WHERE type=?').all('table').map(r=>r.name).join(','))"`
Expected: prints `Migrations applied to data/app.db` then a table list containing `cycles,goals,tactics,completions,week_plans,week_plan_items,settings` (+ sqlite internal tables).

- [ ] **Step 6: Commit**

```bash
git add src/server/db drizzle drizzle.config.ts scripts/migrate.ts
git commit -m "feat: add sqlite schema, drizzle migrations, and migrate script"
```

---

### Task 5: API contract skeleton

**Files:**
- Create: `src/lib/contracts.ts`

**Interfaces:**
- Produces (the ONLY file UI code may import): `DUE_PATTERN_SCHEMA`/`DuePattern`, `CYCLE_STATUSES`/`CycleStatus`, `GOAL_STATUSES`/`GoalStatus`, `WEEK_PLAN_STATUSES`/`WeekPlanStatus`, `ApiError` + `API_ERROR_SCHEMA`. Phase 1 appends request/response schemas per endpoint here.

- [ ] **Step 1: Write `src/lib/contracts.ts`**

```ts
import { z } from "zod";

/**
 * Single API contract between the backend (this repo) and the UI (Antigravity).
 * RULE: UI code imports ONLY from this file (plus pure display helpers) —
 * never from `src/server/**`. Endpoints are added here phase by phase,
 * before their FE specs are written.
 */

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

export const API_ERROR_SCHEMA = z.object({
  error: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});
export type ApiError = z.infer<typeof API_ERROR_SCHEMA>;

// Book constants surfaced for the UI (single source: src/server modules).
export const ON_TRACK_THRESHOLD = 85;
export const AT_RISK_THRESHOLD = 65;
export const WEEKS_IN_CYCLE = 12;
export const REVIEW_WEEK = 13;
export const MAX_GOALS_PER_CYCLE = 3;
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/contracts.ts
git commit -m "feat: add API contract skeleton for UI handoff"
```

---

### Task 6: App shell and stub routes

**Files:**
- Create: `src/components/AppShell.tsx`
- Modify: `src/app/layout.tsx` (wrap in AppShell), `src/app/page.tsx` (real placeholder)
- Create stubs (same template, per-route title/phase/purpose): `src/app/today/page.tsx`, `src/app/plan/page.tsx`, `src/app/week/page.tsx`, `src/app/vision/page.tsx`, `src/app/model-week/page.tsx`, `src/app/measures/page.tsx`, `src/app/wam/page.tsx`, `src/app/review/page.tsx`, `src/app/history/page.tsx`, `src/app/settings/page.tsx`

**Interfaces:**
- Produces: the full route skeleton matching PROJECT-PLAN §9 so no nav link ever 404s and Antigravity's phase specs have exact routes to fill.

- [ ] **Step 1: Write `src/components/AppShell.tsx`**

```tsx
import Link from "next/link";

const NAV: { href: string; label: string; phase: number }[] = [
  { href: "/", label: "Dashboard", phase: 1 },
  { href: "/today", label: "Today", phase: 1 },
  { href: "/plan", label: "12-Week Plan", phase: 1 },
  { href: "/week", label: "Weekly Plan", phase: 1 },
  { href: "/vision", label: "Vision", phase: 2 },
  { href: "/model-week", label: "Model Week", phase: 2 },
  { href: "/measures", label: "Measures", phase: 2 },
  { href: "/wam", label: "WAM", phase: 3 },
  { href: "/review", label: "Review", phase: 3 },
  { href: "/history", label: "History", phase: 3 },
  { href: "/settings", label: "Settings", phase: 4 },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-slate-900 text-slate-100">
        <div className="border-b border-slate-800 px-5 py-5">
          <p className="text-sm font-bold tracking-wide">12 WEEK YEAR</p>
          <p className="mt-1 text-xs text-slate-400">A year is 12 weeks.</p>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <span>{item.label}</span>
              <span className="text-[10px] uppercase tracking-wider text-slate-500">P{item.phase}</span>
            </Link>
          ))}
        </nav>
        <p className="border-t border-slate-800 px-5 py-4 text-xs text-slate-500">
          Local-first · your data stays in <code>data/app.db</code>
        </p>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-8 py-10">{children}</div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Update `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "12 Week Year Local",
  description: "Your personal 12 Week Year operating system — local-first, self-hosted.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Replace `src/app/page.tsx`**

```tsx
export default function DashboardPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Week · Day · execution score live here once Phase 1 lands.
        </p>
      </div>
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="font-medium text-slate-700">No active cycle</p>
        <p className="mt-1 text-sm text-slate-500">
          Cycle creation arrives in Phase 1. The engine — cycle math and execution
          scoring — is already built and fully tested.
        </p>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Create the 10 stub pages from this template** (fill TITLE, PHASE, PURPOSE per the table):

```tsx
export default function TITLEPage() {
  return (
    <section>
      <h1 className="text-2xl font-bold">TITLE</h1>
      <p className="mt-2 text-sm text-slate-500">Coming in Phase PHASE.</p>
      <p className="mt-6 max-w-md text-sm text-slate-600">PURPOSE</p>
    </section>
  );
}
```

| Route | Component | TITLE | PHASE | PURPOSE |
|---|---|---|---|---|
| `/today` | TodayPage | Today | 1 | Daily execution in five minutes — check off today's tactic actions. |
| `/plan` | PlanPage | 12-Week Plan | 1 | Up to three goals, each with verb-first tactics and week dues. |
| `/week` | WeekPage | Weekly Plan | 1 | This week's plan, generated fresh from the 12-Week Plan — never copy-pasted. |
| `/vision` | VisionPage | Vision | 2 | Long-term and three-year vision — the emotional engine behind every cycle. |
| `/model-week` | ModelWeekPage | Model Week | 2 | The model work week: strategic, buffer and breakout blocks. |
| `/measures` | MeasuresPage | Measures | 2 | Lag and lead indicators — keeping score, confronting the truth. |
| `/wam` | WamPage | WAM | 3 | Weekly Accountability Meeting report — results, score, intentions. |
| `/review` | ReviewPage | Review | 3 | Week 13: celebrate, review, reload the next cycle. |
| `/history` | HistoryPage | History | 3 | Archived cycles and cross-cycle insights. |
| `/settings` | SettingsPage | Settings | 4 | Data, backup, theme, locale. |

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: build succeeds; all 11 routes compile.

- [ ] **Step 6: Commit**

```bash
git add src/app src/components
git commit -m "feat: add app shell navigation and phase stub routes"
```

---

### Task 7: Antigravity FE-spec kit

**Files:**
- Create: `docs/fe-specs/README.md`, `docs/fe-specs/_TEMPLATE.md`

**Interfaces:**
- Produces: the rules-of-engagement doc + spec template referenced by PROJECT-PLAN §6.4 and by every future phase spec.

- [ ] **Step 1: Write `docs/fe-specs/README.md`** — content covers, verbatim from PROJECT-PLAN §6.4: who you are (Antigravity, the UI agent), what you own (`src/app/**` pages, `src/components/**`), the ONE import rule (only `src/lib/contracts.ts`; never `src/server/**`, never direct DB access), "build the spec, not your ideas" (no invented endpoints/features; leave feedback in the spec's `## Feedback` section), design system (Tailwind v4, follow AppShell baseline, copy text verbatim from specs), how to run the app locally (`npm install && npm run dev`), where specs live (`phase-N/*.md`), and the definition of done (the spec's acceptance checklist).
- [ ] **Step 2: Write `docs/fe-specs/_TEMPLATE.md`** — the 8 mandatory sections from PROJECT-PLAN §6.4: Idea & why (book basis) / Screens & routes / Components & layout / States / Interactions / Data contract / Copy & tone / Acceptance — plus the Antigravity rules header and an empty `## Feedback` section.
- [ ] **Step 3: Commit**

```bash
git add docs/fe-specs
git commit -m "docs: add Antigravity FE-spec rules and template"
```

---

### Task 8: Root README quickstart

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`** — sections: what this is (one paragraph + book credit & buy link), quickstart (`git clone` → `npm install` → `npm run dev`, three commands), "your data is yours" (`data/app.db`, copy to back up, `TWY_DB_PATH` override), scripts table (`dev`, `build`, `start`, `test`, `db:generate`, `db:migrate`), roadmap/phase status table (0 done, 1–4 pending), the two-agent note (UI by Antigravity per `docs/fe-specs/`).
- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README quickstart and project overview"
```

---

### Task 9: Refinement pass and phase verification

- [ ] **Step 1: Full test suite** — Run: `npm test`. Expected: all cycleMath + scoring tests pass, zero failures.
- [ ] **Step 2: Typecheck + production build** — Run: `npx tsc --noEmit && npm run build`. Expected: both clean.
- [ ] **Step 3: Dev smoke** — Run dev server on 3210, `curl` each route (`/`, `/today`, `/plan`, `/week`, `/vision`, `/model-week`, `/measures`, `/wam`, `/review`, `/history`, `/settings`). Expected: all return 200 HTML.
- [ ] **Step 4: Refinement review** — dead code scan, naming consistency, no TODOs left in shipped code, `.gitignore` actually excludes `data/` (`git status` clean of db files). Fix anything found; commit `refactor: phase 0 refinement pass` if needed.
- [ ] **Step 5: Phase close-out** — merge `phase-0-foundations` into `main` (ff-only), then write the Phase 0 delivery report per PROJECT-PLAN §6.4 D9: **"Phase 0 delivered → no UI handoff needed this phase."**

## Self-Review (completed)

- **Spec coverage:** PROJECT-PLAN Phase 0 bullets — scaffold ✓ (Task 1), Drizzle schema ✓ (Task 4), cycleMath+scoring tested ✓ (Tasks 2–3), app shell ✓ (Task 6), README ✓ (Task 8), Vitest+Playwright wired ✓ (Tasks 1, 9), collaboration setup ✓ (Task 5 + 7).
- **Placeholders:** none; every code step shows complete file contents, stub pages are fully specified by template + table.
- **Type consistency:** `DuePattern`/`TacticLike` names identical in scoring, schema comment, and contracts; thresholds 85/65 and constants 12/13 appear with one source each (contracts re-exports values only).
