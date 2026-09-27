"use client";

import type { HistoryEntryDto, ScoreBand } from "@/lib/contracts";
import { getBandBadgeStyles } from "@/components/common/scoreUtils";

interface CycleCardProps {
  cycle: HistoryEntryDto;
  onClick: () => void;
}

export function CycleCard({ cycle, onClick }: CycleCardProps) {
  const getBand = (score: number | null): ScoreBand | null => {
    if (score === null) return null;
    if (score >= 85) return "ON_TRACK";
    if (score >= 65) return "AT_RISK";
    return "REVISE_PLAN";
  };

  const bandStyles = getBandBadgeStyles(getBand(cycle.averageScore));

  const statusColors: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-800",
    planning: "bg-blue-100 text-blue-800",
    review: "bg-purple-100 text-purple-800",
    archived: "bg-slate-100 text-slate-700",
  };

  return (
    <div
      onClick={onClick}
      className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300 hover:shadow-md cursor-pointer"
    >
      <div>
        {/* Top: Name & Status */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-base text-slate-900 group-hover:text-slate-800">
            {cycle.name}
          </h3>
          <span
            className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              statusColors[cycle.status] ?? "bg-slate-100 text-slate-700"
            }`}
          >
            {cycle.status}
          </span>
        </div>

        {/* Dates */}
        <p className="mt-1 text-xs text-slate-400">
          Started: {cycle.startDate}
          {cycle.archivedAt && (
            <span className="ml-2">· Archived: {cycle.archivedAt.slice(0, 10)}</span>
          )}
        </p>

        {/* Stats Row */}
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Execution
            </span>
            <div className="mt-0.5 flex items-center gap-1.5">
              {cycle.averageScore !== null ? (
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs font-bold ${bandStyles.bg} ${bandStyles.text} ${bandStyles.border}`}
                >
                  {cycle.averageScore}% avg
                </span>
              ) : (
                <span className="text-xs font-medium text-slate-400">—</span>
              )}
              <span className="text-[11px] text-slate-500">
                ({cycle.scoredWeeks}/12 wks)
              </span>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Goals
            </span>
            <div className="mt-0.5">
              <span className="font-bold text-xs text-slate-900">
                {cycle.goalsCompleted} of {cycle.goalsTotal} achieved
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Review Indicator */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        {cycle.hasReview ? (
          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Review saved
          </span>
        ) : (
          <span className="text-slate-400 italic text-[11px]">No review</span>
        )}

        <span className="font-medium text-slate-600 group-hover:text-slate-900 group-hover:underline">
          View details →
        </span>
      </div>
    </div>
  );
}
