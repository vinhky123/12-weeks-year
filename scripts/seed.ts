/**
 * Seeds data/app.db (or TWY_DB_PATH) with the book's worked example
 * (12-week-year-book-content.md §4.4) on LIVE dates, plus a completed
 * past cycle for history/insights:
 *  - "Q3 2026 — Completed Example": archived; 6 scored weeks with a realistic
 *    valley (weeks 3-4), a valley-week WAM report, a full review, commitment.
 *  - "Q4 2026 — Book Example": active; week 1 closed at 92% (honest miss),
 *    week 2 in progress; vision, model week, lead measure included.
 * Destroys existing data in the target DB. Run: npm run db:seed
 */
import { addDays, cycleWeekNumber, todayIso } from "../src/server/cycleMath";
import { createDb, type DbHandles } from "../src/server/db";
import * as cycleService from "../src/server/services/cycleService";
import * as historyService from "../src/server/services/historyService";
import * as measuresService from "../src/server/services/measuresService";
import * as modelWeekService from "../src/server/services/modelWeekService";
import * as planService from "../src/server/services/planService";
import * as reviewService from "../src/server/services/reviewService";
import * as scoringService from "../src/server/services/scoringService";
import * as visionService from "../src/server/services/visionService";
import * as weekPlanService from "../src/server/services/weekPlanService";
import * as wamService from "../src/server/services/wamService";

const target = process.env.TWY_DB_PATH ?? "data/app.db";
const today = todayIso();

for (const suffix of ["", "-wal", "-shm"]) {
  try {
    fs.rmSync(target + suffix, { force: true });
  } catch {
    // ignore
  }
}

import fs from "node:fs";

const h: DbHandles = createDb(target);

// Cleanly truncate all application tables if file could not be unlinked (e.g. Windows lock)
const tables = h.sqlite
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%'")
  .all() as { name: string }[];
h.sqlite.pragma("foreign_keys = OFF");
for (const { name } of tables) {
  h.sqlite.prepare(`DELETE FROM "${name}"`).run();
}
try {
  h.sqlite.prepare("DELETE FROM sqlite_sequence").run();
} catch {
  // sqlite_sequence might not exist yet if no autoincrement table was created
}
h.sqlite.pragma("foreign_keys = ON");
h.sqlite.prepare("INSERT INTO settings (id, current_cycle_id, week_starts_on, theme, locale, created_at) VALUES (1, NULL, 1, 'system', 'vi', ?)").run(today);

function lastMonday(from: string): string {
  const d = new Date(`${from}T00:00:00Z`);
  const dow = d.getUTCDay(); // 0 = Sunday
  const delta = (dow === 1 ? 7 : (dow - 1 + 7) % 7) || 7;
  d.setUTCDate(d.getUTCDate() - delta);
  return d.toISOString().slice(0, 10);
}

// ============ PAST CYCLE (runs first — one year at a time) ============

const oldStart = addDays(today, -91); // one full "year" ago (12 weeks + week 13)
const oldCycle = cycleService.createCycle(h, { name: "Q3 2026 — Completed Example", startDate: oldStart }, today);
cycleService.startCycle(h, oldCycle.id);
const oldG1 = planService.addGoal(h, oldCycle.id, {
  title: "Read 6 books",
  why: "Learn before earning — input for the vision.",
  lagMetricName: "Books", lagUnit: "books", lagStart: 0, lagTarget: 6,
}, today);
planService.addTactic(h, oldG1.id, { text: "Read 30 minutes every morning", duePattern: { type: "EVERY_WEEK", timesPerWeek: 5 } }, oldStart);
const oldG2 = planService.addGoal(h, oldCycle.id, {
  title: "Run a 10K",
  why: "Prove the body can follow the mind.",
  lagMetricName: "Distance", lagUnit: "km", lagStart: 3, lagTarget: 10,
}, today);
planService.addTactic(h, oldG2.id, { text: "Run three times per week", duePattern: { type: "EVERY_WEEK", timesPerWeek: 3 } }, oldStart);

// weeks 1-12 scored: a realistic valley at weeks 3-4, recovery and finish
const weeklyPattern = [80, 72, 55, 60, 85, 90, 88, 92, 86, 90, 94, 96];
for (let w = 1; w <= 12; w++) {
  weekPlanService.generateWeekPlan(h, oldCycle.id, w, addDays(oldStart, w * 7));
  const detail = weekPlanService.getWeekPlanDetail(h, oldCycle.id, w, addDays(oldStart, w * 7));
  const doneTarget = Math.round((weeklyPattern[w - 1]! / 100) * detail.items.reduce((s, i) => s + i.plannedCount, 0));
  let done = 0;
  for (const item of detail.items) {
    if (item.tacticId === null) continue;
    for (let i = 0; i < item.plannedCount && done < doneTarget; i++) {
      try {
        scoringService.logCompletion(h, { tacticId: item.tacticId, weekNumber: w, date: addDays(oldStart, (w - 1) * 7 + i) }, addDays(oldStart, w * 7));
        done++;
      } catch {
        break;
      }
    }
  }
  const lagValues = w % 2 === 0 ? [{ goalId: oldG1.id, value: Math.min(6, w / 2) }, { goalId: oldG2.id, value: Math.min(10, 3 + w * 0.6) }] : [];
  weekPlanService.closeWeek(h, detail.plan.id, { reflection: `Week ${w} of the example.`, lagValues }, addDays(oldStart, w * 7));
}
historyService.setCommitment(h, oldCycle.id, { costs: "Late-night comfort, some weekends", statement: "I choose to read and run on schedule, regardless of mood." }, today);

