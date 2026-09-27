"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { DashboardDto, CycleDto } from "@/lib/contracts";
import { apiFetch, ClientApiError } from "@/components/common/api";
import NextRitualCard from "@/components/dashboard/NextRitualCard";
import ScorePanel from "@/components/dashboard/ScorePanel";
import ScoreHistoryStrip from "@/components/dashboard/ScoreHistoryStrip";
import GoalCard from "@/components/dashboard/GoalCard";
import { ValleyBanner } from "@/components/dashboard/ValleyBanner";
import { useSettings } from "@/context/SettingsContext";
import { t } from "@/lib/i18n";

export default function DashboardPage() {
  const { locale } = useSettings();
  const [data, setData] = useState<DashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<DashboardDto>("/api/dashboard");
      setData(res);
    } catch (err) {
      if (err instanceof ClientApiError) {
        setError(err.message);
      } else {
        setError(locale === "vi" ? "Không thể tải bảng điều khiển." : "Failed to load dashboard. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleStartCycle = async () => {
    if (!data?.cycle) return;
    try {
      setIsStarting(true);
      await apiFetch<CycleDto>(`/api/cycles/${data.cycle.id}/start`, {
        method: "POST",
      });
      await fetchDashboard();
    } catch (err) {
      if (err instanceof ClientApiError) {
        setError(err.message);
      } else {
        setError(locale === "vi" ? "Không thể bắt đầu chu kỳ." : "Failed to start cycle.");
      }
    } finally {
      setIsStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-16 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-32 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-44 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-28 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
        <h3 className="font-bold">{locale === "vi" ? "Lỗi tải bảng điều khiển" : "Error loading dashboard"}</h3>
        <p className="mt-1 text-sm">{error}</p>
        <button
          onClick={fetchDashboard}
          className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 transition dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {t(locale, "action.retry")}
        </button>
      </div>
    );
  }

  if (!data || data.phase === "no_cycle" || !data.cycle) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
          {locale === "vi" ? "Một năm là 12 tuần." : "A year is 12 weeks."}
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-zinc-600 dark:text-zinc-400">
          {locale === "vi"
            ? "Khoảng cách lớn nhất không phải là kiến thức, mà là thực thi. Phá vỡ tư duy theo năm truyền thống bằng cách tạo chu kỳ 12 tuần đầu tiên với 1–3 mục tiêu quan trọng."
            : "Execution, not knowledge, is the gap. Break annualized thinking by creating your first 12-week cycle with 2–3 vital goals and daily/weekly tactics."}
        </p>
        <div className="mt-8">
          <Link
            href="/plan"
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-xs hover:bg-zinc-800 transition dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {locale === "vi" ? "Tạo chu kỳ đầu tiên của bạn" : "Create your first cycle"}
          </Link>
        </div>
        <p className="mt-5 text-sm text-zinc-500 dark:text-zinc-400">
          <Link
            href="/guide"
            className="font-medium text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-800 dark:text-emerald-400 dark:decoration-emerald-700"
          >
            {locale === "vi" ? "Mới đây? Đọc hướng dẫn →" : "New here? Read the guide first →"}
          </Link>
        </p>
      </div>
    );
  }

  const { today, cycle, currentWeek, scoreHistory, averageScore, goals, nextRitual, dailyPrinciple, phase } = data;

  const cycleStatusLabel =
    locale === "vi"
      ? cycle.status === "active"
        ? "Đang hoạt động"
        : cycle.status === "planning"
        ? "Đang lập kế hoạch"
        : cycle.status === "review"
        ? "Đang đánh giá"
        : "Đã lưu trữ"
      : cycle.status;

  return (
    <div className="space-y-6">
      {/* Review mode banner */}
      {phase === "review" && (
        <div className="rounded-lg border border-zinc-300 bg-zinc-100 p-4 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
          <div className="flex items-center gap-2 font-bold">
            <span>🎉</span>
            <span>
              {locale === "vi"
                ? "Tuần 13 — Chu kỳ đã hoàn tất. Hãy ăn mừng, nhìn lại và khởi động lại."
                : "Week 13 — the year is complete. Celebrate, review, reload."}
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
            {locale === "vi" ? "Dành thời gian ghi nhận những gì đã làm được. " : "Take time to celebrate what was accomplished. "}
            <Link href="/review" className="font-semibold underline">
              {locale === "vi" ? "Mở Trình hướng dẫn Đánh giá Tuần 13 →" : "Open the Week 13 Review Wizard →"}
            </Link>
          </p>
        </div>
      )}

      {/* Header Row */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{cycle.name}</h1>
            <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600 uppercase tracking-wide dark:bg-zinc-800 dark:text-zinc-300">
              {cycleStatusLabel}
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
              {today.weekLabel ?? (locale === "vi" ? `Tuần ${today.weekNumber}` : `Week ${today.weekNumber}`)}
            </span>
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              &middot; {t(locale, "misc.days_left", { n: today.daysRemaining })}
            </span>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-xs text-zinc-400 block font-medium uppercase dark:text-zinc-500">
            {locale === "vi" ? "Hôm nay" : "Today"}
          </span>
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {today.isoDate}
          </span>
        </div>
      </header>

      {/* Daily Principle Quote */}
      {dailyPrinciple && (
        <div className="rounded-lg bg-zinc-100 px-4 py-2.5 border border-zinc-200 text-xs italic text-zinc-700 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300">
          &ldquo;{dailyPrinciple}&rdquo;
        </div>
      )}

      {/* Valley of Despair Banner (weeks 3–6 with avg < 70) */}
      <ValleyBanner valleyGuidance={data.valleyGuidance} />

      {/* Next Ritual Callout */}
      <NextRitualCard
        nextRitual={nextRitual}
        cycle={cycle}
        currentWeekNumber={today.weekNumber}
        onStartCycle={handleStartCycle}
        isStarting={isStarting}
      />

      {/* Score Panel */}
      <ScorePanel
        currentWeekNumber={today.weekNumber}
        currentScore={currentWeek?.score ?? null}
        averageScore={averageScore}
      />

      {/* 12-Week History Strip */}
      <ScoreHistoryStrip
        scoreHistory={scoreHistory}
        currentWeekNumber={today.weekNumber}
      />

      {/* Goals Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {t(locale, "dashboard.goals_heading", { count: goals.length })}
          </h2>
          <Link
            href="/plan"
            className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            {locale === "vi" ? "Xem & sửa Kế hoạch 12 tuần →" : "Edit 12-Week Plan →"}
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {goals.map((goal) => (
            <GoalCard key={goal.id} {...goal} />
          ))}
        </div>
      </section>
    </div>
  );
}
