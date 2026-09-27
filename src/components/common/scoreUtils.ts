import type { ScoreBand } from "@/lib/contracts";

export const BENCHMARK_LINE = "85% weekly execution is the benchmark — below 65, revise the plan.";
export const ACHIEVEMENTS_LINE = "The score measures achievements, not effort or intentions.";
export const REVISE_PLAN_GUIDANCE = "Two weeks below 65? Cut tactics down to the vital few you will actually execute.";

export function getBandVerdict(band: ScoreBand | null | undefined): string {
  if (!band) return "No score";
  switch (band) {
    case "ON_TRACK":
      return "Executing at a high level";
    case "AT_RISK":
      return "Goals at risk";
    case "REVISE_PLAN":
      return "Revise the plan — this is diagnosis, not judgment.";
  }
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
