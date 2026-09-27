"use client";

import type { InsightsDto } from "@/lib/contracts";
import { useSettings } from "@/context/SettingsContext";

interface InsightsPanelProps {
  insights: InsightsDto;
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  const { locale } = useSettings();
  const { cycles, bestCycle, totalGoalsAchieved, qualityOfLifeMovement } = insights;

  return (
    <div className="space-y-6">
      {/* Top 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Best Cycle */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-xs dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            {locale === "vi" ? "Chu kỳ tốt nhất" : "Best Cycle"}
          </span>
          <div className="mt-2 text-xl font-black text-emerald-950 dark:text-emerald-100 truncate">
            {bestCycle ? bestCycle.name : "—"}
          </div>
          <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
            {bestCycle?.averageScore !== null && bestCycle?.averageScore !== undefined
              ? (locale === "vi" ? `${bestCycle.averageScore}% trung bình thực thi` : `${bestCycle.averageScore}% execution average`)
              : (locale === "vi" ? "Chưa có chu kỳ tính điểm" : "No scored cycles yet")}
          </p>
        </div>

        {/* Total Goals Achieved */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {locale === "vi" ? "Mục tiêu đã đạt" : "Goals Achieved"}
          </span>
          <div className="mt-2 text-2xl font-black text-zinc-900 dark:text-zinc-100">
            {totalGoalsAchieved}
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {locale === "vi" ? "Trên tất cả các chu kỳ 12 tuần" : "Across all 12-week cycles"}
          </p>
        </div>

        {/* QoL Movement */}
        <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-5 shadow-xs dark:border-violet-900/50 dark:bg-violet-950/30">
          <span className="text-[10px] font-bold uppercase tracking-wider text-violet-800 dark:text-violet-300">
            {locale === "vi" ? "Chuyển động chất lượng sống" : "Quality of Life Movement"}
          </span>
          {qualityOfLifeMovement ? (
            <div>
              <div className="mt-2 flex items-baseline gap-2 text-2xl font-black text-violet-950 dark:text-violet-100">
                <span>{qualityOfLifeMovement.first}</span>
                <span className="text-base text-violet-600 dark:text-violet-400 font-bold">→</span>
                <span>{qualityOfLifeMovement.latest}</span>
              </div>
              <p className="mt-1 text-xs text-violet-700 dark:text-violet-400">
                {locale === "vi" ? "Trung bình đánh giá đầu tiên so với gần nhất" : "First vs latest review average"}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-xs italic text-violet-900 dark:text-violet-300 leading-snug">
              {locale === "vi"
                ? "Hoàn thành hai đánh giá chu kỳ để thấy chuyển động chất lượng sống."
                : "Complete two cycle reviews to see quality-of-life movement."}
            </p>
          )}
        </div>
      </div>

      {/* Cross-Cycle Score Trajectory Chart */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs space-y-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
            {locale === "vi" ? "Xu hướng thực thi qua các chu kỳ" : "Cross-Cycle Execution Trend"}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {locale === "vi" ? "Điểm thực thi trung bình qua các năm 12 tuần của bạn." : "Average execution score across your 12-week years."}
          </p>
        </div>

        {cycles.length === 0 ? (
          <p className="text-xs italic text-zinc-400 dark:text-zinc-500">
            {locale === "vi" ? "Chưa có chu kỳ nào được ghi nhận." : "No cycles recorded yet."}
          </p>
        ) : (
          <div className="space-y-3 pt-2">
            {cycles.map((c) => {
              const score = c.averageScore ?? 0;
              const hasScore = c.averageScore !== null;

              return (
                <div key={c.cycleId} className="space-y-1">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{c.name}</span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">
                      {hasScore ? `${c.averageScore}%` : (locale === "vi" ? "Chưa có điểm" : "No score")}
                    </span>
                  </div>

                  <div className="h-4 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        score >= 85
                          ? "bg-emerald-600 dark:bg-emerald-500"
                          : score >= 65
                          ? "bg-amber-500 dark:bg-amber-400"
                          : "bg-zinc-400 dark:bg-zinc-600"
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
