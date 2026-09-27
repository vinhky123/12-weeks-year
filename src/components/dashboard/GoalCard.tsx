"use client";

import React from "react";
import type { GoalScoreDto, GoalStatus } from "@/lib/contracts";
import { getBandBadgeStyles } from "@/components/common/scoreUtils";
import { useSettings } from "@/context/SettingsContext";

interface GoalCardProps {
  id: number;
  title: string;
  why: string;
  lagMetricName: string;
  lagUnit: string;
  lagStart: number;
  lagTarget: number;
  status: GoalStatus;
  tacticCount: number;
  currentWeekScore: GoalScoreDto | null;
}

export default function GoalCard({
  title,
  why,
  lagMetricName,
  lagUnit,
  lagStart,
  lagTarget,
  status,
  tacticCount,
  currentWeekScore,
}: GoalCardProps) {
  const { locale } = useSettings();
  const bandStyles = getBandBadgeStyles(currentWeekScore?.band);

  const statusLabel =
    locale === "vi"
      ? status === "active"
        ? "Đang thực hiện"
        : status === "achieved"
        ? "Đã hoàn thành"
        : "Chưa đạt"
      : status;

  return (
    <div className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-xs transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
      <div>
        <div className="flex items-start justify-between gap-3">
          <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-snug">{title}</h4>
          {status !== "active" && (
            <span className="shrink-0 rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-wide dark:bg-zinc-800 dark:text-zinc-300">
              {statusLabel}
            </span>
          )}
        </div>

        <p className="mt-1.5 text-xs text-zinc-500 italic line-clamp-2 dark:text-zinc-400">
          &ldquo;{why}&rdquo;
        </p>
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
        <div>
          <span className="text-[11px] text-zinc-400 block uppercase font-medium dark:text-zinc-500">
            {locale === "vi" ? "Chỉ số kết quả (Lag):" : "Lag:"} {lagMetricName}
          </span>
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
            {lagStart} &rarr; {lagTarget} {lagUnit}
          </span>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-zinc-400 block uppercase font-medium dark:text-zinc-500">
            {locale === "vi" ? `Điểm tuần (${tacticCount} hành động)` : `Week Score (${tacticCount} tactics)`}
          </span>
          {currentWeekScore ? (
            <span className={`inline-flex items-center gap-1 font-bold ${bandStyles.text}`}>
              {currentWeekScore.scorePct}%
              <span className="text-[10px] font-normal text-zinc-400 dark:text-zinc-500">
                ({currentWeekScore.completed}/{currentWeekScore.due})
              </span>
            </span>
          ) : (
            <span className="font-semibold text-zinc-400 dark:text-zinc-500">—</span>
          )}
        </div>
      </div>
    </div>
  );
}
