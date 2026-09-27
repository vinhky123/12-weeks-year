import type { WeekScoreDto } from "@/lib/contracts";
import { getBandBadgeStyles } from "@/components/common/scoreUtils";

interface ProjectedScoreBarProps {
  score: WeekScoreDto | null;
}

export default function ProjectedScoreBar({ score }: ProjectedScoreBarProps) {
  const pct = score ? Math.min(100, Math.max(0, score.scorePct)) : 0;
  const bandStyles = getBandBadgeStyles(score?.band);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="font-semibold text-slate-800">
          Projected week score — {score !== null ? `${score.scorePct}%` : "—"} &middot; benchmark 85%.
        </span>
        {score && (
          <span className="text-slate-500 font-medium">
            {score.completed} of {score.due} due
          </span>
        )}
      </div>

      <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100">
        {/* Progress bar */}
        <div
          className={`h-full transition-all duration-300 ${
            score?.band === "ON_TRACK"
              ? "bg-emerald-500"
              : score?.band === "AT_RISK"
              ? "bg-amber-500"
              : score?.band === "REVISE_PLAN"
              ? "bg-rose-500"
              : "bg-slate-300"
          }`}
          style={{ width: `${pct}%` }}
        />

        {/* 85% benchmark reference line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-slate-900 z-10"
          style={{ left: "85%" }}
          title="85% Benchmark"
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
        <span>0%</span>
        <span className="font-bold text-slate-700">85% benchmark</span>
        <span>100%</span>
      </div>
    </div>
  );
}
