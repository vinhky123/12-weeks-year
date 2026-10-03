import type { Page, Route } from "@playwright/test";
import type {
  ActiveCycleInfoDto,
  CompletionResultDto,
  CycleDetailDto,
  CycleDto,
  DashboardDto,
  GoalWithTacticsDto,
  TodayDto,
  WeekPlanDetailDto,
  WeekPlanItemDto,
} from "../../../src/lib/contracts";

type Locale = "en" | "vi";
type Theme = "light" | "dark";

type WeekItem = WeekPlanItemDto;

export type UiWorkspaceRequest = {
  method: string;
  pathname: string;
  body: Record<string, unknown> | null;
};

export type UiWorkspaceFixture = {
  requests: UiWorkspaceRequest[];
  items: WeekItem[];
  resolveCompletion: (status?: number) => void;
  resolveClose: (status?: number) => void;
  resolveWeek4: () => void;
  waitForWeek4Response: () => Promise<void>;
};

type FixtureOptions = {
  locale?: Locale;
  theme?: Theme;
  manualCompletion?: boolean;
  manualClose?: boolean;
  manualWeek4?: boolean;
  longItemLabel?: string;
  longGoalTitle?: string;
  noActiveToday?: boolean;
  closedToday?: boolean;
};

type ManualResolution = { status: number };

const cycle: CycleDto = {
  id: 1,
  name: "Fall focus",
  startDate: "2026-09-14",
  status: "active",
  createdAt: "2026-09-01T00:00:00.000Z",
  archivedAt: null,
};

const goal: GoalWithTacticsDto = {
  id: 11,
  cycleId: 1,
  title: "Ship the reliability release",
  why: "Customers can trust every planning ritual.",
  lagMetricName: "Reliable flows",
  lagUnit: "flows",
  lagStart: 0,
  lagTarget: 5,
  deadlineWeek: 12,
  status: "active",
  sortOrder: 0,
  createdAt: "2026-09-01T00:00:00.000Z",
  tactics: [
    {
      id: 101,
      goalId: 11,
      text: "Finish the browser contract",
      duePattern: { type: "EVERY_WEEK", timesPerWeek: 3 },
      keystone: true,
      activeFromWeek: 1,
      deactivatedAtWeek: null,
      createdAt: "2026-09-01T00:00:00.000Z",
    },
  ],
};

function initialItems(longItemLabel?: string, longGoalTitle?: string): WeekItem[] {
  const goalContext = { id: goal.id, title: longGoalTitle ?? goal.title, why: goal.why };
  return [
    { id: 301, weekPlanId: 33, tacticId: 101, label: "Monday carryover", dayOfWeek: 0, done: 0, plannedCount: 1, sortOrder: 0, goal: goalContext },
    { id: 302, weekPlanId: 33, tacticId: 102, label: "Tuesday completed", dayOfWeek: 1, done: 1, plannedCount: 1, sortOrder: 0, goal: goalContext },
    { id: 303, weekPlanId: 33, tacticId: 103, label: longItemLabel ?? "Wednesday priority", dayOfWeek: 2, done: 0, plannedCount: 1, sortOrder: 0, goal: goalContext },
    { id: 304, weekPlanId: 33, tacticId: 104, label: "Friday future", dayOfWeek: 4, done: 0, plannedCount: 1, sortOrder: 0, goal: goalContext },
    { id: 305, weekPlanId: 33, tacticId: null, label: "Admin follow-up", dayOfWeek: 2, done: 0, plannedCount: 1, sortOrder: 1, goal: null },
  ];
}

function weekFourItems(): WeekItem[] {
  return [{
    id: 401,
    weekPlanId: 34,
    tacticId: 201,
    label: "Week four delayed",
    dayOfWeek: 0,
    done: 0,
    plannedCount: 1,
    sortOrder: 0,
    goal: null,
  }];
}

