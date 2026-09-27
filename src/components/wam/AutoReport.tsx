"use client";

import type { WamAutoDto } from "@/lib/contracts";
import { getBandBadgeStyles } from "@/components/common/scoreUtils";

interface AutoReportProps {
  auto: WamAutoDto;
}

export function AutoReport({ auto }: AutoReportProps) {
  const { weekScore, averageScore, goals, nextWeekCommitments, weekNumber } = auto;
  const bandStyles = getBandBadgeStyles(weekScore?.band);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 shadow-xs space-y-5">
      {/* Score Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            System Snapshot · Week {weekNumber}
          </span>
          <p className="text-xs text-slate-500">Auto-filled honest metrics from your plan &amp; logs.</p>
        </div>

        <div className="flex items-center gap-2">
          {weekScore !== null ? (
            <div
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${bandStyles.bg} ${bandStyles.text} ${bandStyles.border}`}
            >
              <span className={`h-2 w-2 rounded-full ${bandStyles.dot}`} />
              <span>Week Score: {weekScore.scorePct}%</span>
            </div>
          ) : (
            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
              Week Score: None
            </span>
          )}

          {averageScore !== null && (
            <span className="rounded-full bg-slate-200/80 px-2.5 py-1 text-xs font-semibold text-slate-700">
              Avg {averageScore}%
            </span>
          )}
        </div>
      </div>

      {/* Results to date */}
      <div>
        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 mb-2">
          Results to date
        </h4>
        {goals.length === 0 ? (
          <p className="text-xs italic text-slate-400">No active goals in cycle.</p>
        ) : (
          <div className="space-y-2">
            {goals.map((g, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-2xs space-y-1.5"
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-bold text-slate-900">{g.title}</span>
                  <span className="font-semibold text-slate-700">
                    Lag: {g.lagLatest !== null ? `${g.lagLatest} ${g.lagUnit}` : "—"}
                  </span>
                </div>

                {g.leadThisWeek.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
                    {g.leadThisWeek.map((lead, lIdx) => (
                      <span
                        key={lIdx}
                        className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
                      >
                        <span className="font-medium">{lead.name}:</span>
                        <strong className="text-slate-900">
                          {lead.thisWeek !== null ? lead.thisWeek : 0} / {lead.weeklyTarget}
                        </strong>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Commitments for next week */}
      <div>
        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 mb-2">
          Commitments for next week
        </h4>
        {nextWeekCommitments.length === 0 ? (
          <p className="text-xs italic text-slate-400">No scheduled tactics for next week.</p>
        ) : (
          <ul className="space-y-1 rounded-lg border border-slate-200 bg-white p-3 text-xs">
            {nextWeekCommitments.map((tactic, tIdx) => (
              <li key={tIdx} className="flex items-start gap-2 text-slate-700">
                <span className="text-slate-400 font-bold">•</span>
                <span>{tactic}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
