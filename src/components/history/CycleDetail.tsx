"use client";

import type { CycleDto, GoalWithTacticsDto, CycleScoresDto } from "@/lib/contracts";
import ScoreHistoryStrip from "@/components/dashboard/ScoreHistoryStrip";
import { useSettings } from "@/context/SettingsContext";
import { ReviewSection } from "./ReviewSection";

interface CycleDetailProps {
  detail: {
    cycle: CycleDto;
    goals: GoalWithTacticsDto[];
    scores: CycleScoresDto;
    review: any;
    weeks: {
      weekNumber: number;
      status: string;
      reflection: string | null;
    }[];
  };
  onBack: () => void;
}

export function CycleDetail({ detail, onBack }: CycleDetailProps) {
  const { t, locale } = useSettings();
  const { cycle, goals, scores, review, weeks } = detail;

  const reflectionsWithText = weeks.filter((w) => w.reflection && w.reflection.trim().length > 0);

  const statusLabels: Record<string, string> = {
    active: t("misc.active"),
    planning: t("misc.planning"),
    review: t("misc.review"),
    archived: t("misc.archived"),
  };

  return (
    <div className="space-y-6">
      {/* Header & Back Affordance */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition mb-2"
        >
          {locale === "vi" ? "← Quay lại danh sách chu kỳ" : "← Back to all cycles"}
        </button>

        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{cycle.name}</h2>
              <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {statusLabels[cycle.status] ?? cycle.status}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {locale === "vi" ? "Bắt đầu" : "Started"} {cycle.startDate}
              {cycle.archivedAt && <> · {locale === "vi" ? "Lưu trữ" : "Archived"} {cycle.archivedAt.slice(0, 10)}</>}
            </p>
          </div>

          {scores.averageScore !== null && (
            <div className="text-right">
              <span className="text-xs text-zinc-400 dark:text-zinc-500 uppercase font-semibold">
                {locale === "vi" ? "Trung bình chu kỳ" : "Cycle Average"}
              </span>
              <div className="text-xl font-black text-zinc-900 dark:text-zinc-100">{scores.averageScore}%</div>
            </div>
          )}
        </div>
      </div>

      {/* 12-Week Score Strip */}
      <div>
        <ScoreHistoryStrip scoreHistory={scores.weeks} currentWeekNumber={scores.currentWeek} />
      </div>

      {/* Goals List */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs space-y-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
          {locale === "vi" ? `Mục tiêu 12 tuần (${goals.length})` : `12-Week Goals (${goals.length})`}
        </h3>

        <div className="space-y-3">
          {goals.map((g) => (
            <div
              key={g.id}
              className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-3 text-xs space-y-1 dark:border-zinc-800 dark:bg-zinc-800/40"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{g.title}</span>
                <span
                  className={`rounded px-1.5 py-0.2 text-[10px] font-semibold uppercase ${
                    g.status === "achieved"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {g.status === "achieved" ? (locale === "vi" ? "Đạt được" : "achieved") : g.status}
                </span>
              </div>
              <p className="text-zinc-500 dark:text-zinc-400">
                {locale === "vi" ? "Mục tiêu:" : "Target:"} {g.lagMetricName} ({g.lagStart} → {g.lagTarget} {g.lagUnit}) · {g.tactics.length} {locale === "vi" ? "chiến thuật" : "tactics"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Retrospective Section */}
      <ReviewSection review={review} />

      {/* Weekly Reflections Timeline */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs space-y-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
          {locale === "vi" ? "Chiêm nghiệm hàng tuần" : "Weekly Reflections"}
        </h3>

        {reflectionsWithText.length === 0 ? (
          <p className="text-xs italic text-zinc-400 dark:text-zinc-500">
            {locale === "vi" ? "Chưa có chiêm nghiệm hàng tuần nào trong chu kỳ này." : "No weekly reflections saved in this cycle."}
          </p>
        ) : (
          <div className="space-y-3">
            {reflectionsWithText.map((w) => (
              <div key={w.weekNumber} className="border-l-2 border-zinc-200 dark:border-zinc-700 pl-3 py-1">
                <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                  {locale === "vi" ? `Tuần ${w.weekNumber}` : `Week ${w.weekNumber}`}
                </span>
                <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-300 italic">“{w.reflection}”</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
