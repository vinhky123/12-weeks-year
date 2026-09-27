/**
 * Seeds data/app.db (or TWY_DB_PATH) with the book's worked example
 * (12-week-year-book-content.md §4.4) using LIVE dates:
 * the cycle starts LAST Monday, so "today" lands in week 2 —
 * week 1 closed at ~86% with lag logs, week 2 in progress.
 * Destroys existing data in the target DB. Run: npm run db:seed
 */
import fs from "node:fs";
import { addDays, cycleWeekNumber, todayIso } from "../src/server/cycleMath";
import { createDb, type DbHandles } from "../src/server/db";
import * as cycleService from "../src/server/services/cycleService";
import * as measuresService from "../src/server/services/measuresService";
import * as modelWeekService from "../src/server/services/modelWeekService";
import * as planService from "../src/server/services/planService";
import * as scoringService from "../src/server/services/scoringService";
import * as visionService from "../src/server/services/visionService";
import * as weekPlanService from "../src/server/services/weekPlanService";

const mk = modelWeekService;

const target = process.env.TWY_DB_PATH ?? "data/app.db";
const today = todayIso();

for (const suffix of ["", "-wal", "-shm"]) {
  try {
    fs.rmSync(target + suffix, { force: true });
  } catch {
    // ignore
  }
}

const h: DbHandles = createDb(target);

function lastMonday(from: string): string {
  const d = new Date(`${from}T00:00:00Z`);
  const dow = d.getUTCDay(); // 0 = Sunday
  const delta = (dow === 1 ? 7 : (dow - 1 + 7) % 7) || 7;
  d.setUTCDate(d.getUTCDate() - delta);
  return d.toISOString().slice(0, 10);
}

const startDate = lastMonday(addDays(today, -7)); // ~two Mondays back: today lands in week 2
const week1Start = startDate;
const week2Start = addDays(startDate, 7);
const currentWeek = Math.max(1, cycleWeekNumber(today, startDate));

// --- cycle ---
const cycle = cycleService.createCycle(h, { name: "Q4 2026 — Book Example", startDate }, today);
cycleService.startCycle(h, cycle.id);

// --- goals (the vital few, straight from the book) ---
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

// --- tactics (§4.4 of the book content doc) — created as of week 1 so they due from week 1 ---
const tWorkouts = planService.addTactic(h, g1.id, { text: "Perform 30-min strength training", duePattern: { type: "EVERY_WEEK", timesPerWeek: 3 } }, week1Start);
planService.addTactic(h, g1.id, { text: "Log all meals in the food app", duePattern: { type: "EVERY_WEEK", timesPerWeek: 1 } }, week1Start);
planService.addTactic(h, g1.id, { text: "Walk 8,000 steps", duePattern: { type: "EVERY_WEEK", timesPerWeek: 5 } }, week1Start);
planService.addTactic(h, g1.id, { text: "Weigh in and record weight", duePattern: { type: "SPECIFIC_WEEKS", weeks: Array.from({ length: 12 }, (_, i) => i + 1) } }, week1Start);
const tArticle = planService.addTactic(h, g2.id, { text: "Publish one portfolio article", duePattern: { type: "EVERY_WEEK", timesPerWeek: 2 } }, week1Start);
const tOutreach = planService.addTactic(h, g2.id, { text: "Send 10 personalized outreach messages", duePattern: { type: "EVERY_WEEK", timesPerWeek: 1 } }, week1Start);
planService.addTactic(h, g2.id, { text: "Complete and publish service landing page", duePattern: { type: "SPECIFIC_WEEKS", weeks: [3] } }, week1Start);

if (currentWeek >= 1) {
  // week 1: every due tactic completed except outreach — the honest miss -> ~86%
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

// --- Phase 2: vision (living, per D7) ---
visionService.updateVision(h, {
  longTerm: "Own my time: work because I choose to, from anywhere, with the people I love.",
  threeYear: "Independent income covering our life, earned in focused 20-hour weeks.",
  cycleConnection: "This cycle proves the system: one healthy body and the first $1,000 earned independently.",
  lifeDomains: [
    { area: "Health", note: "Strong, rested, energetic" },
    { area: "Family", note: "Present at dinner, every day" },
    { area: "Business", note: "Independent income streams" },
    { area: "Personal", note: "Writing and guitar weekly" },
  ],
}, today);

// --- Phase 2: model week (the book's quantities -> zero warnings) ---
mk.addBlock(h, { type: "PLANNING", dayOfWeek: 0, startMinute: 510, durationMinutes: 20, label: "Score last week · plan this week" }, today);
mk.addBlock(h, { type: "STRATEGIC", dayOfWeek: 2, startMinute: 540, durationMinutes: 180, label: "Deep work — 12-Week Plan tactics" }, today);
mk.addBlock(h, { type: "STRATEGIC", dayOfWeek: 3, startMinute: 540, durationMinutes: 180, label: "Deep work — 12-Week Plan tactics" }, today);
for (const day of [0, 1, 2, 3, 4]) {
  mk.addBlock(h, { type: "BUFFER", dayOfWeek: day, startMinute: 660, durationMinutes: 45, label: "Email · admin · noise" }, today);
}
mk.addBlock(h, { type: "WAM", dayOfWeek: 0, startMinute: 1050, durationMinutes: 30, label: "Weekly Accountability Meeting" }, today);
mk.addBlock(h, { type: "BREAKOUT", dayOfWeek: 5, startMinute: 480, durationMinutes: 240, label: "Off — fully away from work" }, today);

// --- Phase 2: lead measure on goal 1 ---
const workouts = measuresService.addLeadMeasure(h, g1.id, { name: "Workouts completed", weeklyTarget: 3 }, today);
measuresService.logLead(h, { leadMeasureId: workouts.id, weekNumber: 1, value: 3 }, week2Start);
if (currentWeek >= 2) {
  try {
    measuresService.logLead(h, { leadMeasureId: workouts.id, weekNumber: 2, value: 1 }, today);
  } catch {
    // week already logged differently — demo data only
  }
}

void tWorkouts;
void tArticle;

h.sqlite.close();
console.log(`Seeded ${target}`);
console.log(`  cycle starts ${startDate}; today ${today} is week ${currentWeek}`);
console.log("  week 1 closed at 92% (11/12 — outreach slipped) with lag logs; week 2 draft in progress");
console.log("  next: npm run dev and open http://localhost:3000");
