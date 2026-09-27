import type { WeekScoreDto } from "@/lib/contracts";
import {
  BENCHMARK_LINE,
  getBandBadgeStyles,
  getBandVerdict,
} from "@/components/common/scoreUtils";

interface ScorePanelProps {
  currentWeekNumber: number;
  currentScore: WeekScoreDto | null;
  averageScore: number | null;
}

export default function ScorePanel({
  currentWeekNumber,
  currentScore,
  averageScore,
}: ScorePanelProps) {
  const bandStyles = getBandBadgeStyles(currentScore?.band);
  const verdict = getBandVerdict(currentScore?.band);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Week {currentWeekNumber} Execution Score
            </span>
            {currentScore?.projected && (
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                projected
              </span>
            )}
            {currentScore?.closed && (
              <span className="rounded bg-slate-900 px-2 py-0.5 text-[11px] font-medium text-white">
                final
              </span>
            )}
          </div>

          <div className="mt-2 flex items-baseline gap-4">
            <span
              className={`text-5xl font-extrabold tracking-tight ${
                currentScore ? bandStyles.text : "text-slate-400"
              }`}
            >
              {currentScore !== null ? `${currentScore.scorePct}%` : "—"}
            </span>

            {currentScore && (
              <div className="flex flex-col">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${bandStyles.bg} ${bandStyles.text} ${bandStyles.border}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${bandStyles.dot}`}
                  />
                  {verdict}
                </span>
                <span className="mt-1 text-xs text-slate-500">
                  {currentScore.completed} of {currentScore.due} tactics completed
                </span>
              </div>
            )}
          </div>

          <p className="mt-4 text-xs font-medium text-slate-600">
            {BENCHMARK_LINE}
          </p>
        </div>

        <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-slate-100 pt-4 sm:pt-0 sm:pl-6">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Cycle Average
          </span>
          <div className="mt-1 text-2xl font-bold text-slate-800">
            {averageScore !== null ? `${averageScore}%` : "—"}
          </div>
          <span className="text-xs text-slate-400">over elapsed weeks</span>
        </div>
      </div>
    </div>
  );
}
