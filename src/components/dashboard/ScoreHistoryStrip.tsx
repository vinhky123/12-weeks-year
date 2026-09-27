"use client";

import React from "react";
import Link from "next/link";
import type { WeekScoreDto } from "@/lib/contracts";
import { getBandBadgeStyles } from "@/components/common/scoreUtils";
import { useSettings } from "@/context/SettingsContext";
import { t } from "@/lib/i18n";

interface ScoreHistoryStripProps {
  scoreHistory: (WeekScoreDto | null)[];
  currentWeekNumber: number;
}

export default function ScoreHistoryStrip({
  scoreHistory,
  currentWeekNumber,
}: ScoreHistoryStripProps) {
  const { locale } = useSettings();

  const slots: (WeekScoreDto | null)[] = Array.from({ length: 12 }, (_, i) => {
    return scoreHistory[i] ?? null;
  });

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          {t(locale, "score.history_strip")}
        </h3>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {locale === "vi" ? "Chuẩn: 85%" : "Benchmark: 85%"}
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
        {slots.map((score, index) => {
          const weekNum = index + 1;
          const isCurrent = weekNum === currentWeekNumber;
          const bandStyles = getBandBadgeStyles(score?.band);

          return (
            <Link
              key={weekNum}
              href={`/week?week=${weekNum}`}
              className={`flex flex-col items-center justify-between rounded-lg p-2.5 border transition hover:border-zinc-400 dark:hover:border-zinc-600 ${
                score
                  ? `${bandStyles.bg} ${bandStyles.border}`
                  : isCurrent
                  ? "bg-zinc-50 border-zinc-300 dark:bg-zinc-800/60 dark:border-zinc-700"
                  : "bg-zinc-50/50 border-zinc-100 dark:bg-zinc-900/40 dark:border-zinc-800 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between w-full text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                <span>W{weekNum}</span>
                {score?.closed && (
                  <svg
                    className="h-3 w-3 text-zinc-600 dark:text-zinc-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                )}
              </div>

              <div className="my-1.5 text-center">
                <span
                  className={`text-sm font-bold ${
                    score ? bandStyles.text : "text-zinc-400 dark:text-zinc-500"
                  }`}
                >
                  {score ? `${score.scorePct}%` : "—"}
                </span>
              </div>

              <div className="text-[9px] font-medium text-zinc-500 dark:text-zinc-400">
                {score?.projected ? (
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {locale === "vi" ? "dự kiến" : "proj"}
                  </span>
                ) : score?.closed ? (
                  <span>{locale === "vi" ? "đã chốt" : "closed"}</span>
                ) : isCurrent ? (
                  <span className="text-zinc-900 dark:text-zinc-100 font-semibold">
                    {locale === "vi" ? "tuần này" : "active"}
                  </span>
                ) : (
                  <span>{locale === "vi" ? "sắp tới" : "due"}</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