function weekDetail(weekNumber: number, items: WeekItem[], status: "draft" | "closed" = "draft"): WeekPlanDetailDto {
  const startDay = 14 + (weekNumber - 1) * 7;
  const start = new Date(Date.UTC(2026, 8, startDay));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const iso = (date: Date) => date.toISOString().slice(0, 10);

  return {
    plan: {
      id: 30 + weekNumber,
      cycleId: 1,
      weekNumber,
      status,
      closedAt: status === "closed" ? "2026-09-28T08:00:00.000Z" : null,
      reflection: status === "closed" ? "Kept the scope small." : null,
      createdAt: "2026-09-01T00:00:00.000Z",
    },
    weekStart: iso(start),
    weekEnd: iso(end),
    items: weekNumber === 3 ? items : weekNumber === 4 ? weekFourItems() : [],
    score: {
      week: weekNumber,
      due: weekNumber === 3 ? 4 : 0,
      completed: weekNumber === 3 ? 1 : 0,
      scorePct: weekNumber === 3 ? 25 : 0,
      band: "REVISE_PLAN",
      closed: status === "closed",
      projected: status !== "closed",
    },
  };
}

async function jsonBody(route: Route): Promise<Record<string, unknown> | null> {
  const raw = route.request().postData();
  if (!raw) return null;
  return JSON.parse(raw) as Record<string, unknown>;
}

