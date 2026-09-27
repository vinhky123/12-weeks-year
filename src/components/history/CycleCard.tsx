"use client";

import type { HistoryEntryDto, ScoreBand } from "@/lib/contracts";
import { getBandBadgeStyles } from "@/components/common/scoreUtils";
import { useSettings } from "@/context/SettingsContext";

interface CycleCardProps {
  cycle: HistoryEntryDto;
  onClick: () => void;
}

export function CycleCard({ cycle, onClick }: CycleCardProps) {
  const { t, locale } = useSettings();

  const getBand = (score: number | null): ScoreBand | null => {
    if (score === null) return null;
    if (score >= 85) return "ON_TRACK";
    if (score >= 65) return "AT_RISK";
    return "REVISE_PLAN";
  };

  const bandStyles = getBandBadgeStyles(getBand(cycle.averageScore));

  const statusColors: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
    planning: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
    review: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300",
    archived: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  };

  const statusLabels: Record<string, string> = {
    active: t("misc.active"),
    planning: t("misc.planning"),
    review: t("misc.review"),
    archived: t("misc.archived"),
  };

  return (
    <div
      onClick={onClick}
      className="group flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-xs transition hover:border-zinc-300 hover:shadow-md cursor-pointer dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
    >
      <div>
        {/* Top: Name & Status */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-base text-zinc-900 group-hover:text-zinc-800 dark:text-zinc-100 dark:group-hover:text-zinc-200">
            {cycle.name}
          </h3>
          <span
            className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              statusColors[cycle.status] ?? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            {statusLabels[cycle.status] ?? cycle.status}
          </span>
        </div>

        {/* Dates */}
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
          {locale === "vi" ? "Bắt đầu:" : "Started:"} {cycle.startDate}
          {cycle.archivedAt && (
            <span className="ml-2">· {locale === "vi" ? "Lưu trữ:" : "Archived:"} {cycle.archivedAt.slice(0, 10)}</span>
          )}
        </p>

        {/* Stats Row */}
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              {locale === "vi" ? "Thực thi" : "Execution"}
            </span>
            <div className="mt-0.5 flex items-center gap-1.5">
              {cycle.averageScore !== null ? (
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs font-bold ${bandStyles.bg} ${bandStyles.text} ${bandStyles.border}`}
                >
                  {cycle.averageScore}% {locale === "vi" ? "tb" : "avg"}
                </span>
              ) : (
                <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">—</span>
              )}
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                ({cycle.scoredWeeks}/12 {locale === "vi" ? "tuần" : "wks"})
              </span>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              {locale === "vi" ? "Mục tiêu" : "Goals"}
            </span>
            <div className="mt-0.5">
              <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                {locale === "vi"
                  ? `${cycle.goalsCompleted}/${cycle.goalsTotal} hoàn thành`
                  : `${cycle.goalsCompleted} of ${cycle.goalsTotal} achieved`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Review Indicator */}
      <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs dark:border-zinc-800">
        {cycle.hasReview ? (
          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {locale === "vi" ? "Đã có đánh giá" : "Review saved"}
          </span>
        ) : (
          <span className="text-zinc-400 italic text-[11px] dark:text-zinc-500">
            {locale === "vi" ? "Chưa có đánh giá" : "No review"}
          </span>
        )}

        <span className="font-medium text-zinc-600 group-hover:text-zinc-900 group-hover:underline dark:text-zinc-400 dark:group-hover:text-zinc-200">
          {locale === "vi" ? "Xem chi tiết →" : "View details →"}
        </span>
      </div>
    </div>
  );
}
