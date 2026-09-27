import type { ScoreBand } from "@/lib/contracts";
import { t, type Locale } from "@/lib/i18n";

export const BENCHMARK_LINE = "85% weekly execution is the benchmark — below 65, revise the plan.";
export const ACHIEVEMENTS_LINE = "The score measures achievements, not effort or intentions.";
export const REVISE_PLAN_GUIDANCE = "Two weeks below 65? Cut tactics down to the vital few you will actually execute.";

export function getBandVerdict(band: ScoreBand | null | undefined, locale: Locale = "en"): string {
  if (!band) return "No score";
  switch (band) {
    case "ON_TRACK":
      return t(locale, "score.on_track");
    case "AT_RISK":
      return t(locale, "score.at_risk");
    case "REVISE_PLAN":
      return t(locale, "score.revise");
  }
}

export function getBenchmarkLine(locale: Locale = "en"): string {
  return t(locale, "score.benchmark");
}

export function getAchievementsLine(locale: Locale = "en"): string {
  return t(locale, "score.achievements_only");
}

export function getBandBadgeStyles(band: ScoreBand | null | undefined): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  if (!band) {
    return {
      bg: "bg-slate-100",
      text: "text-slate-600",
      border: "border-slate-200",
      dot: "bg-slate-400",
    };
  }
  switch (band) {
    case "ON_TRACK":
      return {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
        dot: "bg-emerald-500",
      };
    case "AT_RISK":
      return {
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
        dot: "bg-amber-500",
      };
    case "REVISE_PLAN":
      return {
        bg: "bg-rose-50",
        text: "text-rose-700",
        border: "border-rose-200",
        dot: "bg-rose-500",
      };
  }
}