export async function mockUiWorkspace(page: Page, options: FixtureOptions = {}): Promise<UiWorkspaceFixture> {
  const locale = options.locale ?? "en";
  const theme = options.theme ?? "light";
  const requests: UiWorkspaceRequest[] = [];
  let items = initialItems(options.longItemLabel, options.longGoalTitle);
  let resolveCompletionGate: (value: ManualResolution) => void = () => {};
  let resolveCloseGate: (value: ManualResolution) => void = () => {};
  let resolveWeek4Gate: () => void = () => {};
  let markWeek4ResponseSent: () => void = () => {};
  const completionGate = new Promise<ManualResolution>((resolve) => { resolveCompletionGate = resolve; });
  const closeGate = new Promise<ManualResolution>((resolve) => { resolveCloseGate = resolve; });
  const week4Gate = new Promise<void>((resolve) => { resolveWeek4Gate = resolve; });
  const week4ResponseSent = new Promise<void>((resolve) => { markWeek4ResponseSent = resolve; });

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const body = await jsonBody(route);
    requests.push({ method, pathname: url.pathname, body });

    const fulfill = (json: unknown, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(json) });

    if (url.pathname === "/api/settings") {
      return fulfill({
        settings: {
          id: 1,
          currentCycleId: 1,
          weekStartsOn: 1,
          theme,
          locale,
          createdAt: "2026-09-01T00:00:00.000Z",
        },
      });
    }

    if (url.pathname === "/api/today") {
      if (options.noActiveToday) return fulfill({ error: "No active execution week." }, 404);
      const dates = ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"];
      const today: TodayDto = {
        date: "2026-09-30",
        weekNumber: 3,
        // Same English-only format as the server's weekAndDayLabel.
        weekLabel: "Week 3 · Day 3",
        dayIndexToday: 2,
        days: dates.map((date, dayOfWeek) => ({
          dayOfWeek,
          date,
          items: items.filter((item) => item.dayOfWeek === dayOfWeek),
        })),
        planStatus: options.closedToday ? "closed" : "draft",
        projectedScore: { week: 3, due: 4, completed: 1, scorePct: 25, band: "REVISE_PLAN", closed: Boolean(options.closedToday), projected: !options.closedToday },
        dailyPrinciple: "Honor the plan, then adapt it honestly.",
      };
      return fulfill(today);
    }

    if (url.pathname === "/api/cycles/active") {
      const activeCycle: ActiveCycleInfoDto = { cycle, weekNumber: 3, weekLabel: locale === "vi" ? "Tuần 3" : "Week 3", daysRemaining: 68, phase: "execution" };
      return fulfill(activeCycle);
    }

    if (url.pathname === "/api/cycles/1") {
      const cycleDetail: CycleDetailDto = { cycle, goals: [goal] };
      return fulfill(cycleDetail);
    }

    const weekMatch = url.pathname.match(/^\/api\/cycles\/1\/weeks\/(\d+)$/);
    if (weekMatch) {
      const weekNumber = Number(weekMatch[1]);
      if (weekNumber === 4 && options.manualWeek4) {
        await week4Gate;
        await fulfill(weekDetail(4, items));
        markWeek4ResponseSent();
        return;
      }
      return fulfill(weekDetail(weekNumber, items));
    }

    if (url.pathname === "/api/completions" && (method === "POST" || method === "DELETE")) {
      if (options.manualCompletion) {
        const resolution = await completionGate;
        if (resolution.status >= 400) return fulfill({ error: "Could not save completion." }, resolution.status);
      }
      const tacticId = Number(body?.tacticId);
      const item = items.find((candidate) => candidate.tacticId === tacticId);
      if (item) item.done = method === "POST" ? Math.min(item.plannedCount, item.done + 1) : Math.max(0, item.done - 1);
      const completion: CompletionResultDto = {
        tacticId,
        weekNumber: 3,
        done: item?.done ?? 0,
        due: item?.plannedCount ?? 1,
        projectedScore: { week: 3, due: 4, completed: 2, scorePct: 50, band: "REVISE_PLAN", closed: false, projected: true },
      };
      return fulfill(completion);
    }

    const itemMatch = url.pathname.match(/^\/api\/week-plans\/33\/items\/(\d+)$/);
    if (itemMatch && method === "PATCH") {
      const id = Number(itemMatch[1]);
      items = items.map((item) => item.id === id ? { ...item, ...body } as WeekItem : item);
      return fulfill(weekDetail(3, items));
    }

    if (url.pathname === "/api/week-plans/33/items" && method === "POST") {
      items = [...items, {
        id: 399,
        weekPlanId: 33,
        tacticId: null,
        label: String(body?.label ?? ""),
        dayOfWeek: Number(body?.dayOfWeek ?? 0),
        done: 0,
        plannedCount: 1,
        sortOrder: 9,
        goal: null,
      }];
      return fulfill(weekDetail(3, items));
    }

    if (url.pathname === "/api/week-plans/33/close" && method === "POST") {
      if (options.manualClose) {
        const resolution = await closeGate;
        if (resolution.status >= 400) return fulfill({ error: "Could not close week." }, resolution.status);
      }
      const closed = weekDetail(3, items, "closed");
      closed.plan.reflection = typeof body?.reflection === "string" ? body.reflection : null;
      return fulfill(closed);
    }

    if (url.pathname === "/api/dashboard") {
      const dashboard: DashboardDto = {
        phase: "execution",
        today: { isoDate: "2026-09-30", weekNumber: 3, weekLabel: locale === "vi" ? "Tuần 3" : "Week 3", daysRemaining: 68 },
        cycle,
        currentWeek: { number: 3, planStatus: "draft", score: weekDetail(3, items).score },
        scoreHistory: Array.from({ length: 12 }, (_, index) => index === 2 ? weekDetail(3, items).score : null),
        averageScore: 25,
        goals: [{
          id: goal.id,
          title: goal.title,
          why: goal.why,
          lagMetricName: goal.lagMetricName,
          lagUnit: goal.lagUnit,
          lagStart: goal.lagStart,
          lagTarget: goal.lagTarget,
          status: goal.status,
          tacticCount: goal.tactics.length,
          currentWeekScore: { week: 3, due: 4, completed: 1, scorePct: 25, band: "REVISE_PLAN" },
        }],
        nextRitual: "close_last_week",
        valleyGuidance: null,
        dailyPrinciple: "Honor the plan, then adapt it honestly.",
      };
      return fulfill(dashboard);
    }

    return fulfill({ error: `Unhandled mocked API request: ${method} ${url.pathname}` }, 501);
  });

  return {
    requests,
    get items() {
      return items;
    },
    resolveCompletion(status = 200) {
      resolveCompletionGate({ status });
    },
    resolveClose(status = 200) {
      resolveCloseGate({ status });
    },
    resolveWeek4() {
      resolveWeek4Gate();
    },
    waitForWeek4Response() {
      return week4ResponseSent;
    },
  };
}
