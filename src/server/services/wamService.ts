import { and, eq } from "drizzle-orm";
import { WAM_AUTO_DTO, type WamAutoDto } from "../../lib/contracts";
import { todayIso, weekEnd, WEEKS_IN_CYCLE } from "../cycleMath";
import type { DbHandles } from "../db/index";
import * as executionRepo from "../db/repositories/execution";
import { cycles as cyclesTable, leadLogs, leadMeasures, wamReports } from "../db/schema";
import * as planRepo from "../db/repositories/plan";
import { invalid, notFound, RuleError } from "../ruleError";
import { dueForWeek } from "../scoring";
import { requireMutableCycle } from "./cycleMutationPolicy";
import { toTacticLike } from "./planService";
import * as scoringService from "./scoringService";

export type WamRow = typeof wamReports.$inferSelect;

const MAX_TEXT = 2000;

function requireCycle(h: DbHandles, cycleId: number) {
  const cycle = h.db.select().from(cyclesTable).where(eq(cyclesTable.id, cycleId)).get();
  if (!cycle) throw notFound("Cycle");
  return cycle;
}

function validateWeek(week: number) {
  if (!Number.isInteger(week) || week < 1 || week > WEEKS_IN_CYCLE) {
    throw invalid("week must be 1-12 — week 13 is review, not a WAM week.");
  }
}

/** Live auto-filled data: results to date, this week's score, next week's commitments. */
function buildAuto(h: DbHandles, cycleId: number, week: number): WamAutoDto {
  const cycle = requireCycle(h, cycleId);
  const scores = scoringService.getCycleScores(h, cycleId, weekEnd(cycle.startDate, week));
  const lagRows = executionRepo.listLagLogs(h, cycleId).filter((log) => log.weekNumber <= week);
  const tacticRows = planRepo.listTacticsByCycle(h, cycleId);
  const auto = {
    cycleName: cycle.name,
    weekNumber: week,
    weekScore: scores.weeks[week - 1] ?? null,
    averageScore: scores.averageScore,
    goals: planRepo.listGoals(h, cycleId).map((goal) => ({
      title: goal.title,
      lagLatest:
        lagRows
          .filter((log) => log.goalId === goal.id)
          .sort((a, b) => b.weekNumber - a.weekNumber)[0]?.value ?? null,
      lagUnit: goal.lagUnit,
      leadThisWeek: h.db
        .select()
        .from(leadMeasures)
        .where(eq(leadMeasures.goalId, goal.id))
        .all()
        .map((measure) => ({
          name: measure.name,
          thisWeek:
            h.db
              .select()
              .from(leadLogs)
              .where(and(eq(leadLogs.leadMeasureId, measure.id), eq(leadLogs.weekNumber, week)))
              .get()?.value ?? null,
          weeklyTarget: measure.weeklyTarget,
        })),
    })),
    nextWeekCommitments:
      week === WEEKS_IN_CYCLE
        ? []
        : tacticRows
            .filter((t) => dueForWeek(toTacticLike(t), week + 1) > 0)
            .map((t) => t.text),
  };
  return WAM_AUTO_DTO.parse(auto);
}

export function getWam(h: DbHandles, cycleId: number, week: number) {
  validateWeek(week);
  requireCycle(h, cycleId);
  const report = h.db
    .select()
    .from(wamReports)
    .where(and(eq(wamReports.cycleId, cycleId), eq(wamReports.weekNumber, week)))
    .get();
  const reportDto = report ? toDto(report) : null;
  return {
    report: reportDto,
    auto: reportDto?.auto ?? buildAuto(h, cycleId, week),
  };
}

export function saveWam(
  h: DbHandles,
  cycleId: number,
  week: number,
  input: { blockers?: string; whatWorked?: string; encouragement?: string },
  today = todayIso(),
) {
  validateWeek(week);
  requireMutableCycle(h, cycleId);
  for (const value of [input.blockers, input.whatWorked, input.encouragement]) {
    if (value !== undefined && value.length > MAX_TEXT) throw invalid(`Free-text fields are limited to ${MAX_TEXT} characters.`);
  }
  const existing = h.db
    .select()
    .from(wamReports)
    .where(and(eq(wamReports.cycleId, cycleId), eq(wamReports.weekNumber, week)))
    .get();
  if (existing) {
    parseStoredAuto(existing.autoJson);
    const row = h.db
      .update(wamReports)
      .set({
        blockers: input.blockers ?? existing.blockers,
        whatWorked: input.whatWorked ?? existing.whatWorked,
        encouragement: input.encouragement ?? existing.encouragement,
        updatedAt: today,
      })
      .where(eq(wamReports.id, existing.id))
      .returning()
      .get()!;
    return toDto(row);
  }
  const auto = buildAuto(h, cycleId, week);
  const row = h.db
    .insert(wamReports)
    .values({
      cycleId,
      weekNumber: week,
      autoJson: JSON.stringify(auto),
      blockers: input.blockers ?? null,
      whatWorked: input.whatWorked ?? null,
      encouragement: input.encouragement ?? null,
      createdAt: today,
      updatedAt: today,
    })
    .returning()
    .get()!;
  return toDto(row);
}

function toDto(row: WamRow) {
  return {
    id: row.id,
    cycleId: row.cycleId,
    weekNumber: row.weekNumber,
    auto: parseStoredAuto(row.autoJson),
    blockers: row.blockers,
    whatWorked: row.whatWorked,
    encouragement: row.encouragement,
    updatedAt: row.updatedAt,
  };
}

function parseStoredAuto(autoJson: string): WamAutoDto {
  let parsed: unknown;
  try {
    parsed = JSON.parse(autoJson);
  } catch {
    throw new RuleError(500, "Corrupted WAM snapshot in database.");
  }
  const result = WAM_AUTO_DTO.safeParse(parsed);
  if (!result.success) {
    throw new RuleError(500, "Corrupted WAM snapshot in database.", { issues: result.error.issues });
  }
  return result.data;
}

/** Standalone Markdown report to bring to a peer group. */
export function exportWamMarkdown(h: DbHandles, cycleId: number, week: number): string {
  const { report, auto } = getWam(h, cycleId, week);
  const lines: string[] = [];
  lines.push(`# WAM Report — ${auto.cycleName}, Week ${week}`);
  lines.push("");
  const score = auto.weekScore;
  lines.push(`**Execution score:** ${score ? `${score.scorePct}% (${score.completed}/${score.due})` : "no score"}  ·  **Average so far:** ${auto.averageScore ?? "—"}%`);
  lines.push("");
  lines.push("## Results to date");
  for (const goal of auto.goals) {
    const lag = goal.lagLatest === null || goal.lagLatest === undefined ? "—" : `${goal.lagLatest} ${goal.lagUnit}`;
    const leads = goal.leadThisWeek.map((l) => `${l.name}: ${l.thisWeek ?? 0}/${l.weeklyTarget}`).join(" · ") || "—";
    lines.push(`- **${goal.title}** — lag: ${lag} · leads: ${leads}`);
  }
  lines.push("");
  lines.push("## Commitments for next week");
  for (const commitment of auto.nextWeekCommitments) {
    lines.push(`- ${String(commitment)}`);
  }
  lines.push("");
  lines.push("## Blockers");
  lines.push(report?.blockers?.trim() || "_None reported._");
  lines.push("");
  lines.push("## What worked");
  lines.push(report?.whatWorked?.trim() || "_Not noted._");
  lines.push("");
  lines.push("## Encouragement / focus");
  lines.push(report?.encouragement?.trim() || "_Not noted._");
  return lines.join("\n");
}
