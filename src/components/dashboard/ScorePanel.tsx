"use client";

import React from "react";
import type { WeekScoreDto } from "@/lib/contracts";
import { useSettings } from "@/context/SettingsContext";
import {
  getBandBadgeStyles,
  getBandVerdict,
  getBenchmarkLine,
} from "@/components/common/scoreUtils";

interface ScorePanelProps {
  currentWeekNumber: number;
  currentScore: WeekScoreDto | null;
  averageScore: number | null;
}

export default function ScorePanel({
  currentWeekNumber,
  currentScore,
  averageScore,
}: ScorePanelProps) {
  const { locale } = useSettings();
  const bandStyles = getBandBadgeStyles(currentScore?.band);
  const verdict = getBandVerdict(currentScore?.band, locale);
  const benchmarkLine = getBenchmarkLine(locale);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {locale === "vi"
                ? `Điểm thực thi Tuần ${currentWeekNumber}`
                : `Week ${currentWeekNumber} Execution Score`}
            </span>
            {currentScore?.projected && (
              <span className="rounded bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {locale === "vi" ? "dự kiến" : "projected"}
              </span>
            )}
            {currentScore?.closed && (
              <span className="rounded bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
                {locale === "vi" ? "chính thức" : "final"}
              </span>
            )}
          </div>

          <div className="mt-2 flex items-baseline gap-4">
            <span
              className={`text-5xl font-extrabold tracking-tight ${
                currentScore ? bandStyles.text : "text-zinc-400 dark:text-zinc-500"
              }`}
            >
              {currentScore !== null ? `${currentScore.scorePct}%` : "—"}
            </span>

            {currentScore && (
              <div className="flex flex-col">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${bandStyles.bg} ${bandStyles.text} ${bandStyles.border}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${bandStyles.dot}`} />
                  {verdict}
                </span>
                <span className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {locale === "vi"
                    ? `Đã hoàn thành ${currentScore.completed}/${currentScore.due} hành động`
                    : `${currentScore.completed} of ${currentScore.due} tactics completed`}
                </span>
              </div>
            )}
          </div>

          <p className="mt-4 text-xs font-medium text-zinc-600 dark:text-zinc-300">
            {benchmarkLine}
          </p>
        </div>

        <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-zinc-100 pt-4 sm:pt-0 sm:pl-6 dark:border-zinc-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {locale === "vi" ? "Trung bình chu kỳ" : "Cycle Average"}
          </span>
          <div className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {averageScore !== null ? `${averageScore}%` : "—"}
          </div>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {locale === "vi" ? "trong các tuần đã qua" : "over elapsed weeks"}
          </span>
        </div>
      </div>
    </div>
  );
}
