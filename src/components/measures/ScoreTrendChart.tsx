"use client";

import type { WeekScoreDto } from "@/lib/contracts";
import { getBandBadgeStyles } from "@/components/common/scoreUtils";

interface ScoreTrendChartProps {
  weeks: (WeekScoreDto | null)[];
  currentWeek: number;
}

export function ScoreTrendChart({ weeks, currentWeek }: ScoreTrendChartProps) {
  // Check if all weeks are null or empty
  const hasAnyData = weeks.some((w) => w !== null && w.scorePct !== null);

  // Normalize to 12 slots
  const slots = Array.from({ length: 12 }, (_, i) => {
    const weekNum = i + 1;
    const found = weeks.find((w) => w?.week === weekNum) ?? null;
    return {
      week: weekNum,
      data: found,
      isCurrent: weekNum === currentWeek,
    };
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-base font-bold text-slate-900">Execution Score Trend</h2>
          <p className="text-xs text-slate-500">12-week trajectory towards the 85% benchmark</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-emerald-600" />
            <span className="text-slate-600">Closed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-dashed border-slate-400 bg-slate-200" />
            <span className="text-slate-600">Projected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 bg-emerald-500" />
            <span className="font-semibold text-emerald-700">85% benchmark</span>
          </div>
        </div>
      </div>

      {!hasAnyData ? (
        <div className="mt-8 flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
          <p className="text-sm font-medium text-slate-500">No data yet — close a week first.</p>
          <p className="mt-1 text-xs text-slate-400">
            Scores appear as each 7-day cycle is executed and closed.
          </p>
        </div>
      ) : (
        <div className="relative mt-6 pt-6 pb-2">
          {/* 85% Benchmark Line (85% height of 160px chart = 136px from bottom) */}
          <div
            className="absolute left-6 right-0 z-10 flex items-center border-b-2 border-dashed border-emerald-500 pointer-events-none"
            style={{ bottom: "calc(2rem + (10rem * 0.85))" }}
          >
            <span className="absolute -top-3 right-0 rounded bg-emerald-50 px-1 text-[10px] font-bold text-emerald-700">
              85%
            </span>
          </div>

          {/* 65% Revise-Plan Line (65% height of 160px chart = 104px from bottom) */}
          <div
            className="absolute left-6 right-0 z-10 flex items-center border-b border-dashed border-rose-300 pointer-events-none opacity-60"
            style={{ bottom: "calc(2rem + (10rem * 0.65))" }}
          >
            <span className="absolute -top-3 right-0 rounded bg-rose-50 px-1 text-[10px] font-bold text-rose-600">
              65%
            </span>
          </div>

          {/* Bars Container */}
          <div className="flex h-40 items-end gap-2 sm:gap-3 pl-6 pr-2">
            {slots.map(({ week, data, isCurrent }) => {
              const score = data?.scorePct ?? 0;
              const hasScore = data !== null;
              const isClosed = data?.closed ?? false;
              const isProjected = data?.projected ?? false;
              const band = data?.band;
              const styles = getBandBadgeStyles(band);

              // Height in % (max 100%)
              const heightPct = Math.min(100, Math.max(0, score));

              return (
                <div key={week} className="group relative flex flex-1 flex-col items-center h-full justify-end">
                  {/* Tooltip on hover */}
                  {hasScore && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:flex z-20 rounded bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white whitespace-nowrap shadow">
                      W{week}: {score}% {isProjected ? "(Projected)" : "(Closed)"}
                    </div>
                  )}

                  {/* Bar */}
                  {hasScore ? (
                    <div
                      className={`w-full max-w-[28px] rounded-t transition-all ${
                        isClosed
                          ? band === "ON_TRACK"
                            ? "bg-emerald-600"
                            : band === "AT_RISK"
                            ? "bg-amber-500"
                            : "bg-rose-500"
                          : "border-2 border-dashed border-slate-400 bg-slate-200"
                      }`}
                      style={{ height: `${heightPct}%` }}
                    >
                      <div className="w-full text-center text-[10px] font-bold text-white pt-1 hidden sm:block">
                        {score >= 20 ? `${score}%` : ""}
                      </div>
                    </div>
                  ) : (
                    <div className="h-1 w-full max-w-[28px] rounded bg-slate-100" />
                  )}

                  {/* Week label */}
                  <div className="mt-2 text-center">
                    <span
                      className={`text-xs font-semibold ${
                        isCurrent
                          ? "rounded-full bg-slate-900 px-1.5 py-0.5 text-white"
                          : "text-slate-500"
                      }`}
                    >
                      W{week}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
