"use client";

import type { InsightsDto } from "@/lib/contracts";

interface InsightsPanelProps {
  insights: InsightsDto;
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  const { cycles, bestCycle, totalGoalsAchieved, qualityOfLifeMovement } = insights;

  return (
    <div className="space-y-6">
      {/* Top 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Best Cycle */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
            Best Cycle
          </span>
          <div className="mt-2 text-xl font-black text-emerald-950 truncate">
            {bestCycle ? bestCycle.name : "—"}
          </div>
          <p className="mt-1 text-xs text-emerald-700">
            {bestCycle?.averageScore !== null && bestCycle?.averageScore !== undefined
              ? `${bestCycle.averageScore}% execution average`
              : "No scored cycles yet"}
          </p>
        </div>

        {/* Total Goals Achieved */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Goals Achieved
          </span>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {totalGoalsAchieved}
          </div>
          <p className="mt-1 text-xs text-slate-500">Across all 12-week cycles</p>
        </div>

        {/* QoL Movement */}
        <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-violet-800">
            Quality of Life Movement
          </span>
          {qualityOfLifeMovement ? (
            <div>
              <div className="mt-2 flex items-baseline gap-2 text-2xl font-black text-violet-950">
                <span>{qualityOfLifeMovement.first}</span>
                <span className="text-base text-violet-600 font-bold">→</span>
                <span>{qualityOfLifeMovement.latest}</span>
              </div>
              <p className="mt-1 text-xs text-violet-700">First vs latest review average</p>
            </div>
          ) : (
            <p className="mt-2 text-xs italic text-violet-900 leading-snug">
              Complete two cycle reviews to see quality-of-life movement.
            </p>
          )}
        </div>
      </div>

      {/* Cross-Cycle Score Trajectory Chart */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div>
          <h3 className="font-bold text-sm text-slate-900">Cross-Cycle Execution Trend</h3>
          <p className="text-xs text-slate-500">Average execution score across your 12-week years.</p>
        </div>

        {cycles.length === 0 ? (
          <p className="text-xs italic text-slate-400">No cycles recorded yet.</p>
        ) : (
          <div className="space-y-3 pt-2">
            {cycles.map((c) => {
              const score = c.averageScore ?? 0;
              const hasScore = c.averageScore !== null;

              return (
                <div key={c.cycleId} className="space-y-1">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="font-semibold text-slate-800">{c.name}</span>
                    <span className="font-bold text-slate-900">
                      {hasScore ? `${c.averageScore}%` : "No score"}
                    </span>
                  </div>

                  <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        score >= 85
                          ? "bg-emerald-600"
                          : score >= 65
                          ? "bg-amber-500"
                          : "bg-slate-400"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, score))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