// a valley-week WAM report (week 4)
wamService.saveWam(h, oldCycle.id, 4, {
  blockers: "Travel broke the morning routine.",
  whatWorked: "Pre-planned running routes.",
  encouragement: "The valley is normal — week 5 proved it. Keep the streak alive.",
}, addDays(oldStart, 28));

// full review, then archive (vision snapshot + grades freeze)
reviewService.saveReview(h, oldCycle.id, {
  qol: [
    { area: "Spiritual", rating: 6, anchor1: "Disconnected", anchor10: "Grounded daily" },
    { area: "Spouse/Key Relationship", rating: 8, anchor1: "Roommates", anchor10: "Partners in everything" },
    { area: "Family", rating: 7 },
    { area: "Business", rating: 5, anchor1: "Stuck", anchor10: "Growing weekly" },
    { area: "Personal", rating: 6 },
    { area: "Physical", rating: 7, anchor1: "Sick", anchor10: "Athlete" },
  ],
  disciplines: [
    { name: "Vision", rating: 7 },
    { name: "12-Week Planning", rating: 8 },
    { name: "Weekly Routine (Score · Plan · WAM)", rating: 6 },
    { name: "Performance Time (Blocks)", rating: 5 },
    { name: "Key Measures", rating: 7 },
  ],
  breakthroughs: "Working ON the system Sunday nights changed everything. The valley (weeks 3-4) was survived by rhythm, not motivation.",
  nextCycleNotes: "Protect the strategic block like a dentist appointment. Books goal achieved — replace with writing.",
}, addDays(oldStart, 84));
// goals resolved honestly: books achieved, 10K missed
planService.updateGoal(h, oldG1.id, { status: "achieved" });
planService.updateGoal(h, oldG2.id, { status: "missed" });
cycleService.archiveCycle(h, oldCycle.id, addDays(oldStart, 90));

// ============ CURRENT CYCLE (the book's worked example, live) ============

const startDate = lastMonday(addDays(today, -7)); // two Mondays back: today lands in week 2
const week1Start = startDate;
const week2Start = addDays(startDate, 7);
const currentWeek = Math.max(1, cycleWeekNumber(today, startDate));

const cycle = cycleService.createCycle(h, { name: "Q4 2026 — Book Example", startDate }, today);
cycleService.startCycle(h, cycle.id);

const g1 = planService.addGoal(h, cycle.id, {
  title: "Lose 10 lbs (180 → 170)",
  why: "Energy and confidence for my 3-year health vision.",
  lagMetricName: "Weight", lagUnit: "lbs", lagStart: 180, lagTarget: 170,
}, today);
const g2 = planService.addGoal(h, cycle.id, {
  title: "Earn first $1,000 freelancing",
  why: "Prove the income path toward my 3-year independence vision.",
  lagMetricName: "Revenue", lagUnit: "$", lagStart: 0, lagTarget: 1000,
}, today);

// tactics created as of week 1 so they due from week 1
planService.addTactic(h, g1.id, { text: "Perform 30-min strength training", duePattern: { type: "EVERY_WEEK", timesPerWeek: 3 } }, week1Start);
planService.addTactic(h, g1.id, { text: "Log all meals in the food app", duePattern: { type: "EVERY_WEEK", timesPerWeek: 1 } }, week1Start);
planService.addTactic(h, g1.id, { text: "Walk 8,000 steps", duePattern: { type: "EVERY_WEEK", timesPerWeek: 5 } }, week1Start);
planService.addTactic(h, g1.id, { text: "Weigh in and record weight", duePattern: { type: "SPECIFIC_WEEKS", weeks: Array.from({ length: 12 }, (_, i) => i + 1) } }, week1Start);
planService.addTactic(h, g2.id, { text: "Publish one portfolio article", duePattern: { type: "EVERY_WEEK", timesPerWeek: 2 } }, week1Start);
const tOutreach = planService.addTactic(h, g2.id, { text: "Send 10 personalized outreach messages", duePattern: { type: "EVERY_WEEK", timesPerWeek: 1 } }, week1Start);
planService.addTactic(h, g2.id, { text: "Complete and publish service landing page", duePattern: { type: "SPECIFIC_WEEKS", weeks: [3] } }, week1Start);

