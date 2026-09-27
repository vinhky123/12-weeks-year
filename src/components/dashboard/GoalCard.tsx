import type { GoalScoreDto, GoalStatus } from "@/lib/contracts";
import { getBandBadgeStyles } from "@/components/common/scoreUtils";

interface GoalCardProps {
  id: number;
  title: string;
  why: string;
  lagMetricName: string;
  lagUnit: string;
  lagStart: number;
  lagTarget: number;
  status: GoalStatus;
  tacticCount: number;
  currentWeekScore: GoalScoreDto | null;
}

export default function GoalCard({
  title,
  why,
  lagMetricName,
  lagUnit,
  lagStart,
  lagTarget,
  status,
  tacticCount,
  currentWeekScore,
}: GoalCardProps) {
  const bandStyles = getBandBadgeStyles(currentWeekScore?.band);

  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300">
      <div>
        <div className="flex items-start justify-between gap-3">
          <h4 className="text-base font-bold text-slate-900 leading-snug">{title}</h4>
          {status !== "active" && (
            <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wide">
              {status}
            </span>
          )}
        </div>

        <p className="mt-1.5 text-xs text-slate-500 italic line-clamp-2">
          &ldquo;{why}&rdquo;
        </p>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
        <div>
          <span className="text-[11px] text-slate-400 block uppercase font-medium">
            Lag: {lagMetricName}
          </span>
          <span className="font-semibold text-slate-700">
            {lagStart} &rarr; {lagTarget} {lagUnit}
          </span>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-slate-400 block uppercase font-medium">
            Week Score ({tacticCount} tactics)
          </span>
          {currentWeekScore ? (
            <span
              className={`inline-flex items-center gap-1 font-bold ${bandStyles.text}`}
            >
              {currentWeekScore.scorePct}%
              <span className="text-[10px] font-normal text-slate-400">
                ({currentWeekScore.completed}/{currentWeekScore.due})
              </span>
            </span>
          ) : (
            <span className="font-semibold text-slate-400">—</span>
          )}
        </div>
      </div>
    </div>
  );
}
