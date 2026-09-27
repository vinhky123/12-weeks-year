import type { ScoreBand } from "@/lib/contracts";
import { t, type Locale } from "@/lib/i18n";

export const BENCHMARK_LINE = "85% weekly execution is the benchmark — below 65, revise the plan.";
export const ACHIEVEMENTS_LINE = "The score measures achievements, not effort or intentions.";
export const REVISE_PLAN_GUIDANCE = "Two weeks below 65? Cut tactics down to the vital few you will actually execute.";

export function getBandVerdict(band: ScoreBand | null | undefined, locale: Locale = "vi"): string {
  if (!band) return locale === "vi" ? "Chưa có điểm" : "No score";
  switch (band) {
    case "ON_TRACK":
      return t(locale, "score.on_track");
    case "AT_RISK":
      return t(locale, "score.at_risk");
    case "REVISE_PLAN":
      return t(locale, "score.revise");
  }
}

export function getBenchmarkLine(locale: Locale = "vi"): string {
  return t(locale, "score.benchmark");
}

export function getAchievementsLine(locale: Locale = "vi"): string {
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
      bg: "bg-zinc-100 dark:bg-zinc-800",
      text: "text-zinc-600 dark:text-zinc-400",
      border: "border-zinc-200 dark:border-zinc-700",
      dot: "bg-zinc-400 dark:bg-zinc-500",
    };
  }
  switch (band) {
    case "ON_TRACK":
      return {
        bg: "bg-emerald-50 dark:bg-emerald-950/30",
        text: "text-emerald-700 dark:text-emerald-400",
        border: "border-emerald-200 dark:border-emerald-900/50",
        dot: "bg-emerald-500",
      };
    case "AT_RISK":
      return {
        bg: "bg-amber-50 dark:bg-amber-950/30",
        text: "text-amber-700 dark:text-amber-400",
        border: "border-amber-200 dark:border-amber-900/50",
        dot: "bg-amber-500",
      };
    case "REVISE_PLAN":
      return {
        bg: "bg-rose-50 dark:bg-rose-950/30",
        text: "text-rose-700 dark:text-rose-400",
        border: "border-rose-200 dark:border-rose-900/50",
        dot: "bg-rose-500",
      };
  }
}