// commitment on the active cycle too (guardrails UI)
historyService.setCommitment(h, cycle.id, { costs: "Sleeping in, weekend comfort food, some evenings out", statement: "I choose to execute the vital few daily — regardless of how I feel." }, today);

if (currentWeek >= 1) {
  // week 1: every due tactic completed except outreach — the honest miss -> 92%
  weekPlanService.generateWeekPlan(h, cycle.id, 1, week2Start);
  const detail1 = weekPlanService.getWeekPlanDetail(h, cycle.id, 1, week2Start);
  for (const item of detail1.items) {
    if (item.tacticId === null || item.tacticId === tOutreach.id) continue;
    for (let i = 0; i < item.plannedCount; i++) {
      scoringService.logCompletion(h, { tacticId: item.tacticId, weekNumber: 1, date: addDays(week1Start, i % 7) }, week2Start);
    }
  }
  weekPlanService.closeWeek(h, detail1.plan.id, {
    reflection: "Solid start — outreach slipped one day. Calendar it first next week.",
    lagValues: [{ goalId: g1.id, value: 178.5 }, { goalId: g2.id, value: 0 }],
  }, week2Start);
}

if (currentWeek >= 2) {
  // week 2: draft in progress, a few completions logged
  weekPlanService.generateWeekPlan(h, cycle.id, 2, today);
  const detail2 = weekPlanService.getWeekPlanDetail(h, cycle.id, 2, today);
  let logged = 0;
  for (const item of detail2.items) {
    if (item.tacticId === null || logged >= 5) continue;
    for (let i = 0; i < Math.min(item.plannedCount, 2) && logged < 5; i++) {
      try {
        scoringService.logCompletion(h, { tacticId: item.tacticId, weekNumber: 2 }, today);
        logged++;
      } catch {
        break;
      }
    }
  }
}

// --- vision (living, per D7) ---
visionService.updateVision(h, {
  longTerm: "Làm chủ thời gian: Tự do làm việc từ bất cứ đâu, tạo ra nguồn thu nhập độc lập và trọn vẹn dành thời gian cho gia đình và những người yêu thương.",
  threeYear: "Làm chủ thời gian: Tự do làm việc từ bất cứ đâu, tạo ra nguồn thu nhập độc lập và trọn vẹn dành thời gian cho gia đình và những người yêu thương.",
  cycleConnection: "Làm chủ thời gian: Tự do làm việc từ bất cứ đâu, tạo ra nguồn thu nhập độc lập và trọn vẹn dành thời gian cho gia đình và những người yêu thương.",
  lifeDomains: [],
}, today);

// --- model week (the book's quantities -> zero warnings) ---
const mk = modelWeekService;
mk.addBlock(h, { type: "PLANNING", dayOfWeek: 0, startMinute: 510, durationMinutes: 20, label: "Score last week · plan this week" }, today);
mk.addBlock(h, { type: "STRATEGIC", dayOfWeek: 2, startMinute: 540, durationMinutes: 180, label: "Deep work — 12-Week Plan tactics" }, today);
mk.addBlock(h, { type: "STRATEGIC", dayOfWeek: 3, startMinute: 540, durationMinutes: 180, label: "Deep work — 12-Week Plan tactics" }, today);
for (const day of [0, 1, 2, 3, 4]) {
  mk.addBlock(h, { type: "BUFFER", dayOfWeek: day, startMinute: 660, durationMinutes: 45, label: "Email · admin · noise" }, today);
}
mk.addBlock(h, { type: "WAM", dayOfWeek: 0, startMinute: 1050, durationMinutes: 30, label: "Weekly Accountability Meeting" }, today);
mk.addBlock(h, { type: "BREAKOUT", dayOfWeek: 5, startMinute: 480, durationMinutes: 240, label: "Off — fully away from work" }, today);

// --- lead measure on goal 1 ---
const workouts = measuresService.addLeadMeasure(h, g1.id, { name: "Workouts completed", weeklyTarget: 3 }, today);
measuresService.logLead(h, { leadMeasureId: workouts.id, weekNumber: 1, value: 3 }, week2Start);
if (currentWeek >= 2) {
  try {
    measuresService.logLead(h, { leadMeasureId: workouts.id, weekNumber: 2, value: 1 }, today);
  } catch {
    // week already logged differently — demo data only
  }
}

h.sqlite.close();
console.log(`Seeded ${target}`);
console.log(`  archived example: ${oldCycle.name} (6 scored weeks, valley at 3-4, WAM + review)`);
console.log(`  active cycle: starts ${startDate}; today ${today} is week ${currentWeek}`);
console.log("  week 1 closed at 92% (11/12 — outreach slipped); week 2 draft in progress");
console.log("  next: npm run dev and open http://localhost:3000");
