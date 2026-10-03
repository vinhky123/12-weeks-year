"use client";

import React from "react";
import type { WeekScoreDto } from "@/lib/contracts";
import { useSettings } from "@/context/SettingsContext";

interface ProjectedScoreBarProps {
  score: WeekScoreDto | null;
  isClosed?: boolean;
}

export default function ProjectedScoreBar({ score, isClosed = false }: ProjectedScoreBarProps) {
  const { locale } = useSettings();
  const pct = score ? Math.min(100, Math.max(0, score.scorePct)) : 0;
  const heading = isClosed
    ? locale === "vi" ? "Điểm tuần chính thức" : "Final weekly score"
    : locale === "vi" ? "Tiến độ tuần" : "Weekly progress";

  return (
    <section aria-labelledby="weekly-progress-heading" className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="weekly-progress-heading" className="text-base font-bold text-zinc-900 dark:text-zinc-100">{heading}</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {score
              ? locale === "vi" ? `${score.completed}/${score.due} lượt cần làm trong tuần đã hoàn thành` : `${score.completed} of ${score.due} planned actions completed`
              : locale === "vi" ? "Chưa có lượt cần làm trong tuần." : "No planned actions yet."}
          </p>
        </div>
        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{score ? `${score.scorePct}%` : "—"}</span>
      </div>
      <div
        className="relative mt-3 h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
        role={score ? "progressbar" : undefined}
        aria-label={score ? heading : undefined}
        aria-valuemin={score ? 0 : undefined}
        aria-valuemax={score ? 100 : undefined}
        aria-valuenow={score ? pct : undefined}
      >
        <div className="h-full bg-teal-600 transition-[width] duration-300 dark:bg-teal-400" style={{ width: `${pct}%` }} />
        <div className="absolute inset-y-0 z-10 w-0.5 bg-zinc-950 dark:bg-zinc-50" style={{ left: "85%" }} title={locale === "vi" ? "Mốc 85%" : "85% benchmark"} />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
        <span>0%</span><span className="font-bold">{locale === "vi" ? "mốc 85%" : "85% benchmark"}</span><span>100%</span>
      </div>
    </section>
  );
}
