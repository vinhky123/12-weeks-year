import type { WeekScoreDto } from "@/lib/contracts";
import {
  BENCHMARK_LINE,
  ACHIEVEMENTS_LINE,
  REVISE_PLAN_GUIDANCE,
  getBandBadgeStyles,
} from "@/components/common/scoreUtils";

interface ScoreVerdictProps {
  score: WeekScoreDto | null;
}

export default function ScoreVerdict({ score }: ScoreVerdictProps) {
  if (!score) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
        <p className="text-sm font-semibold text-slate-700">
          Nothing was due this week — no score. The week still closes.
        </p>
        <p className="mt-2 text-xs text-slate-500">{ACHIEVEMENTS_LINE}</p>
      </div>
    );
  }

  const bandStyles = getBandBadgeStyles(score.band);

  const getCloseVerdict = () => {
    switch (score.band) {
      case "ON_TRACK":
        return "Executing at a high level.";
      case "AT_RISK":
        return "Goals at risk.";
      case "REVISE_PLAN":
        return "Revise the plan — this is diagnosis, not judgment.";
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs text-center space-y-4">
      <div>
        <div className="text-6xl font-extrabold tracking-tight text-slate-900">
          <span className={bandStyles.text}>{score.scorePct}%</span>
        </div>
        <div className="mt-2 flex items-center justify-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${bandStyles.bg} ${bandStyles.text} ${bandStyles.border}`}
          >
            <span className={`h-2 w-2 rounded-full ${bandStyles.dot}`} />
            {getCloseVerdict()}
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-600">
          {score.completed} of {score.due} due tactics completed this week
        </p>
      </div>

      <div className="border-t border-slate-100 pt-4 space-y-1.5 text-xs text-slate-600">
        <p className="font-semibold text-slate-800">{BENCHMARK_LINE}</p>
        <p className="text-slate-500 italic">{ACHIEVEMENTS_LINE}</p>
        {score.band === "REVISE_PLAN" && (
          <p className="mt-2 font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
            {REVISE_PLAN_GUIDANCE}
          </p>
        )}
      </div>
    </div>
  );
}
