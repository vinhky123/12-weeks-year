"use client";

import React from "react";
import type { WeekScoreDto } from "@/lib/contracts";
import { getBandBadgeStyles } from "@/components/common/scoreUtils";
import { useSettings } from "@/context/SettingsContext";

interface ProjectedScoreBarProps {
  score: WeekScoreDto | null;
}

export default function ProjectedScoreBar({ score }: ProjectedScoreBarProps) {
  const { locale } = useSettings();
  const pct = score ? Math.min(100, Math.max(0, score.scorePct)) : 0;
  const bandStyles = getBandBadgeStyles(score?.band);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
          {locale === "vi"
            ? `Điểm dự kiến tuần này — ${score !== null ? `${score.scorePct}%` : "—"} · chuẩn 85%.`
            : `Projected week score — ${score !== null ? `${score.scorePct}%` : "—"} · benchmark 85%.`}
        </span>
        {score && (
          <span className="text-zinc-500 font-medium dark:text-zinc-400">
            {locale === "vi"
              ? `Đã đạt ${score.completed}/${score.due}`
              : `${score.completed} of ${score.due} due`}
          </span>
        )}
      </div>

      <div className="relative h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        {/* Progress bar */}
        <div
          className={`h-full transition-all duration-300 ${
            score?.band === "ON_TRACK"
              ? "bg-zinc-900 dark:bg-zinc-100"
              : score?.band === "AT_RISK"
              ? "bg-zinc-500 dark:bg-zinc-400"
              : score?.band === "REVISE_PLAN"
              ? "bg-zinc-400 dark:bg-zinc-500"
              : "bg-zinc-300 dark:bg-zinc-700"
          }`}
          style={{ width: `${pct}%` }}
        />

        {/* 85% benchmark reference line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-zinc-950 dark:bg-zinc-50 z-10"
          style={{ left: "85%" }}
          title={locale === "vi" ? "Mục tiêu 85%" : "85% Benchmark"}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500">
        <span>0%</span>
        <span className="font-bold text-zinc-700 dark:text-zinc-300">
          {locale === "vi" ? "chuẩn 85%" : "85% benchmark"}
        </span>
        <span>100%</span>
      </div>
    </div>
  );
}
