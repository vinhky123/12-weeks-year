import Link from "next/link";
import type { WeekScoreDto } from "@/lib/contracts";
import { getBandBadgeStyles } from "@/components/common/scoreUtils";

interface ScoreHistoryStripProps {
  scoreHistory: (WeekScoreDto | null)[];
  currentWeekNumber: number;
}

export default function ScoreHistoryStrip({
  scoreHistory,
  currentWeekNumber,
}: ScoreHistoryStripProps) {
  // Ensure array has 12 items
  const slots: (WeekScoreDto | null)[] = Array.from({ length: 12 }, (_, i) => {
    return scoreHistory[i] ?? null;
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-900">12-Week Execution History</h3>
        <span className="text-xs text-slate-500">Benchmark: 85%</span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
        {slots.map((score, index) => {
          const weekNum = index + 1;
          const isCurrent = weekNum === currentWeekNumber;
          const bandStyles = getBandBadgeStyles(score?.band);

          return (
            <Link
              key={weekNum}
              href={`/week?week=${weekNum}`}
              className={`flex flex-col items-center justify-between rounded-lg p-2.5 border transition hover:border-slate-400 ${
                score
                  ? `${bandStyles.bg} ${bandStyles.border}`
                  : isCurrent
                  ? "bg-slate-50 border-slate-300"
                  : "bg-slate-50/50 border-slate-100 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between w-full text-[10px] font-semibold text-slate-500">
                <span>W{weekNum}</span>
                {score?.closed && (
                  <svg
                    className="h-3 w-3 text-slate-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                )}
              </div>

              <div className="my-1.5 text-center">
                <span
                  className={`text-sm font-bold ${
                    score ? bandStyles.text : "text-slate-400"
                  }`}
                >
                  {score ? `${score.scorePct}%` : "—"}
                </span>
              </div>

              <div className="text-[9px] font-medium text-slate-500">
                {score?.projected ? (
                  <span className="text-indigo-600">proj</span>
                ) : score?.closed ? (
                  <span>closed</span>
                ) : isCurrent ? (
                  <span className="text-slate-700">active</span>
                ) : (
                  <span>due</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
